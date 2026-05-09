export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://earnest-alignment-production-b724.up.railway.app/api';
export const SOCKET_URL   = import.meta.env.VITE_SOCKET_URL || 'https://earnest-alignment-production-b724.up.railway.app';

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