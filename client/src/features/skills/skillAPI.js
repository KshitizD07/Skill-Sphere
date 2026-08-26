import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const SkillAPI = {
  // --- Skills Catalogue & Roles ---
  getAllSkills: () => BaseAPI.get('/skills/list'),
  getRoles: () => BaseAPI.get('/skills/roles'),
  
  // --- User Skills Management ---
  getMySkills: async () => unwrap(await BaseAPI.get('/skills')),
  addSkill: async ({ name, level, showLevel }) => unwrap(await BaseAPI.post('/skills', { name, level, showLevel })),
  deleteSkill: async (skillId) => BaseAPI.delete(`/skills/${skillId}`),
  getLeaderboard: async (skillName, limit = 10) => unwrap(await BaseAPI.get(`/skills/leaderboard?skill=${encodeURIComponent(skillName)}&limit=${limit}`)),

  // --- Skill Gap & Mentors ---
  analyzeGap: (userId, roleId, forceRegenerate = false) =>
    BaseAPI.get(`/skills/analyze?userId=${userId}&roleId=${roleId}${forceRegenerate ? '&forceRegenerate=true' : ''}`),
  updateUserSkills: (userId, skillIds) =>
    BaseAPI.post('/skills/update', { userId, skillIds }),
  getMentors: (skillId) => BaseAPI.get(`/skills/mentors/${skillId}`),

  // --- GitHub Skill Verification ---
  verifySkill: async (userId, skillName, repoUrl, showLevel = true, force = false) =>
    BaseAPI.post('/verify/skill', { userId, skillName, repoUrl, showLevel, force }),
  batchVerify: async () => BaseAPI.post('/verify/batch', {}),
  checkCooldown: async (skillName) => unwrap(await BaseAPI.get(`/verify/cooldown/${encodeURIComponent(skillName)}`)),

  // --- Manual & LeetCode Verification ---
  verifySkillManual: (skillId, verificationUrl, source) =>
    BaseAPI.patch(`/users/me/skills/${skillId}`, { verificationUrl, source }),
  verifyLeetCodeSkill: (userId, skillName, username, showLevel) =>
    BaseAPI.post('/verify/leetcode', { userId, skillName, username, showLevel }),
  scanLeetCode: (username) =>
    BaseAPI.post('/verify/leetcode-scan', { username }),
  bulkVerifyLeetCode: (userId, username, skills, showLevel) =>
    BaseAPI.post('/verify/leetcode-bulk', { userId, username, skills, showLevel }),

  // --- LeetCode Profile Card Sync ---
  syncLeetCodeProfile: (username) =>
    BaseAPI.post('/verify/leetcode-profile-sync', { username }),
  getLeetCodeProfile: (userId) =>
    BaseAPI.get(`/verify/leetcode-profile/${userId}`),
  unlinkLeetCode: () =>
    BaseAPI.delete('/verify/leetcode-profile'),
};

export default SkillAPI;
