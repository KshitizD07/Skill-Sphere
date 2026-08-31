import { getVerifiedSkillProfile } from '../verifiedSkillProfile.js';
import { calculateCompatibility } from '../skillCompatibility.js';

/**
 * Strategy: Verified Skills Matcher V1
 *
 * Prioritises candidates with verified skills matching the required and preferred role skills.
 * Uses N.E.X.U.S. source-agnostic verified skill profiles and role-specific compatibility scoring.
 */
export default class VerifiedSkillsMatcherV1 {
  constructor(config = {}) {
    this.config = {
      verifiedBonus:     config.verifiedBonus     || 0.3,
      minScoreThreshold: config.minScoreThreshold || 0,
      exactMatchBonus:   config.exactMatchBonus   || 0.2,
      ...config,
    };
  }

  /**
   * Scores a single candidate for a specific slot using N.E.X.U.S. skill compatibility.
   */
  async score(candidate, slot) {
    const preferredSkills = slot.preferredSkills || [];
    const requiredSkill = slot.requiredSkill || null;

    if (preferredSkills.length === 0 && !requiredSkill) {
      return 5.0; // Neutral score for open roles
    }

    // Get source-agnostic verified skill profile for candidate
    const profile = await getVerifiedSkillProfile(candidate.id || candidate.userId);
    const { compatibilityScore } = calculateCompatibility(profile, preferredSkills, requiredSkill);

    // Scale 0-100 compatibility score to 0-15 strategy scale
    const rawScore = (compatibilityScore / 100) * 15;
    return Math.min(rawScore, 15);
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