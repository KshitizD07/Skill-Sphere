// ============================================================================
// STRATEGY: VERIFIED SKILLS MATCHER V1
// ============================================================================
//
// Name: verified_skills_v1
// Description: Prioritizes candidates with verified skills matching slot requirements
//
// Philosophy:
// - Verified skills are strongest signal
// - Exact match > partial match
// - Score correlates with verification strength
//
// This is essentially your existing Gatekeeper logic, but as a strategy
//
// ============================================================================

class VerifiedSkillsMatcherV1 {

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  constructor(config = {}) {
    this.config = {
      verifiedBonus: config.verifiedBonus || 0.3,     // +30% for verified skills
      minScoreThreshold: config.minScoreThreshold || 0, // Min score to consider
      exactMatchBonus: config.exactMatchBonus || 0.2,   // +20% for exact skill match
      ...config
    };

    console.log(`🎯 VerifiedSkillsMatcherV1 initialized with config:`, this.config);
  }

  // ============================================================================
  // SCORE METHOD
  // ============================================================================
  //
  // Scores a single candidate for a specific slot
  //
  // Input:
  // - candidate: User object with skills array
  // - slot: SquadSlot object with requiredSkill
  // - squad: Full squad context (optional, for additional context)
  //
  // Output:
  // - Raw score (will be normalized later)
  //
  // Scoring Logic:
  // 1. Check if candidate has required skill
  // 2. Base score from skill.calculatedScore (0-10)
  // 3. Add bonus if verified
  // 4. Add bonus if exact match
  // 5. Apply any penalties

  async score(candidate, slot, squad) {
    console.log(`   🎯 Scoring candidate ${candidate.id} for slot "${slot.role}"`);

    // ========================================
    // CASE 1: Slot has no required skill
    // ========================================
    if (!slot.requiredSkill) {
      console.log(`      ℹ️  No skill required - default score`);
      return 5.0; // Neutral score for open roles
    }

    // ========================================
    // CASE 2: Find matching skill
    // ========================================
    const requiredSkillName = slot.requiredSkill.toLowerCase();
    
    const matchingSkill = candidate.skills.find(
      s => s.name.toLowerCase() === requiredSkillName
    );

    if (!matchingSkill) {
      console.log(`      ❌ Missing required skill: ${slot.requiredSkill}`);
      return 0.0; // No match = zero score
    }

    // ========================================
    // CASE 3: Has skill - calculate score
    // ========================================
    
    // Base score from GitHub verification (0-10)
    let score = matchingSkill.calculatedScore || 0;
    console.log(`      📊 Base score: ${score.toFixed(2)}`);

    // Bonus: Verified via GitHub
    if (matchingSkill.isVerified) {
      const verifiedBonus = score * this.config.verifiedBonus;
      score += verifiedBonus;
      console.log(`      ✅ Verified bonus: +${verifiedBonus.toFixed(2)}`);
    }

    // Bonus: Exact match (not just partial)
    if (matchingSkill.name.toLowerCase() === requiredSkillName) {
      const exactBonus = score * this.config.exactMatchBonus;
      score += exactBonus;
      console.log(`      🎯 Exact match bonus: +${exactBonus.toFixed(2)}`);
    }

    // Cap at 15 (allows for bonuses beyond 10)
    score = Math.min(score, 15);

    console.log(`      ✅ Final raw score: ${score.toFixed(2)}`);

    return score;
  }

  // ============================================================================
  // NORMALIZE METHOD
  // ============================================================================
  //
  // Converts raw scores to [0, 1] range for comparability
  //
  // Input:
  // - scores: Array of { candidateId, rawScore }
  //
  // Output:
  // - Array of { candidateId, rawScore, normalizedScore }
  //
  // Normalization Strategy:
  // - Min-max normalization
  // - Preserves relative rankings
  // - Ensures all strategies' scores are comparable

  async normalize(scores) {
    console.log(`   📐 Normalizing ${scores.length} scores...`);

    // ========================================
    // CASE 1: No scores or all zero
    // ========================================
    if (scores.length === 0) {
      return [];
    }

    const allZero = scores.every(s => s.rawScore === 0);
    if (allZero) {
      console.log(`      ⚠️  All scores are zero - returning equal weights`);
      return scores.map(s => ({
        ...s,
        normalizedScore: 0.1 // Small non-zero value
      }));
    }

    // ========================================
    // CASE 2: Min-max normalization
    // ========================================
    const rawScores = scores.map(s => s.rawScore);
    const minScore = Math.min(...rawScores);
    const maxScore = Math.max(...rawScores);
    const range = maxScore - minScore;

    console.log(`      Min: ${minScore.toFixed(2)}, Max: ${maxScore.toFixed(2)}`);

    if (range === 0) {
      // All scores are the same
      console.log(`      ⚠️  All scores equal - returning equal weights`);
      return scores.map(s => ({
        ...s,
        normalizedScore: 1.0
      }));
    }

    // Normalize to [0, 1]
    const normalized = scores.map(s => ({
      ...s,
      normalizedScore: (s.rawScore - minScore) / range
    }));

    console.log(`      ✅ Normalized scores range: 0.00 to 1.00`);

    return normalized;
  }

  // ============================================================================
  // GET NAME
  // ============================================================================
  // Returns strategy identifier

  getName() {
    return 'verified_skills_v1';
  }

  // ============================================================================
  // GET DESCRIPTION
  // ============================================================================
  // Human-readable description for UI

  getDescription() {
    return 'Prioritizes candidates with verified GitHub skills matching the required role';
  }

  // ============================================================================
  // GET VERSION
  // ============================================================================
  getVersion() {
    return '1.0.0';
  }
}

// ============================================================================
// EXPORT
// ============================================================================
module.exports = VerifiedSkillsMatcherV1;