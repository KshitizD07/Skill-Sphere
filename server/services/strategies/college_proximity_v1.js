import logger from '../../utils/logger.js';

/**
 * Strategy: College Proximity Matcher V1
 *
 * Prefers candidates from the same college as the squad leader.
 * This provides a diversity-orthogonal signal — students from the same
 * institution may have better communication/scheduling overlap.
 *
 * Runs in SHADOW mode by default for data collection before promotion.
 */
export default class CollegeProximityMatcherV1 {
  constructor(config = {}) {
    this.config = {
      sameCollegeBonus:   config.sameCollegeBonus   || 5.0,
      nearbyCollegeBonus: config.nearbyCollegeBonus || 2.0,
      ...config,
    };
  }

  /**
   * Scores a candidate based on college proximity to squad leader.
   * Same college → high bonus. Different/missing → baseline.
   */
  async score(candidate, slot, squad) {
    try {
      const leaderCollege = squad.leader?.college;

      if (!leaderCollege || !candidate.college) return 1.0; // Neutral baseline

      if (candidate.college.toLowerCase() === leaderCollege.toLowerCase()) {
        return this.config.sameCollegeBonus;
      }

      // Future: Add nearby-college lookup (same city, same university system)
      return 1.0; // Baseline for different colleges
    } catch (error) {
      logger.warn('College proximity scoring error', {
        candidateId: candidate.id,
        err: error.message,
      });
      return 1.0;
    }
  }

  /** Min-max normalisation → [0, 1]. */
  async normalize(scores) {
    if (scores.length === 0) return [];

    const allSame = scores.every((s) => s.rawScore === scores[0].rawScore);
    if (allSame) return scores.map((s) => ({ ...s, normalizedScore: 0.5 }));

    const raw   = scores.map((s) => s.rawScore);
    const min   = Math.min(...raw);
    const max   = Math.max(...raw);
    const range = max - min;

    if (range === 0) return scores.map((s) => ({ ...s, normalizedScore: 0.5 }));

    return scores.map((s) => ({ ...s, normalizedScore: (s.rawScore - min) / range }));
  }

  getName()        { return 'college_proximity_v1'; }
  getDescription() { return 'Prefers candidates from the same college as the squad leader'; }
  getVersion()     { return '1.0.0'; }
}
