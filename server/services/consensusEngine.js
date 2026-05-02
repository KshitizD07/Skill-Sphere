import { PrismaClient } from '@prisma/client';
import strategyRegistry from './strategyRegistry.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Determines if multiple active strategies agree on the same candidate.
 *
 * Consensus = stability; disagreement = exploration opportunity.
 * The engine never forces consensus by averaging — if strategies disagree,
 * the orchestrator falls back to weighted random selection.
 *
 * Consensus rule: ≥2 active strategies must select the same candidate.
 */
class ConsensusEngine {

  /**
   * Analyses strategy votes and returns a consensus result.
   * Shadow strategy votes are counted but never contribute to consensus.
   */
  async checkConsensus(strategyVotes, activeStrategies) {
    const config       = await strategyRegistry.getSystemConfig();
    const minConsensus = config.minConsensusStrategies;

    // Filter to active-only votes
    const activeVotes = Object.fromEntries(
      Object.entries(strategyVotes).filter(([, vote]) => !vote.isShadow)
    );

    // Count votes per candidate
    const voteCounts       = {};
    const votesByCandidate = {};

    for (const [strategyId, vote] of Object.entries(activeVotes)) {
      const { candidateId } = vote;
      if (!voteCounts[candidateId]) { voteCounts[candidateId] = 0; votesByCandidate[candidateId] = []; }
      voteCounts[candidateId]++;
      votesByCandidate[candidateId].push({ strategyId, strategyName: vote.strategyName, score: vote.normalizedScore });
    }

    // Find the candidate with the most votes
    let topCandidate = null;
    let topCount     = 0;
    for (const [candidateId, count] of Object.entries(voteCounts)) {
      if (count > topCount) { topCount = count; topCandidate = candidateId; }
    }

    const hasConsensus = topCount >= minConsensus;

    if (hasConsensus) {
      logger.debug('Consensus achieved', { winner: topCandidate, agreementCount: topCount, total: Object.keys(activeVotes).length });
    } else {
      logger.debug('No consensus', { maxAgreement: topCount, required: minConsensus, distribution: voteCounts });
    }

    return {
      hasConsensus,
      selectedUserId:      hasConsensus ? topCandidate : null,
      agreementCount:      topCount,
      agreementStrategies: hasConsensus ? votesByCandidate[topCandidate].map((s) => s.strategyId) : [],
      voteCounts,
      strategiesInvolved:  Object.keys(activeVotes).length,
    };
  }

  /**
   * Returns candidates with more than one vote but below the consensus
   * threshold — useful for "weak recommendation" signals in the UI.
   */
  async checkPartialConsensus(strategyVotes) {
    const config       = await strategyRegistry.getSystemConfig();
    const minConsensus = config.minConsensusStrategies;

    const voteCounts = {};
    for (const vote of Object.values(strategyVotes)) {
      if (!vote.isShadow) voteCounts[vote.candidateId] = (voteCounts[vote.candidateId] || 0) + 1;
    }

    return Object.entries(voteCounts)
      .filter(([, count]) => count > 1 && count < minConsensus)
      .map(([candidateId, votes]) => ({ candidateId, votes, status: 'partial_agreement' }));
  }

  /** Analyses why strategies disagreed — useful for admin dashboards. */
  async analyzeDisagreement(strategyVotes) {
    const activeVotes    = Object.values(strategyVotes).filter((v) => !v.isShadow);
    const uniqueCandidates = new Set(activeVotes.map((v) => v.candidateId));
    const allScores      = activeVotes.map((v) => v.normalizedScore);
    const avgScore       = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const variance       = allScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / allScores.length;

    return {
      uniqueCandidates:   uniqueCandidates.size,
      totalStrategies:    activeVotes.length,
      diversityScore:     uniqueCandidates.size / activeVotes.length,
      scoreVariance:      variance,
      interpretation:     this._interpretDisagreement(uniqueCandidates.size, variance),
    };
  }

  _interpretDisagreement(uniqueCandidates, variance) {
    if (uniqueCandidates === 1 && variance < 0.1) return 'Near consensus — strategies picked same candidate with similar scores';
    if (uniqueCandidates === 2 && variance < 0.2) return 'Close call — two strong candidates, strategies split';
    if (uniqueCandidates > 3)                     return 'High diversity — strategies see different strengths in candidates';
    if (variance > 0.3)                           return 'High uncertainty — strategies have very different assessments';
    return 'Moderate disagreement — no clear winner';
  }

  /** Returns daily consensus/random rate history over the last N days. */
  async getConsensusHistory(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const decisions = await prisma.matchDecision.findMany({
      where:   { timestamp: { gte: since } },
      select:  { wasConsensus: true, wasRandom: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const dailyStats = {};
    for (const d of decisions) {
      const date = d.timestamp.toISOString().split('T')[0];
      if (!dailyStats[date]) dailyStats[date] = { total: 0, consensus: 0, random: 0 };
      dailyStats[date].total++;
      if (d.wasConsensus) dailyStats[date].consensus++;
      if (d.wasRandom)    dailyStats[date].random++;
    }

    const history = Object.entries(dailyStats).map(([date, s]) => ({
      date,
      total:         s.total,
      consensusCount: s.consensus,
      randomCount:   s.random,
      consensusRate: s.consensus / s.total,
      randomRate:    s.random   / s.total,
    }));

    const total     = decisions.length;
    const consensus = decisions.filter((d) => d.wasConsensus).length;
    const random    = decisions.filter((d) => d.wasRandom).length;

    return {
      history,
      overall: {
        totalDecisions: total,
        consensusCount: consensus,
        randomCount:    random,
        consensusRate:  total > 0 ? consensus / total : 0,
        randomRate:     total > 0 ? random    / total : 0,
      },
    };
  }

  /** Verifies that randomness and consensus rates are within healthy bounds. */
  async healthCheck() {
    const [history, config] = await Promise.all([
      this.getConsensusHistory(7),
      strategyRegistry.getSystemConfig(),
    ]);

    const warnings = [];
    const info     = [];
    const rRate    = history.overall.randomRate;
    const cRate    = history.overall.consensusRate;

    if (rRate < config.minRandomnessRate)       warnings.push(`Randomness rate too low: ${(rRate * 100).toFixed(1)}%`);
    else if (rRate > config.maxRandomnessRate)  warnings.push(`Randomness rate too high: ${(rRate * 100).toFixed(1)}%`);
    else                                        info.push(`Randomness rate healthy: ${(rRate * 100).toFixed(1)}%`);

    if (cRate > 0.8) warnings.push(`Consensus rate very high (${(cRate * 100).toFixed(1)}%) — strategies may be converging`);
    else             info.push(`Consensus rate balanced: ${(cRate * 100).toFixed(1)}%`);

    if (history.overall.totalDecisions === 0) warnings.push('No decisions in last 7 days');
    else info.push(`Active system: ${history.overall.totalDecisions} decisions in 7 days`);

    return { healthy: warnings.length === 0, warnings, info, stats: history.overall };
  }
}

export default new ConsensusEngine();