// ============================================================================
// DECISION LOGGER
// ============================================================================
//
// Purpose: Records EVERYTHING about every matching decision
//
// Why This Matters:
// - Complete audit trail (compliance, explainability)
// - Data for strategy evolution (what works, what doesn't)
// - Debugging (reproduce decisions exactly)
// - Analytics (understand system behavior)
//
// Philosophy:
// - Log first, analyze later
// - Never skip logging (even on errors)
// - Immutable records (never modify, only append)
//
// This is the "memory" of the antifragile system.
// Without perfect memory, there is no learning.
//
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DecisionLogger {

  // ============================================================================
  // LOG DECISION
  // ============================================================================
  //
  // Records complete decision context
  //
  // Input:
  // - squadId, slotId: What was being matched
  // - selectedUserId: Who was recommended
  // - alternativesShown: Other options shown to leader
  // - wasConsensus, wasRandom: How decision was made
  // - consensusCount: How many strategies agreed
  // - strategyVotes: Complete voting record
  // - activeStrategies: System state at decision time
  // - systemVersion: Code version for reproducibility
  //
  // Output: Created MatchDecision object

  async logDecision(data) {
    console.log('\n📝 DECISION LOGGER: Recording decision...');

    try {
      // ========================================
      // STEP 1: Validate required fields
      // ========================================
      const required = ['squadId', 'selectedUserId', 'wasConsensus', 'wasRandom', 'strategyVotes'];
      
      for (const field of required) {
        if (data[field] === undefined || data[field] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // ========================================
      // STEP 2: Prepare data for storage
      // ========================================
      
      // Strategy votes as JSON (PostgreSQL JSON type)
      const strategyVotesJson = JSON.stringify(data.strategyVotes);
      
      // Active strategies snapshot
      const activeStrategiesJson = JSON.stringify(data.activeStrategies || []);

      // ========================================
      // STEP 3: Create decision record
      // ========================================
      const decision = await prisma.matchDecision.create({
        data: {
          // Context
          squadId: data.squadId,
          slotId: data.slotId || null,
          
          // Output
          selectedUserId: data.selectedUserId,
          alternativesShown: data.alternativesShown || [],
          
          // Metadata
          wasConsensus: data.wasConsensus,
          wasRandom: data.wasRandom,
          consensusCount: data.consensusCount || 0,
          
          // Detailed records
          strategyVotes: strategyVotesJson,
          activeStrategies: activeStrategiesJson,
          systemVersion: data.systemVersion || 'unknown',
          
          // Timestamp is automatic (createdAt)
        }
      });

      console.log(`✅ Decision logged: ${decision.id}`);
      console.log(`   Method: ${decision.wasConsensus ? 'CONSENSUS' : 'RANDOM'}`);
      console.log(`   Selected: ${decision.selectedUserId}`);

      // ========================================
      // STEP 4: Update strategy statistics
      // ========================================
      await this._updateStrategyStats(data.strategyVotes, decision.wasConsensus);

      return decision;

    } catch (error) {
      console.error('❌ DECISION LOGGER ERROR:', error);
      
      // CRITICAL: Even if logging fails, don't crash the system
      // Log to fallback system (file, external service, etc.)
      await this._fallbackLog(data, error);
      
      // Re-throw so orchestrator knows logging failed
      throw error;
    }
  }

  // ============================================================================
  // LOG OUTCOME
  // ============================================================================
  //
  // Records what ACTUALLY happened after a decision
  //
  // This is called LATER (hours/days after decision):
  // - When squad leader accepts/rejects application
  // - When member joins squad
  // - At retention checkpoints (30d, 60d)
  //
  // Input:
  // - decisionId: Which decision this relates to
  // - accepted: boolean
  // - timeToDecision: minutes from recommendation to accept/reject
  // - retention30d, retention60d: boolean (checked later)
  // - leaderRating, memberRating: optional feedback

  async logOutcome(decisionId, outcomeData) {
    console.log(`\n📊 DECISION LOGGER: Recording outcome for ${decisionId}...`);

    try {
      // ========================================
      // STEP 1: Check if outcome already exists
      // ========================================
      const existing = await prisma.matchOutcome.findUnique({
        where: { decisionId }
      });

      if (existing) {
        // Update existing outcome (e.g., adding retention data later)
        console.log(`   Updating existing outcome...`);
        
        const updated = await prisma.matchOutcome.update({
          where: { decisionId },
          data: {
            ...outcomeData,
            lastUpdatedAt: new Date()
          }
        });

        console.log(`✅ Outcome updated`);
        return updated;
      }

      // ========================================
      // STEP 2: Create new outcome
      // ========================================
      const outcome = await prisma.matchOutcome.create({
        data: {
          decisionId,
          
          // Binary outcome
          accepted: outcomeData.accepted,
          acceptedAt: outcomeData.accepted ? (outcomeData.acceptedAt || new Date()) : null,
          rejectedAt: !outcomeData.accepted ? (outcomeData.rejectedAt || new Date()) : null,
          
          // Timing
          timeToDecision: outcomeData.timeToDecision || null,
          
          // Quality indicators (filled in later)
          memberJoinedAt: outcomeData.memberJoinedAt || null,
          memberLeftAt: outcomeData.memberLeftAt || null,
          retention30d: outcomeData.retention30d || null,
          retention60d: outcomeData.retention60d || null,
          squadCompleted: outcomeData.squadCompleted || null,
          
          // Feedback
          leaderRating: outcomeData.leaderRating || null,
          memberRating: outcomeData.memberRating || null
        }
      });

      console.log(`✅ Outcome logged`);
      console.log(`   Accepted: ${outcome.accepted}`);
      console.log(`   Time to decision: ${outcome.timeToDecision || 'N/A'} minutes`);

      // ========================================
      // STEP 3: Trigger strategy performance update
      // ========================================
      // This outcome will be picked up by Selection Pressure Worker
      await this._notifyOutcomeRecorded(decisionId);

      return outcome;

    } catch (error) {
      console.error('❌ OUTCOME LOGGER ERROR:', error);
      await this._fallbackLog({ decisionId, ...outcomeData }, error);
      throw error;
    }
  }

  // ============================================================================
  // GET DECISION
  // ============================================================================
  // Retrieves a specific decision with all context

  async getDecision(decisionId) {
    const decision = await prisma.matchDecision.findUnique({
      where: { id: decisionId },
      include: {
        squad: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        selectedUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        outcome: true
      }
    });

    if (!decision) {
      throw new Error('Decision not found');
    }

    // Parse JSON fields
    return {
      ...decision,
      strategyVotes: JSON.parse(decision.strategyVotes),
      activeStrategies: JSON.parse(decision.activeStrategies)
    };
  }

  // ============================================================================
  // GET DECISIONS FOR SQUAD
  // ============================================================================
  // All decisions made for a specific squad

  async getSquadDecisions(squadId) {
    const decisions = await prisma.matchDecision.findMany({
      where: { squadId },
      include: {
        selectedUser: {
          select: { id: true, name: true, avatar: true }
        },
        outcome: true
      },
      orderBy: { timestamp: 'desc' }
    });

    return decisions.map(d => ({
      ...d,
      strategyVotes: JSON.parse(d.strategyVotes),
      activeStrategies: JSON.parse(d.activeStrategies)
    }));
  }

  // ============================================================================
  // GET DECISIONS FOR USER
  // ============================================================================
  // All decisions where a user was selected

  async getUserDecisions(userId) {
    const decisions = await prisma.matchDecision.findMany({
      where: { selectedUserId: userId },
      include: {
        squad: {
          select: { id: true, title: true, status: true }
        },
        outcome: true
      },
      orderBy: { timestamp: 'desc' }
    });

    return decisions.map(d => ({
      ...d,
      strategyVotes: JSON.parse(d.strategyVotes),
      activeStrategies: JSON.parse(d.activeStrategies)
    }));
  }

  // ============================================================================
  // GET DECISIONS AWAITING OUTCOMES
  // ============================================================================
  // Decisions without outcomes (applications pending)
  //
  // Used by:
  // - Background worker to check for outcomes
  // - Admin dashboard to monitor pending decisions

  async getPendingDecisions(olderThanHours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);

    const decisions = await prisma.matchDecision.findMany({
      where: {
        timestamp: { lt: cutoff },
        outcome: null // No outcome recorded yet
      },
      include: {
        squad: true,
        selectedUser: {
          select: { id: true, name: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    console.log(`📋 Found ${decisions.length} decisions without outcomes (>${olderThanHours}h old)`);

    return decisions;
  }

  // ============================================================================
  // ANALYZE DECISION QUALITY
  // ============================================================================
  // Retrospective analysis of decisions
  //
  // Groups decisions by:
  // - Consensus vs Random
  // - Accepted vs Rejected
  // - Time to decision
  //
  // Returns insights about what works

  async analyzeDecisionQuality(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all decisions with outcomes
    const decisions = await prisma.matchDecision.findMany({
      where: {
        timestamp: { gte: since },
        outcome: { isNot: null }
      },
      include: { outcome: true }
    });

    // Group by method
    const consensusDecisions = decisions.filter(d => d.wasConsensus);
    const randomDecisions = decisions.filter(d => d.wasRandom);

    // Calculate acceptance rates
    const consensusAccepted = consensusDecisions.filter(d => d.outcome.accepted).length;
    const randomAccepted = randomDecisions.filter(d => d.outcome.accepted).length;

    // Calculate average time to decision
    const consensusTimes = consensusDecisions
      .filter(d => d.outcome.timeToDecision)
      .map(d => d.outcome.timeToDecision);
    
    const randomTimes = randomDecisions
      .filter(d => d.outcome.timeToDecision)
      .map(d => d.outcome.timeToDecision);

    const avgConsensusTime = consensusTimes.length > 0
      ? consensusTimes.reduce((a, b) => a + b, 0) / consensusTimes.length
      : null;

    const avgRandomTime = randomTimes.length > 0
      ? randomTimes.reduce((a, b) => a + b, 0) / randomTimes.length
      : null;

    return {
      period: `Last ${days} days`,
      totalDecisions: decisions.length,
      
      consensus: {
        count: consensusDecisions.length,
        accepted: consensusAccepted,
        acceptanceRate: consensusDecisions.length > 0
          ? consensusAccepted / consensusDecisions.length
          : 0,
        avgTimeToDecision: avgConsensusTime
      },
      
      random: {
        count: randomDecisions.length,
        accepted: randomAccepted,
        acceptanceRate: randomDecisions.length > 0
          ? randomAccepted / randomDecisions.length
          : 0,
        avgTimeToDecision: avgRandomTime
      },

      // Comparison
      consensusAdvantage: {
        acceptanceRateDiff: consensusDecisions.length > 0 && randomDecisions.length > 0
          ? (consensusAccepted / consensusDecisions.length) - (randomAccepted / randomDecisions.length)
          : null,
        speedAdvantage: avgConsensusTime && avgRandomTime
          ? avgRandomTime - avgConsensusTime // Positive = consensus is faster
          : null
      }
    };
  }

  // ============================================================================
  // HELPER: Update strategy statistics
  // ============================================================================
  // Increments counters on strategies after each decision

  async _updateStrategyStats(strategyVotes, wasConsensus) {
    try {
      for (const [strategyId, vote] of Object.entries(strategyVotes)) {
        if (vote.isShadow) continue; // Don't update shadow strategies

        await prisma.matchStrategy.update({
          where: { id: strategyId },
          data: {
            totalDecisions: { increment: 1 },
            consensusWins: wasConsensus ? { increment: 1 } : undefined
          }
        });
      }
    } catch (error) {
      console.error('⚠️  Failed to update strategy stats:', error.message);
      // Non-critical, don't throw
    }
  }

  // ============================================================================
  // HELPER: Notify that outcome was recorded
  // ============================================================================
  // Triggers background worker to update strategy performance

  async _notifyOutcomeRecorded(decisionId) {
    // TODO: Implement notification mechanism
    // Options:
    // - Redis pub/sub
    // - Database flag
    // - Event queue (RabbitMQ, SQS)
    
    console.log(`📬 Outcome notification queued for decision ${decisionId}`);
  }

  // ============================================================================
  // HELPER: Fallback logging
  // ============================================================================
  // If database logging fails, write to file/external service

  async _fallbackLog(data, error) {
    console.error('⚠️  Using fallback logging mechanism');
    
    // Write to log file
    const fs = require('fs');
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      data: data
    };

    try {
      fs.appendFileSync(
        '/tmp/skillsphere-decision-fallback.log',
        JSON.stringify(logEntry) + '\n'
      );
      console.log('✅ Fallback log written to /tmp/skillsphere-decision-fallback.log');
    } catch (fsError) {
      console.error('❌ Even fallback logging failed:', fsError.message);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================
module.exports = new DecisionLogger();