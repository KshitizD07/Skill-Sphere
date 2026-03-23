export const API_BASE_URL="http://localhost:5001/api";
export const APP_VERSION= '1.0.0';
export const APP_NAME='SKILLSPHERE';

export const SKILL_LEVELS={
    BEGINNER:'Beginner',
    INTERMEDIATE:'Intermediate',
    ADVANCED:'Advanced',
};

export const USER_ROLES={
    STUDENT:'Student',
    ALUMNI:'Alumni',
    ADMIN:'Admin',
};

export const ROUTES={
HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  MY_PROFILE: '/my-profile',
  PROFILE: '/profile/:id',
  CHAT: '/chat/:id',
  FEED: '/grid',
  NETWORK: '/network',
  ROADMAP: '/roadmap/:skill/:role',
  NEXUS: '/nexus',
  SQUAD: '/squad/:id',
  SQUAD_MANAGE: '/squad/:id/manage',
  VERIFY_SKILL: '/verify-skill',
  ADMIN: '/antifragile-admin',
};