import logger from '../../utils/logger.js';

/**
 * Strategy: Verified Skills Matcher V1
 *
 * Prioritises candidates with verified GitHub skills matching the required role.
 * Exact match > partial match. The score directly correlates with the
 * GitHub verification strength (calculatedScore).
 *
 * This effectively mirrors the core Gatekeeper rules, but runs as a competing strategy.
 */
export default class VerifiedSkillsMatcherV1 {
  constructor(config = {}) {
    this.config = {
      verifiedBonus:     config.verifiedBonus     || 0.3, // +30% for verified skills
      minScoreThreshold: config.minScoreThreshold || 0,
      exactMatchBonus:   config.exactMatchBonus   || 0.2, // +20% for exact skill match
      ...config,
    };
  }

  /**
   * Scores a single candidate for a specific slot.
   * Logic: Base score (0-10) + verified bonus + exact match bonus.
   */
  async score(candidate, slot) {
    if (!slot.requiredSkill) return 5.0; // Neutral score for open roles

    const reqSkill = slot.requiredSkill.toLowerCase();
    const match    = candidate.skills.find((s) => s.name.toLowerCase() === reqSkill);

    if (!match) return 0.0;

    let score = match.calculatedScore || 0;
    if (match.isVerified)                                score += score * this.config.verifiedBonus;
    if (match.name.toLowerCase() === reqSkill) score += score * this.config.exactMatchBonus;

    return Math.min(score, 15); // Cap at 15
  }

  /** Min-max normalisation → [0, 1]. */
  async normalize(scores) {
    if (scores.length === 0) return [];

    const allZero = scores.every((s) => s.rawScore === 0);
    if (allZero) return scores.map((s) => ({ ...s, normalizedScore: 0.1 })); // Small non-zero weight

    const raw   = scores.map((s) => s.rawScore);
    const min   = Math.min(...raw);
    const max   = Math.max(...raw);
    const range = max - min;

    if (range === 0) return scores.map((s) => ({ ...s, normalizedScore: 1.0 }));

    return scores.map((s) => ({ ...s, normalizedScore: (s.rawScore - min) / range }));
  }

  getName()        { return 'verified_skills_v1'; }
  getDescription() { return 'Prioritizes candidates with verified GitHub skills matching the required role'; }
  getVersion()     { return '1.0.0'; }
}