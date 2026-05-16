import BaseAPI from '../../services/BaseAPI';

const SquadAPI = {
  getFeed: (params) => BaseAPI.get('/squads/feed', params),
  getSquad: (squadId) => BaseAPI.get(`/squads/${squadId}`),
  createSquad: (data) => BaseAPI.post('/squads', data),
  applyToSquad: (squadId, message, slotId) =>
    BaseAPI.post(`/squads/${squadId}/apply`, { message, slotId }),
  getMyApplications: () => BaseAPI.get('/squads/my-applications'),
  getMySquads: () => BaseAPI.get('/squads/my-squads'),
  updateApplicationStatus: (squadId, applicationId, status) =>
    BaseAPI.patch(`/squads/${squadId}/applications/${applicationId}`, { status }),
  checkQualification: (squadId, userId) =>
    BaseAPI.get(`/squads/${squadId}/qualify?userId=${userId}`),
};

export default SquadAPI;