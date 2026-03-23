// ============================================================================
// STRATEGY: ACTIVITY SCORE MATCHER V1
// ============================================================================
//
// Name: activity_score_v1
// Description: Prioritizes candidates with recent platform activity
//
// Philosophy:
// - Active users = engaged users
// - Recent activity = current interest
// - Diversifies from pure skill matching
//
// This provides a DIFFERENT signal than verified skills
//
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ActivityScoreMatcherV1 {

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  constructor(config = {}) {
    this.config = {
      recentDays: config.recentDays || 30,           // Look at last 30 days
      skillUpdateWeight: config.skillUpdateWeight || 2.0,  // Weight for skill updates
      verificationWeight: config.verificationWeight || 3.0, // Weight for verifications
      postWeight: config.postWeight || 1.0,           // Weight for posts
      applicationWeight: config.applicationWeight || 1.5,   // Weight for applications
      ...config
    };

    console.log(`📊 ActivityScoreMatcherV1 initialized with config:`, this.config);
  }

  // ============================================================================
  // SCORE METHOD
  // ============================================================================
  //
  // Scores based on recent platform activity
  //
  // Activity Types:
  // - Skill updates
  // - Skill verifications
  // - Posts created
  // - Applications submitted
  // - Profile updates

  async score(candidate, slot, squad) {
    console.log(`   📊 Scoring activity for candidate ${candidate.id}`);

    try {
      // ========================================
      // Calculate cutoff date
      // ========================================
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.recentDays);

      // ========================================
      // Query recent activity
      // ========================================
      const activities = await prisma.activityLog.findMany({
        where: {
          userId: candidate.id,
          createdAt: { gte: cutoffDate }
        }
      });

      console.log(`      📋 Found ${activities.length} activities in last ${this.config.recentDays} days`);

      // ========================================
      // Calculate weighted score
      // ========================================
      let score = 0;

      // Count each activity type
      const activityCounts = {
        skillUpdates: 0,
        verifications: 0,
        posts: 0,
        applications: 0,
        other: 0
      };

      activities.forEach(activity => {
        if (activity.action === 'SKILLS_UPDATED' || activity.action === 'ACQUIRED_SKILL') {
          activityCounts.skillUpdates++;
          score += this.config.skillUpdateWeight;
        } else if (activity.action === 'VERIFIED_SKILL') {
          activityCounts.verifications++;
          score += this.config.verificationWeight;
        } else if (activity.action.includes('POST')) {
          activityCounts.posts++;
          score += this.config.postWeight;
        } else if (activity.action === 'SQUAD_APPLICATION') {
          activityCounts.applications++;
          score += this.config.applicationWeight;
        } else {
          activityCounts.other++;
          score += 0.5; // Small weight for other activities
        }
      });

      console.log(`      Activity breakdown:`, activityCounts);

      // ========================================
      // Recency bonus
      // ========================================
      // More recent activity = higher bonus
      if (activities.length > 0) {
        const mostRecentActivity = activities.reduce((latest, current) => 
          current.createdAt > latest.createdAt ? current : latest
        );

        const daysSinceActivity = (Date.now() - mostRecentActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceActivity < 7) {
          const recencyBonus = score * 0.2; // 20% bonus for activity in last week
          score += recencyBonus;
          console.log(`      🔥 Recency bonus: +${recencyBonus.toFixed(2)} (active in last ${daysSinceActivity.toFixed(0)} days)`);
        }
      }

      // ========================================
      // No activity penalty
      // ========================================
      if (activities.length === 0) {
        console.log(`      ❌ No recent activity`);
        return 0.1; // Very low but non-zero
      }

      console.log(`      ✅ Final activity score: ${score.toFixed(2)}`);

      return score;

    } catch (error) {
      console.error(`      ❌ Error calculating activity score:`, error.message);
      return 0.1; // Fallback to low score on error
    }
  }

  // ============================================================================
  // NORMALIZE METHOD
  // ============================================================================
  //
  // Same normalization as other strategies
  // Min-max scaling to [0, 1]

  async normalize(scores) {
    console.log(`   📐 Normalizing ${scores.length} activity scores...`);

    if (scores.length === 0) return [];

    const rawScores = scores.map(s => s.rawScore);
    const minScore = Math.min(...rawScores);
    const maxScore = Math.max(...rawScores);
    const range = maxScore - minScore;

    console.log(`      Min: ${minScore.toFixed(2)}, Max: ${maxScore.toFixed(2)}`);

    // Handle edge cases
    if (range === 0) {
      return scores.map(s => ({
        ...s,
        normalizedScore: 1.0
      }));
    }

    const allZero = scores.every(s => s.rawScore < 0.2);
    if (allZero) {
      console.log(`      ⚠️  All candidates inactive - equal weights`);
      return scores.map(s => ({
        ...s,
        normalizedScore: 0.5
      }));
    }

    // Normalize
    const normalized = scores.map(s => ({
      ...s,
      normalizedScore: (s.rawScore - minScore) / range
    }));

    console.log(`      ✅ Normalized activity scores range: 0.00 to 1.00`);

    return normalized;
  }

  // ============================================================================
  // METADATA
  // ============================================================================

  getName() {
    return 'activity_score_v1';
  }

  getDescription() {
    return 'Prioritizes candidates with recent platform activity and engagement';
  }

  getVersion() {
    return '1.0.0';
  }
}

// ============================================================================
// EXPORT
// ============================================================================
module.exports = ActivityScoreMatcherV1;