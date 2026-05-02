import { PrismaClient } from '@prisma/client';
import strategyRegistry from './strategyRegistry.js';
import consensusEngine from './consensusEngine.js';
import decisionLogger from './decisionLogger.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Match Orchestrator — the brain of the antifragile matching system.
 *
 * Execution flow:
 *  1. Validate inputs
 *  2. Load squad/slot context and candidate profiles
 *  3. Fetch active + shadow strategies
 *  4. Execute ALL strategies in parallel (Promise.allSettled)
 *  5. Normalize scores and attempt consensus
 *  6. Make final selection (consensus or weighted-random fallback)
 *  7. Log the complete decision
 *
 * Philosophy:
 *  - No single strategy dominates
 *  - Diversity is preserved through parallelism
 *  - Controlled randomness is a feature — it drives exploration
 *  - Every decision is fully auditable
 */
class MatchOrchestrator {

  async matchCandidatesForSlot(squadId, slotId, candidates) {
    if (!squadId || !slotId || !candidates?.length) {
      throw new Error('Invalid match request: missing required fields');
    }

    const startTime = Date.now();
    logger.info('Match started', { squadId, slotId, candidates: candidates.length });

    try {
      // ── Load context ──────────────────────────────────────────────────────
      const squad = await prisma.squadRequest.findUnique({
        where:   { id: squadId },
        include: {
          slots:  { where: { id: slotId } },
          leader: { select: { id: true, name: true, college: true } },
        },
      });

      if (!squad)         throw new Error(`Squad ${squadId} not found`);
      const slot = squad.slots[0];
      if (!slot)          throw new Error(`Slot ${slotId} not found`);

      // ── Load candidate profiles ───────────────────────────────────────────
      const candidateProfiles = await prisma.user.findMany({
        where:   { id: { in: candidates } },
        include: { skills: { select: { name: true, level: true, isVerified: true, calculatedScore: true } } },
      });

      // ── Fetch strategies ──────────────────────────────────────────────────
      const [activeStrategies, shadowStrategies] = await Promise.all([
        strategyRegistry.getActiveStrategies(),
        strategyRegistry.getShadowStrategies(),
      ]);

      if (activeStrategies.length === 0) throw new Error('No active strategies available');

      // ── Execute strategies ────────────────────────────────────────────────
      const strategyVotes = await this._executeStrategies(activeStrategies, shadowStrategies, squad, slot, candidateProfiles);

      // ── Consensus check ───────────────────────────────────────────────────
      const consensusResult = await consensusEngine.checkConsensus(strategyVotes, activeStrategies);
      const selection       = await this._makeSelection(consensusResult, strategyVotes, candidateProfiles);

      // ── Log decision ──────────────────────────────────────────────────────
      const decision = await decisionLogger.logDecision({
        squadId,
        slotId,
        selectedUserId:   selection.selectedUserId,
        alternativesShown: selection.alternatives,
        wasConsensus:     selection.wasConsensus,
        wasRandom:        !selection.wasConsensus,
        consensusCount:   consensusResult.agreementCount || 0,
        strategyVotes,
        activeStrategies: activeStrategies.map((s) => ({
          id: s.id, name: s.name, state: s.state, influenceLevel: s.influenceLevel,
        })),
        systemVersion: '2.1',
      });

      const executionTime = Date.now() - startTime;
      logger.info('Match complete', { decisionId: decision.id, executionMs: executionTime, method: selection.wasConsensus ? 'CONSENSUS' : 'RANDOM' });

      return {
        recommendedUserId: selection.selectedUserId,
        alternatives:      selection.alternatives,
        decisionId:        decision.id,
        explanation: {
          method:         selection.wasConsensus ? 'consensus' : 'exploration',
          reasoning:      selection.wasConsensus
            ? `${consensusResult.agreementCount} strategies agreed on this candidate`
            : 'Exploring diverse options to discover best matches',
          strategiesUsed: activeStrategies.length,
          confidence:     selection.wasConsensus ? (consensusResult.agreementCount / activeStrategies.length) : 0.5,
        },
        meta: {
          executionTimeMs:     executionTime,
          strategiesExecuted:  activeStrategies.length + shadowStrategies.length,
          consensusAchieved:   selection.wasConsensus,
        },
      };
    } catch (error) {
      logger.error('Match orchestrator error', { err: error.message, squadId, slotId });
      await this._logFailure(squadId, slotId, error);
      throw error;
    }
  }

  // ── Execute all strategies in parallel ────────────────────────────────────

  async _executeStrategies(activeStrategies, shadowStrategies, squad, slot, candidates) {
    const allStrategies = [
      ...activeStrategies.map((s) => ({ ...s, isShadow: false })),
      ...shadowStrategies.map((s) => ({ ...s, isShadow: true  })),
    ];

    const results = await Promise.allSettled(
      allStrategies.map((strategy) => this._executeStrategy(strategy, squad, slot, candidates))
    );

    const votes = {};
    for (let i = 0; i < results.length; i++) {
      const result   = results[i];
      const strategy = allStrategies[i];

      if (result.status === 'fulfilled') {
        votes[strategy.id] = {
          ...result.value,
          strategyName:   strategy.name,
          isShadow:       strategy.isShadow,
          influenceLevel: strategy.influenceLevel,
        };
        logger.debug('Strategy voted', { name: strategy.name, candidate: result.value.candidateId, score: result.value.normalizedScore });
      } else {
        logger.error('Strategy failed', { name: strategy.name, err: result.reason?.message });
        await this._logStrategyFailure(strategy.id, result.reason);
      }
    }

    return votes;
  }

  async _executeStrategy(strategy, squad, slot, candidates) {
    // Dynamically import each strategy implementation file — ESM equivalent
    // of the previous `require(./strategies/${name})` call
    const { default: StrategyImpl } = await import(`./strategies/${strategy.name}.js`);
    const instance = new StrategyImpl(strategy.config);

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Strategy timeout')), 5000)
    );

    const scoringPromise = (async () => {
      const scores = [];
      for (const candidate of candidates) {
        try {
          const rawScore = await instance.score(candidate, slot, squad);
          scores.push({ candidateId: candidate.id, rawScore });
        } catch (error) {
          logger.warn('Failed to score candidate', { candidateId: candidate.id, strategy: strategy.name, err: error.message });
          scores.push({ candidateId: candidate.id, rawScore: 0 });
        }
      }
      return scores;
    })();

    const scores           = await Promise.race([scoringPromise, timeout]);
    const normalizedScores = await instance.normalize(scores);

    const top = normalizedScores.reduce((best, current) =>
      current.normalizedScore > best.normalizedScore ? current : best
    );

    return { candidateId: top.candidateId, rawScore: top.rawScore, normalizedScore: top.normalizedScore, allScores: normalizedScores };
  }

  // ── Final selection ───────────────────────────────────────────────────────

  async _makeSelection(consensusResult, strategyVotes, candidates) {
    if (consensusResult.hasConsensus) {
      return {
        selectedUserId: consensusResult.selectedUserId,
        alternatives:   this._getAlternatives(consensusResult.selectedUserId, strategyVotes, candidates, 3),
        wasConsensus:   true,
        wasRandom:      false,
      };
    }

    // Controlled randomness fallback — weights capped at 2.0 to prevent dominance
    const votedCandidates = [...new Set(
      Object.values(strategyVotes).filter((v) => !v.isShadow).map((v) => v.candidateId)
    )];

    if (votedCandidates.length === 0) throw new Error('No candidates received votes from any strategy');

    const maxWeight = 2.0;
    const weights   = {};

    for (const candidateId of votedCandidates) {
      const relevant = Object.values(strategyVotes).filter((v) => !v.isShadow && v.candidateId === candidateId);
      weights[candidateId] = relevant.length > 0
        ? Math.min(relevant.reduce((sum, v) => sum + v.normalizedScore, 0) / relevant.length, maxWeight)
        : 0.5;
    }

    const selectedUserId = this._weightedRandom(votedCandidates, weights);

    return {
      selectedUserId,
      alternatives: this._getAlternatives(selectedUserId, strategyVotes, candidates, 3),
      wasConsensus: false,
      wasRandom:    true,
    };
  }

  _weightedRandom(candidates, weights) {
    const total = candidates.reduce((sum, c) => sum + (weights[c] || 1), 0);
    let random  = Math.random() * total;

    for (const candidate of candidates) {
      random -= weights[candidate] || 1;
      if (random <= 0) return candidate;
    }

    return candidates[0];
  }

  _getAlternatives(selectedUserId, strategyVotes, allCandidates, count) {
    const scores = {};

    for (const candidate of allCandidates) {
      if (candidate.id === selectedUserId) continue;
      scores[candidate.id] = 0;
      let voteCount = 0;

      for (const vote of Object.values(strategyVotes)) {
        if (!vote.isShadow && vote.candidateId === candidate.id) {
          scores[candidate.id] += vote.normalizedScore;
          voteCount++;
        }
      }
      if (voteCount > 0) scores[candidate.id] /= voteCount;
    }

    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([id]) => id);
  }

  async _logStrategyFailure(strategyId, error) {
    // TODO: Trigger automatic demotion if this strategy exceeds a failure threshold
    logger.warn('Strategy failure logged', { strategyId, err: error?.message });
  }

  async _logFailure(squadId, slotId, error) {
    logger.error('Orchestrator failure', { squadId, slotId, err: error.message });
  }
}

export default new MatchOrchestrator();