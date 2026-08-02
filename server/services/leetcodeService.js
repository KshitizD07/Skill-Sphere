import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import { sendNotification } from '../utils/notify.js';

const prisma = new PrismaClient();

// Normalization for languages in LeetCode GraphQL response
const LANGUAGE_MAP = {
  javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  python: 'Python', python3: 'Python', py: 'Python',
  java: 'Java',
  go: 'Go', golang: 'Go',
  rust: 'Rust',
  cpp: 'C++', 'c++': 'C++',
  c: 'C',
  ruby: 'Ruby', rb: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  csharp: 'C#', 'c#': 'C#',
};

export async function verifyLeetCodeSkill({ userId, skillName, username, showLevel }) {
  const normalizedSkill = LANGUAGE_MAP[skillName.toLowerCase()] || skillName;

  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        languageProblemCount {
          languageName
          problemsSolved
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  let data;
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { username } }),
    });

    if (!res.ok) {
      throw ApiError.internal('Failed to fetch data from LeetCode');
    }
    
    const responseData = await res.json();
    if (responseData.errors) {
      throw ApiError.badRequest(responseData.errors[0].message || 'LeetCode user not found');
    }
    
    data = responseData.data;
  } catch (error) {
    logger.error('LeetCode API Error', { err: error.message });
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Failed to communicate with LeetCode');
  }

  if (!data || !data.matchedUser) {
    throw ApiError.notFound('LeetCode user not found');
  }

  // Guard against re-verifying the same LeetCode profile for the same skill
  const existing = await prisma.skill.findFirst({ 
    where: { userId, name: normalizedSkill, verificationSource: 'LEETCODE' } 
  });
  if (existing) throw ApiError.conflict('This LeetCode profile is already verified for this skill');

  let score;
  let breakdownMsg;
  
  // Check if we are verifying "Data Structures & Algorithms" or a specific Language
  if (normalizedSkill.toLowerCase().includes('data structure') || normalizedSkill.toLowerCase().includes('algorithm')) {
    const stats = data.matchedUser.submitStats.acSubmissionNum;
    const easy = stats.find(s => s.difficulty === 'Easy')?.count || 0;
    const medium = stats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hard = stats.find(s => s.difficulty === 'Hard')?.count || 0;
    
    const totalPoints = (easy * 1) + (medium * 3) + (hard * 5);
    
    if (totalPoints >= 1000) score = 10;
    else if (totalPoints >= 700) score = 9;
    else if (totalPoints >= 500) score = 8;
    else if (totalPoints >= 300) score = 7;
    else if (totalPoints >= 150) score = 6;
    else if (totalPoints >= 75) score = 5;
    else if (totalPoints >= 30) score = 4;
    else if (totalPoints >= 10) score = 3;
    else if (totalPoints >= 1) score = 2;
    else score = 1;

    breakdownMsg = `Based on LeetCode submissions: ${easy} Easy, ${medium} Medium, ${hard} Hard (Score: ${score}/10).`;
  } else {
    // Verifying specific language
    const languages = data.matchedUser.languageProblemCount;
    const targetLang = languages.find(l => {
      const leetLang = LANGUAGE_MAP[l.languageName.toLowerCase()] || l.languageName;
      return leetLang.toLowerCase() === normalizedSkill.toLowerCase();
    });

    if (!targetLang) {
      score = 0;
      breakdownMsg = `No LeetCode problems solved using ${normalizedSkill}.`;
    } else {
      const solved = targetLang.problemsSolved;
      if (solved >= 300) score = 10;
      else if (solved >= 200) score = 9;
      else if (solved >= 100) score = 8;
      else if (solved >= 50) score = 7;
      else if (solved >= 25) score = 6;
      else if (solved >= 10) score = 5;
      else if (solved >= 5) score = 4;
      else if (solved >= 1) score = 3;
      else score = 1;
      
      breakdownMsg = `Solved ${solved} LeetCode problems using ${normalizedSkill} (Score: ${score}/10).`;
    }
  }

  const level = score >= 8 ? 'Advanced' : score >= 5 ? 'Intermediate' : score > 0 ? 'Beginner' : 'Absolute Beginner';
  const verificationUrl = `https://leetcode.com/u/${username}/`;

  const skill = await prisma.skill.upsert({
    where:  { userId_name: { userId, name: normalizedSkill } },
    update: { 
      isVerified: true, 
      verificationUrl, 
      verificationSource: 'LEETCODE',
      verifiedAt: new Date(), 
      calculatedScore: score, 
      showLevel: !!showLevel, 
      level 
    },
    create: { 
      userId, 
      name: normalizedSkill, 
      level, 
      isVerified: true, 
      verificationUrl, 
      verificationSource: 'LEETCODE',
      verifiedAt: new Date(), 
      calculatedScore: score, 
      showLevel: !!showLevel 
    },
  });

  await prisma.activityLog.create({
    data: { userId, action: 'VERIFIED_SKILL', details: `LeetCode verified: ${normalizedSkill} (${score}/10)` },
  });

  await sendNotification(
    userId,
    'SKILL_VERIFIED',
    'Skill Verified',
    `Your LeetCode profile for ${normalizedSkill} was successfully verified. You achieved a score of ${score}/10.`
  );

  logger.info('Skill verified via LeetCode', { userId, skill: normalizedSkill, score, username });

  return {
    success: true,
    score,
    skill,
    breakdown: {
      reasoning: breakdownMsg,
      source: 'LeetCode GraphQL',
    },
  };
}
