import BaseAPI from '../../services/BaseAPI';

const SkillAPI = {
  getAllSkills: () => BaseAPI.get('/skills/list'),
  getRoles: () => BaseAPI.get('/skills/roles'),
  analyzeGap: (userId, roleId) =>
    BaseAPI.get(`/skills/analyze?userId=${userId}&roleId=${roleId}`),
  updateUserSkills: (userId, skillIds) =>
    BaseAPI.post('/skills/update', { userId, skillIds }),
  getMentors: (skillId) => BaseAPI.get(`/skills/mentors/${skillId}`),
  verifySkill: (userId, skillName, repoUrl, showLevel) =>
    BaseAPI.post('/verify/skill', { userId, skillName, repoUrl, showLevel }),
};

export default SkillAPI;