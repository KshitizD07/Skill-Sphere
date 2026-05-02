import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Strategy: Activity Score Matcher V1
 *
 * Scores candidates based on recent platform engagement. Provides a signal
 * orthogonal to pure skill matching — active users are more likely to be
 * motivated, engaged squad members.
 *
 * Scoring weights (configurable):
 *  - Skill verification: 3.0
 *  - Skill update:       2.0
 *  - Squad application:  1.5
 *  - Post:              1.0
 *  - Other activity:    0.5
 *
 * Recency bonus: +20% if the user was active within the last 7 days.
 */
export default class ActivityScoreMatcherV1 {
  constructor(config = {}) {
    this.config = {
      recentDays:         config.recentDays         || 30,
      skillUpdateWeight:  config.skillUpdateWeight   || 2.0,
      verificationWeight: config.verificationWeight  || 3.0,
      postWeight:         config.postWeight          || 1.0,
      applicationWeight:  config.applicationWeight   || 1.5,
      ...config,
    };
  }

  /** Returns a raw activity score for one candidate. */
  async score(candidate) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.recentDays);

      const activities = await prisma.activityLog.findMany({
        where: { userId: candidate.id, createdAt: { gte: cutoffDate } },
      });

      if (activities.length === 0) return 0.1; // Very low but non-zero

      let score = 0;
      for (const activity of activities) {
        if      (activity.action === 'SKILLS_UPDATED' || activity.action === 'ACQUIRED_SKILL') score += this.config.skillUpdateWeight;
        else if (activity.action === 'VERIFIED_SKILL')         score += this.config.verificationWeight;
        else if (activity.action.includes('POST'))             score += this.config.postWeight;
        else if (activity.action === 'SQUAD_APPLICATION')      score += this.config.applicationWeight;
        else                                                   score += 0.5;
      }

      // Recency bonus — reward users who were active in the last week
      const mostRecent = activities.reduce((latest, a) => a.createdAt > latest.createdAt ? a : latest);
      const daysSince  = (Date.now() - mostRecent.createdAt.getTime()) / 86_400_000;
      if (daysSince < 7) score += score * 0.2;

      return score;
    } catch (error) {
      logger.warn('Activity strategy scoring error', { candidateId: candidate.id, err: error.message });
      return 0.1;
    }
  }

  /** Min-max normalisation → [0, 1]. */
  async normalize(scores) {
    if (scores.length === 0) return [];

    const allZero = scores.every((s) => s.rawScore < 0.2);
    if (allZero) return scores.map((s) => ({ ...s, normalizedScore: 0.5 }));

    const raw   = scores.map((s) => s.rawScore);
    const min   = Math.min(...raw);
    const max   = Math.max(...raw);
    const range = max - min;

    if (range === 0) return scores.map((s) => ({ ...s, normalizedScore: 1.0 }));

    return scores.map((s) => ({ ...s, normalizedScore: (s.rawScore - min) / range }));
  }

  getName()        { return 'activity_score_v1'; }
  getDescription() { return 'Prioritizes candidates with recent platform activity and engagement'; }
  getVersion()     { return '1.0.0'; }
}