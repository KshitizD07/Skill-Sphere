// ============================================================================
// MATCH ORCHESTRATOR
// ============================================================================
//
// Purpose: The BRAIN of the antifragile matching system
//
// What it does:
// 1. Receives match request (squad + candidates)
// 2. Executes ALL active strategies in parallel
// 3. Normalizes scores to comparable scale
// 4. Attempts consensus
// 5. Falls back to controlled randomness if needed
// 6. Logs complete decision
//
// Philosophy:
// - NO SINGLE STRATEGY DOMINATES
// - Diversity is preserved through parallelism
// - Randomness is a feature, not a bug
// - Every decision is fully auditable
//
// This is where "antifragility" becomes real.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const strategyRegistry = require('./strategyRegistry');
const consensusEngine = require('./consensusEngine');
const decisionLogger = require('./decisionLogger');

const prisma = new PrismaClient();

class MatchOrchestrator {

  // ============================================================================
  // MAIN ENTRY POINT: MATCH CANDIDATES TO SLOT
  // ============================================================================
  //
  // Input:
  // - squadId: Which squad needs a member
  // - slotId: Which specific slot (role) to fill
  // - candidates: Array of user IDs to consider
  //
  // Output:
  // - recommendedUserId: Who to show first to squad leader
  // - alternatives: Other good options
  // - explanation: Why this recommendation
  // - decisionId: For tracking outcomes later

  async matchCandidatesForSlot(squadId, slotId, candidates) {
    console.log('\n============================================');
    console.log('🎯 MATCH ORCHESTRATOR: Starting new match');
    console.log('============================================');
    console.log(`   Squad: ${squadId}`);
    console.log(`   Slot: ${slotId}`);
    console.log(`   Candidates: ${candidates.length}`);
    console.log('============================================\n');

    const startTime = Date.now();

    try {
      // ========================================
      // STEP 1: Validate inputs
      // ========================================
      if (!squadId || !slotId || !candidates || candidates.length === 0) {
        throw new Error('Invalid match request: missing required fields');
      }

      // ========================================
      // STEP 2: Get squad and slot context
      // ========================================
      console.log('📋 Step 1: Loading squad context...');
      
      const squad = await prisma.squadRequest.findUnique({
        where: { id: squadId },
        include: {
          slots: { where: { id: slotId } },
          leader: { select: { id: true, name: true, college: true } }
        }
      });

      if (!squad) {
        throw new Error(`Squad ${squadId} not found`);
      }

      const slot = squad.slots[0];
      if (!slot) {
        throw new Error(`Slot ${slotId} not found`);
      }

      console.log(`✅ Squad: "${squad.title}"`);
      console.log(`✅ Slot: "${slot.role}" (requires: ${slot.requiredSkill || 'any'})`);

      // ========================================
      // STEP 3: Load candidate data
      // ========================================
      console.log('\n📊 Step 2: Loading candidate profiles...');
      
      const candidateProfiles = await prisma.user.findMany({
        where: { id: { in: candidates } },
        include: {
          skills: {
            select: {
              name: true,
              level: true,
              isVerified: true,
              calculatedScore: true
            }
          }
        }
      });

      console.log(`✅ Loaded ${candidateProfiles.length} candidate profiles`);

      // ========================================
      // STEP 4: Get active strategies
      // ========================================
      console.log('\n🧠 Step 3: Loading active strategies...');
      
      const activeStrategies = await strategyRegistry.getActiveStrategies();
      const shadowStrategies = await strategyRegistry.getShadowStrategies();

      console.log(`✅ Active strategies: ${activeStrategies.length}`);
      console.log(`👻 Shadow strategies: ${shadowStrategies.length}`);

      if (activeStrategies.length === 0) {
        throw new Error('No active strategies available. System cannot make decisions.');
      }

      // ========================================
      // STEP 5: Execute ALL strategies in parallel
      // ========================================
      console.log('\n⚡ Step 4: Executing strategies in parallel...');
      
      const strategyVotes = await this._executeStrategies(
        activeStrategies,
        shadowStrategies,
        squad,
        slot,
        candidateProfiles
      );

      console.log(`✅ Collected votes from ${Object.keys(strategyVotes).length} strategies`);

      // ========================================
      // STEP 6: Attempt consensus
      // ========================================
      console.log('\n🤝 Step 5: Checking for consensus...');
      
      const consensusResult = await consensusEngine.checkConsensus(
        strategyVotes,
        activeStrategies
      );

      if (consensusResult.hasConsensus) {
        console.log('✅ CONSENSUS FOUND!');
        console.log(`   Winner: ${consensusResult.selectedUserId}`);
        console.log(`   Agreed by: ${consensusResult.agreementCount}/${activeStrategies.length} strategies`);
      } else {
        console.log('❌ No consensus - strategies disagree');
        console.log('   Falling back to controlled randomness...');
      }

      // ========================================
      // STEP 7: Make final selection
      // ========================================
      console.log('\n🎲 Step 6: Final selection...');
      
      const selection = await this._makeSelection(
        consensusResult,
        strategyVotes,
        candidateProfiles
      );

      console.log(`✅ Selected: ${selection.selectedUserId}`);
      console.log(`   Method: ${selection.wasConsensus ? 'CONSENSUS' : 'RANDOMNESS'}`);

      // ========================================
      // STEP 8: Log decision (CRITICAL for learning)
      // ========================================
      console.log('\n📝 Step 7: Logging decision...');
      
      const decision = await decisionLogger.logDecision({
        squadId,
        slotId,
        selectedUserId: selection.selectedUserId,
        alternativesShown: selection.alternatives,
        wasConsensus: selection.wasConsensus,
        wasRandom: !selection.wasConsensus,
        consensusCount: consensusResult.agreementCount || 0,
        strategyVotes,
        activeStrategies: activeStrategies.map(s => ({
          id: s.id,
          name: s.name,
          state: s.state,
          influenceLevel: s.influenceLevel
        })),
        systemVersion: '2.1'
      });

      console.log(`✅ Decision logged: ${decision.id}`);

      // ========================================
      // STEP 9: Prepare response
      // ========================================
      const executionTime = Date.now() - startTime;
      
      console.log('\n============================================');
      console.log('✅ MATCH COMPLETE');
      console.log(`   Execution time: ${executionTime}ms`);
      console.log('============================================\n');

      return {
        recommendedUserId: selection.selectedUserId,
        alternatives: selection.alternatives,
        decisionId: decision.id,
        
        // Explanation for UI
        explanation: {
          method: selection.wasConsensus ? 'consensus' : 'exploration',
          reasoning: selection.wasConsensus
            ? `${consensusResult.agreementCount} strategies agreed on this candidate`
            : 'Exploring diverse options to discover best matches',
          strategiesUsed: activeStrategies.length,
          confidence: selection.wasConsensus 
            ? (consensusResult.agreementCount / activeStrategies.length) 
            : 0.5 // Random = medium confidence
        },

        // Metadata
        meta: {
          executionTimeMs: executionTime,
          strategiesExecuted: activeStrategies.length + shadowStrategies.length,
          consensusAchieved: selection.wasConsensus
        }
      };

    } catch (error) {
      console.error('❌ MATCH ORCHESTRATOR ERROR:', error);
      
      // Log failure
      await this._logFailure(squadId, slotId, error);
      
      throw error;
    }
  }

  // ============================================================================
  // EXECUTE ALL STRATEGIES
  // ============================================================================
  // Runs each strategy against all candidates
  //
  // Returns: Object mapping strategyId → { candidateId, score }
  //
  // Key Points:
  // - All strategies run in parallel (Promise.allSettled)
  // - Shadow strategies run but don't affect decision
  // - Timeout protection (5 seconds per strategy)
  // - Failures are logged but don't crash system

  async _executeStrategies(activeStrategies, shadowStrategies, squad, slot, candidates) {
    console.log('\n   🔄 Executing strategies...');

    const allStrategies = [
      ...activeStrategies.map(s => ({ ...s, isShadow: false })),
      ...shadowStrategies.map(s => ({ ...s, isShadow: true }))
    ];

    // Execute all strategies in parallel
    const results = await Promise.allSettled(
      allStrategies.map(strategy => 
        this._executeStrategy(strategy, squad, slot, candidates)
      )
    );

    // Collect successful votes
    const votes = {};
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const strategy = allStrategies[i];

      if (result.status === 'fulfilled') {
        votes[strategy.id] = {
          ...result.value,
          strategyName: strategy.name,
          isShadow: strategy.isShadow,
          influenceLevel: strategy.influenceLevel
        };
        
        console.log(`   ✅ ${strategy.name}: ${result.value.candidateId} (score: ${result.value.normalizedScore.toFixed(2)})`);
      } else {
        console.error(`   ❌ ${strategy.name} FAILED: ${result.reason?.message}`);
        
        // Log strategy failure
        await this._logStrategyFailure(strategy.id, result.reason);
      }
    }

    return votes;
  }

  // ============================================================================
  // EXECUTE SINGLE STRATEGY
  // ============================================================================
  // Runs one strategy against all candidates
  //
  // Returns: { candidateId, rawScore, normalizedScore }
  //
  // Steps:
  // 1. Score all candidates
  // 2. Normalize scores to [0, 1]
  // 3. Select top candidate

  async _executeStrategy(strategy, squad, slot, candidates) {
    console.log(`   🔄 Running strategy: ${strategy.name}...`);

    // ========================================
    // LOAD STRATEGY IMPLEMENTATION
    // ========================================
    // Each strategy is a separate file in /strategies folder
    const StrategyImplementation = require(`./strategies/${strategy.name}`);
    const strategyInstance = new StrategyImplementation(strategy.config);

    // ========================================
    // TIMEOUT PROTECTION
    // ========================================
    const timeoutMs = 5000; // 5 seconds max per strategy
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Strategy timeout')), timeoutMs)
    );

    // ========================================
    // SCORE ALL CANDIDATES
    // ========================================
    const scoringPromise = (async () => {
      const scores = [];

      for (const candidate of candidates) {
        try {
          // Call strategy's score method
          const rawScore = await strategyInstance.score(candidate, slot, squad);
          
          scores.push({
            candidateId: candidate.id,
            rawScore
          });
        } catch (error) {
          console.error(`   ⚠️  Failed to score candidate ${candidate.id}:`, error.message);
          // Score 0 for failed candidates
          scores.push({
            candidateId: candidate.id,
            rawScore: 0
          });
        }
      }

      return scores;
    })();

    // Race between scoring and timeout
    const scores = await Promise.race([scoringPromise, timeout]);

    // ========================================
    // NORMALIZE SCORES
    // ========================================
    // Convert raw scores to [0, 1] range for comparability
    const normalizedScores = await strategyInstance.normalize(scores);

    // ========================================
    // SELECT TOP CANDIDATE
    // ========================================
    const topCandidate = normalizedScores.reduce((best, current) => 
      current.normalizedScore > best.normalizedScore ? current : best
    );

    return {
      candidateId: topCandidate.candidateId,
      rawScore: topCandidate.rawScore,
      normalizedScore: topCandidate.normalizedScore,
      allScores: normalizedScores // For debugging
    };
  }

  // ============================================================================
  // MAKE FINAL SELECTION
  // ============================================================================
  // Chooses final candidate based on consensus or randomness
  //
  // Logic:
  // - If consensus exists → use it
  // - If no consensus → controlled randomness
  //
  // Also selects alternatives to show to squad leader

  async _makeSelection(consensusResult, strategyVotes, candidates) {
    const config = await strategyRegistry.getSystemConfig();

    // ========================================
    // CASE 1: Consensus exists - use it
    // ========================================
    if (consensusResult.hasConsensus) {
      const selectedUserId = consensusResult.selectedUserId;
      
      // Get alternatives (next best candidates)
      const alternatives = this._getAlternatives(
        selectedUserId,
        strategyVotes,
        candidates,
        3 // Show top 3 alternatives
      );

      return {
        selectedUserId,
        alternatives,
        wasConsensus: true,
        wasRandom: false
      };
    }

    // ========================================
    // CASE 2: No consensus - controlled randomness
    // ========================================
    console.log('   🎲 Using controlled randomness for exploration...');

    // Get all unique candidates that strategies voted for
    const votedCandidates = new Set();
    Object.values(strategyVotes).forEach(vote => {
      if (!vote.isShadow) { // Only active strategies
        votedCandidates.add(vote.candidateId);
      }
    });

    const candidateArray = Array.from(votedCandidates);

    if (candidateArray.length === 0) {
      throw new Error('No candidates received votes from any strategy');
    }

    // ========================================
    // WEIGHTED RANDOM SELECTION
    // ========================================
    // Use normalized scores as weights, but cap them to prevent dominance
    const weights = {};
    const maxWeight = 2.0; // Cap prevents any candidate from dominating

    candidateArray.forEach(candidateId => {
      // Average normalized score across all strategies that voted for this candidate
      const relevantVotes = Object.values(strategyVotes).filter(
        v => !v.isShadow && v.candidateId === candidateId
      );

      if (relevantVotes.length > 0) {
        const avgScore = relevantVotes.reduce((sum, v) => sum + v.normalizedScore, 0) / relevantVotes.length;
        weights[candidateId] = Math.min(avgScore, maxWeight);
      } else {
        weights[candidateId] = 0.5; // Neutral weight
      }
    });

    // Random selection weighted by scores
    const selectedUserId = this._weightedRandom(candidateArray, weights);

    // Get alternatives
    const alternatives = this._getAlternatives(
      selectedUserId,
      strategyVotes,
      candidates,
      3
    );

    console.log(`   ✅ Random selection: ${selectedUserId} (from ${candidateArray.length} options)`);

    return {
      selectedUserId,
      alternatives,
      wasConsensus: false,
      wasRandom: true
    };
  }

  // ============================================================================
  // HELPER: Weighted random selection
  // ============================================================================
  _weightedRandom(candidates, weights) {
    const totalWeight = candidates.reduce((sum, c) => sum + (weights[c] || 1), 0);
    let random = Math.random() * totalWeight;

    for (const candidate of candidates) {
      const weight = weights[candidate] || 1;
      random -= weight;
      if (random <= 0) {
        return candidate;
      }
    }

    // Fallback
    return candidates[0];
  }

  // ============================================================================
  // HELPER: Get alternative candidates
  // ============================================================================
  _getAlternatives(selectedUserId, strategyVotes, allCandidates, count) {
    // Aggregate scores for all candidates
    const candidateScores = {};

    allCandidates.forEach(candidate => {
      if (candidate.id === selectedUserId) return; // Skip selected

      candidateScores[candidate.id] = 0;
      let voteCount = 0;

      Object.values(strategyVotes).forEach(vote => {
        if (!vote.isShadow && vote.candidateId === candidate.id) {
          candidateScores[candidate.id] += vote.normalizedScore;
          voteCount++;
        }
      });

      // Average score
      if (voteCount > 0) {
        candidateScores[candidate.id] /= voteCount;
      }
    });

    // Sort by score and take top N
    const alternatives = Object.entries(candidateScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([candidateId]) => candidateId);

    return alternatives;
  }

  // ============================================================================
  // HELPER: Log strategy failure
  // ============================================================================
  async _logStrategyFailure(strategyId, error) {
    console.error(`📝 Logging strategy failure: ${strategyId}`);
    // TODO: Implement failure tracking
    // This could trigger automatic demotion if failures are frequent
  }

  // ============================================================================
  // HELPER: Log orchestrator failure
  // ============================================================================
  async _logFailure(squadId, slotId, error) {
    console.error(`📝 Logging orchestrator failure for squad ${squadId}`);
    // TODO: Implement failure tracking
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================
module.exports = new MatchOrchestrator();