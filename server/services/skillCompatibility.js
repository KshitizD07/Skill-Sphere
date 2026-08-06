/**
 * Skill Compatibility Calculator for N.E.X.U.S.
 * 
 * Computes role-specific compatibility between an applicant's generic verified skill profile 
 * and a mission slot's preferred/required skills.
 */

/**
 * Calculates compatibility score and breakdown for an applicant against a slot's requirements.
 * 
 * @param {{ userId: string, skills: Array<{ name: string, score: number, sources: string[] }> }} applicantProfile 
 * @param {string[]} rolePreferredSkills List of preferred skill names for the slot
 * @param {string} [requiredSkill] Optional primary required skill
 * @returns {{ compatibilityScore: number, matchedSkills: Array<{ name: string, score: number }>, missingSkills: string[] }}
 */
export const calculateCompatibility = (applicantProfile, rolePreferredSkills = [], requiredSkill = null) => {
  const verifiedSkills = applicantProfile?.skills || [];
  
  // Combine requiredSkill with rolePreferredSkills if provided and not already present
  const targetSkills = [...rolePreferredSkills];
  if (requiredSkill && !targetSkills.some(s => s.toLowerCase() === requiredSkill.toLowerCase())) {
    targetSkills.unshift(requiredSkill);
  }

  // If no skills specified at all, return default neutral compatibility
  if (targetSkills.length === 0) {
    return {
      compatibilityScore: 50,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  // Create lookup map of applicant's verified skills
  const verifiedMap = new Map();
  for (const s of verifiedSkills) {
    verifiedMap.set(s.name.trim().toLowerCase(), s);
  }

  const matchedSkills = [];
  const missingSkills = [];
  let totalMatchedScore = 0;

  for (const targetSkill of targetSkills) {
    const key = targetSkill.trim().toLowerCase();
    if (verifiedMap.has(key)) {
      const matched = verifiedMap.get(key);
      matchedSkills.push({
        name: matched.name,
        score: matched.score,
      });
      totalMatchedScore += matched.score;
    } else {
      missingSkills.push(targetSkill);
    }
  }

  const matchRatio = matchedSkills.length / targetSkills.length;
  const avgProficiency = matchedSkills.length > 0 ? totalMatchedScore / matchedSkills.length : 0;

  // Formula: 60% weight on covering preferred skills, 40% weight on proficiency in matched skills
  const rawScore = (matchRatio * 0.6) + ((avgProficiency / 100) * 0.4);
  const compatibilityScore = Math.min(100, Math.max(0, Math.round(rawScore * 100)));

  return {
    compatibilityScore,
    matchedSkills,
    missingSkills,
  };
};
