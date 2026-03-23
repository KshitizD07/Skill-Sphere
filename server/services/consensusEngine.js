// ============================================================================
// CONSENSUS ENGINE
// ============================================================================
//
// Purpose: Determines if multiple strategies agree on the same candidate
//
// Philosophy:
// - Consensus = Stability
// - Disagreement = Exploration opportunity
// - Never force consensus (no averaging)
//
// This is what makes the system "stable when it should be, volatile when it needs to be"
//
// Consensus Rules (from architecture):
// - If ≥2 strategies select the same candidate → CONSENSUS
// - Consensus always overrides randomness
// - Consensus decisions carry higher confidence
//
// ============================================================================

const strategyRegistry = require('./strategyRegistry');

class ConsensusEngine {

  // ============================================================================
  // CHECK CONSENSUS
  // ============================================================================
  //
  // Input:
  // - strategyVotes: Object mapping strategyId → { candidateId, score, ... }
  // - activeStrategies: Array of strategy objects
  //
  // Output:
  // {
  //   hasConsensus: boolean,
  //   selectedUserId: string | null,
  //   agreementCount: number,
  //   agreementStrategies: string[]
  // }
  //
  // Algorithm:
  // 1. Count how many strategies voted for each candidate
  // 2. Find candidate with most votes
  // 3. Check if vote count meets consensus threshold

  async checkConsensus(strategyVotes, activeStrategies) {
    console.log('\n🤝 CONSENSUS ENGINE: Analyzing strategy votes...');

    // ========================================
    // STEP 1: Get system config
    // ========================================
    const config = await strategyRegistry.getSystemConfig();
    const minConsensus = config.minConsensusStrategies; // Usually 2

    console.log(`   Consensus threshold: ≥${minConsensus} strategies must agree`);

    // ========================================
    // STEP 2: Filter out shadow votes
    // ========================================
    // Only ACTIVE strategies participate in consensus
    const activeVotes = {};
    
    Object.entries(strategyVotes).forEach(([strategyId, vote]) => {
      if (!vote.isShadow) {
        activeVotes[strategyId] = vote;
      }
    });

    console.log(`   Active strategy votes: ${Object.keys(activeVotes).length}`);

    // ========================================
    // STEP 3: Count votes for each candidate
    // ========================================
    const voteCounts = {};
    const votesByCandidate = {};

    Object.entries(activeVotes).forEach(([strategyId, vote]) => {
      const candidateId = vote.candidateId;

      // Increment count
      if (!voteCounts[candidateId]) {
        voteCounts[candidateId] = 0;
        votesByCandidate[candidateId] = [];
      }

      voteCounts[candidateId]++;
      votesByCandidate[candidateId].push({
        strategyId,
        strategyName: vote.strategyName,
        score: vote.normalizedScore
      });
    });

    // ========================================
    // STEP 4: Find top candidate
    // ========================================
    let topCandidate = null;
    let topCount = 0;

    Object.entries(voteCounts).forEach(([candidateId, count]) => {
      console.log(`   📊 Candidate ${candidateId}: ${count} vote(s)`);
      
      if (count > topCount) {
        topCount = count;
        topCandidate = candidateId;
      }
    });

    // ========================================
    // STEP 5: Check if consensus achieved
    // ========================================
    const hasConsensus = topCount >= minConsensus;

    if (hasConsensus) {
      const strategies = votesByCandidate[topCandidate];
      
      console.log(`\n   ✅ CONSENSUS ACHIEVED!`);
      console.log(`   Winner: ${topCandidate}`);
      console.log(`   Agreement: ${topCount}/${Object.keys(activeVotes).length} strategies`);
      console.log(`   Strategies in agreement:`);
      
      strategies.forEach(s => {
        console.log(`      - ${s.strategyName} (score: ${s.score.toFixed(2)})`);
      });

      return {
        hasConsensus: true,
        selectedUserId: topCandidate,
        agreementCount: topCount,
        agreementStrategies: strategies.map(s => s.strategyId),
        
        // Extra context for logging
        voteCounts,
        strategiesInvolved: Object.keys(activeVotes).length
      };
    }

    // ========================================
    // CASE: No consensus
    // ========================================
    console.log(`\n   ❌ No consensus (max agreement: ${topCount}/${minConsensus})`);
    console.log(`   Vote distribution:`);
    
    Object.entries(voteCounts).forEach(([candidateId, count]) => {
      console.log(`      ${candidateId}: ${count} vote(s)`);
    });

    return {
      hasConsensus: false,
      selectedUserId: null,
      agreementCount: topCount,
      agreementStrategies: [],
      
      // Context
      voteCounts,
      strategiesInvolved: Object.keys(activeVotes).length
    };
  }

  // ============================================================================
  // CHECK PARTIAL CONSENSUS
  // ============================================================================
  // Sometimes useful to know if there's partial agreement
  //
  // Returns candidates with >1 vote (but not enough for consensus)
  // Can be used for "weak recommendations" in UI

  async checkPartialConsensus(strategyVotes, activeStrategies) {
    // Filter active votes
    const activeVotes = {};
    Object.entries(strategyVotes).forEach(([strategyId, vote]) => {
      if (!vote.isShadow) {
        activeVotes[strategyId] = vote;
      }
    });

    // Count votes
    const voteCounts = {};
    Object.values(activeVotes).forEach(vote => {
      const candidateId = vote.candidateId;
      voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
    });

    // Find candidates with multiple votes (but not consensus)
    const config = await strategyRegistry.getSystemConfig();
    const minConsensus = config.minConsensusStrategies;

    const partialAgreements = Object.entries(voteCounts)
      .filter(([_, count]) => count > 1 && count < minConsensus)
      .map(([candidateId, count]) => ({
        candidateId,
        votes: count,
        status: 'partial_agreement'
      }));

    return partialAgreements;
  }

  // ============================================================================
  // ANALYZE DISAGREEMENT
  // ============================================================================
  // When consensus fails, understand WHY
  //
  // Returns insights about strategy disagreement:
  // - Are strategies voting for diverse candidates?
  // - Are scores close or far apart?
  // - Which strategies consistently disagree?

  async analyzeDisagreement(strategyVotes) {
    const activeVotes = {};
    Object.entries(strategyVotes).forEach(([strategyId, vote]) => {
      if (!vote.isShadow) {
        activeVotes[strategyId] = vote;
      }
    });

    // Unique candidates
    const uniqueCandidates = new Set(
      Object.values(activeVotes).map(v => v.candidateId)
    );

    // Score variance
    const allScores = Object.values(activeVotes).map(v => v.normalizedScore);
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const variance = allScores.reduce((sum, score) => 
      sum + Math.pow(score - avgScore, 2), 0
    ) / allScores.length;

    return {
      uniqueCandidates: uniqueCandidates.size,
      totalStrategies: Object.keys(activeVotes).length,
      diversityScore: uniqueCandidates.size / Object.keys(activeVotes).length,
      scoreVariance: variance,
      interpretation: this._interpretDisagreement(uniqueCandidates.size, variance)
    };
  }

  // ============================================================================
  // HELPER: Interpret disagreement
  // ============================================================================
  _interpretDisagreement(uniqueCandidates, variance) {
    if (uniqueCandidates === 1 && variance < 0.1) {
      return 'Near consensus - strategies picked same candidate with similar scores';
    }
    
    if (uniqueCandidates === 2 && variance < 0.2) {
      return 'Close call - two strong candidates, strategies split';
    }

    if (uniqueCandidates > 3) {
      return 'High diversity - strategies see different strengths in candidates';
    }

    if (variance > 0.3) {
      return 'High uncertainty - strategies have very different assessments';
    }

    return 'Moderate disagreement - no clear winner';
  }

  // ============================================================================
  // GET CONSENSUS HISTORY
  // ============================================================================
  // Tracks consensus rate over time
  //
  // Useful for:
  // - Monitoring system health
  // - Detecting if strategies are converging (bad!)
  // - Ensuring sufficient exploration

  async getConsensusHistory(days = 7) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const decisions = await prisma.matchDecision.findMany({
      where: {
        timestamp: { gte: since }
      },
      select: {
        wasConsensus: true,
        wasRandom: true,
        timestamp: true
      },
      orderBy: { timestamp: 'asc' }
    });

    // Calculate daily consensus rate
    const dailyStats = {};

    decisions.forEach(decision => {
      const date = decision.timestamp.toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          total: 0,
          consensus: 0,
          random: 0
        };
      }

      dailyStats[date].total++;
      if (decision.wasConsensus) dailyStats[date].consensus++;
      if (decision.wasRandom) dailyStats[date].random++;
    });

    // Calculate rates
    const history = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      total: stats.total,
      consensusCount: stats.consensus,
      randomCount: stats.random,
      consensusRate: stats.consensus / stats.total,
      randomRate: stats.random / stats.total
    }));

    // Overall stats
    const totalDecisions = decisions.length;
    const totalConsensus = decisions.filter(d => d.wasConsensus).length;
    const totalRandom = decisions.filter(d => d.wasRandom).length;

    return {
      history,
      overall: {
        totalDecisions,
        consensusCount: totalConsensus,
        randomCount: totalRandom,
        consensusRate: totalDecisions > 0 ? totalConsensus / totalDecisions : 0,
        randomRate: totalDecisions > 0 ? totalRandom / totalDecisions : 0
      }
    };
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  // Ensures consensus engine is working as expected
  //
  // Checks:
  // - Randomness rate is within bounds (10-30%)
  // - Strategies aren't converging (>80% consensus = bad)
  // - System is making decisions

  async healthCheck() {
    const history = await this.getConsensusHistory(7);
    const config = await strategyRegistry.getSystemConfig();

    const warnings = [];
    const info = [];

    // Check randomness rate
    const randomRate = history.overall.randomRate;
    if (randomRate < config.minRandomnessRate) {
      warnings.push(`⚠️  Randomness rate too low: ${(randomRate * 100).toFixed(1)}% (min: ${(config.minRandomnessRate * 100)}%)`);
    } else if (randomRate > config.maxRandomnessRate) {
      warnings.push(`⚠️  Randomness rate too high: ${(randomRate * 100).toFixed(1)}% (max: ${(config.maxRandomnessRate * 100)}%)`);
    } else {
      info.push(`✅ Randomness rate healthy: ${(randomRate * 100).toFixed(1)}%`);
    }

    // Check if strategies are over-converging
    const consensusRate = history.overall.consensusRate;
    if (consensusRate > 0.8) {
      warnings.push(`⚠️  Consensus rate very high: ${(consensusRate * 100).toFixed(1)}% - strategies may be converging (antifragility at risk)`);
    } else {
      info.push(`✅ Consensus rate balanced: ${(consensusRate * 100).toFixed(1)}%`);
    }

    // Check activity
    if (history.overall.totalDecisions === 0) {
      warnings.push(`⚠️  No decisions in last 7 days`);
    } else {
      info.push(`✅ Active system: ${history.overall.totalDecisions} decisions in 7 days`);
    }

    return {
      healthy: warnings.length === 0,
      warnings,
      info,
      stats: history.overall
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================
module.exports = new ConsensusEngine();