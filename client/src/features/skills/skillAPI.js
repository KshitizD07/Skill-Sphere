import BaseAPI from '../../services/BaseAPI';

const SkillAPI = {
  getAllSkills: () => BaseAPI.get('/skills/list'),
  getRoles: () => BaseAPI.get('/skills/roles'),
  analyzeGap: (userId, roleId, forceRegenerate = false) =>
    BaseAPI.get(`/skills/analyze?userId=${userId}&roleId=${roleId}${forceRegenerate ? '&forceRegenerate=true' : ''}`),
  updateUserSkills: (userId, skillIds) =>
    BaseAPI.post('/skills/update', { userId, skillIds }),
  getMentors: (skillId) => BaseAPI.get(`/skills/mentors/${skillId}`),
  verifySkill: (userId, skillName, repoUrl, showLevel) =>
    BaseAPI.post('/verify/skill', { userId, skillName, repoUrl, showLevel }),
  verifyLeetCodeSkill: (userId, skillName, username, showLevel) =>
    BaseAPI.post('/verify/leetcode', { userId, skillName, username, showLevel }),
  verifySkillManual: (skillId, verificationUrl, source) =>
    BaseAPI.patch(`/users/me/skills/${skillId}`, { verificationUrl, source }),
};

export default SkillAPI;