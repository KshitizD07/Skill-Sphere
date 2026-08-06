import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Retrieves a generic, source-agnostic Verified Skill Profile for a given user.
 * Combines verified skills from the Skill model (GitHub, Credential, Manual) 
 * and persistent LeetCode stats, producing a unified skill map.
 * 
 * N.E.X.U.S. consumes this profile without being coupled to specific verification services.
 * 
 * @param {string} userId
 * @returns {Promise<{ userId: string, skills: Array<{ name: string, score: number, sources: string[] }> }>}
 */
export const getVerifiedSkillProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      skills: {
        where: { isVerified: true },
        select: {
          name: true,
          calculatedScore: true,
          level: true,
          verificationSource: true,
        },
      },
      leetcodeLanguages: true,
    },
  });

  if (!user) {
    return { userId, skills: [] };
  }

  const skillMap = new Map();

  // 1. Process verified skills from Skill table
  for (const skill of user.skills) {
    const key = skill.name.trim().toLowerCase();
    const score = skill.calculatedScore || (
      skill.level === 'Advanced' ? 90 :
      skill.level === 'Intermediate' ? 70 : 50
    );
    const source = skill.verificationSource || 'UNKNOWN';

    if (!skillMap.has(key)) {
      skillMap.set(key, {
        name: skill.name,
        score,
        sources: [source],
      });
    } else {
      const existing = skillMap.get(key);
      existing.score = Math.max(existing.score, score);
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
    }
  }

  // 2. Process LeetCode language data if available
  if (user.leetcodeLanguages && Array.isArray(user.leetcodeLanguages)) {
    for (const lang of user.leetcodeLanguages) {
      if (!lang.name) continue;
      const key = lang.name.trim().toLowerCase();
      const score = lang.score || (lang.problemsSolved ? Math.min(100, lang.problemsSolved * 5) : 60);
      const source = 'LEETCODE';

      if (!skillMap.has(key)) {
        skillMap.set(key, {
          name: lang.name,
          score,
          sources: [source],
        });
      } else {
        const existing = skillMap.get(key);
        existing.score = Math.max(existing.score, score);
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
      }
    }
  }

  return {
    userId,
    skills: Array.from(skillMap.values()),
  };
};
