import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import API from '../api';

// Auth
import AuthPage from '../features/auth/AuthPage';

// Pages
import Landing from '../pages/Landing';
import Dashboard from '../pages/Dashboard';
import GlobalFeed from '../pages/GlobalFeed';
import RoadmapPage from '../pages/Roadmap';
import NotFound from '../pages/NotFound';

// Features
import MyProfile from '../features/profile/MyProfile';
import UserProfile from '../features/profile/UserProfile';
import ChatInterface from '../features/chat/ChatInterface';
import MissionBoard from '../features/squads/MissionBoard';
import SquadDetail from '../features/squads/SquadDetail';
import SquadManage from '../features/squads/SquadManage';
import MyApplications from '../features/squads/MyApplications';
import SkillVerifier from '../features/skills/SkillVerifier';
import Network from '../features/network/Network';
import AntifragileAdmin from '../features/admin/AntifragileAdmin';

// Shared
import ProtectedRoute from '../shared/components/ProtectedRoute';

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  // Rehydrate user from httpOnly cookie session on mount
  useEffect(() => {
    // First try localStorage cache for instant render
    const stored = localStorage.getItem('user_data');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore bad JSON */ }
    }

    // Then verify the cookie-based session with the server
    API.get('/auth/verify')
      .then((res) => {
        const serverUser = res.data.user;
        setUser(serverUser);
        localStorage.setItem('user_data', JSON.stringify(serverUser));
      })
      .catch(() => {
        // Cookie invalid or expired — clear stale data
        setUser(null);
        localStorage.removeItem('user_data');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try { await API.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('user_data');
    setUser(null);
  };

  // ── Quality Control Nuke ──────────────────────────────────────────────────
  // If user tries to bypass profile setup without linking GitHub, nuke account
  useEffect(() => {
    if (!authChecked || !user) return;
    
    const publicPaths = ['/', '/auth', '/my-profile'];
    const path = location.pathname;
    
    // Strict enforcement: github link is mandatory
    if (!user.github && !publicPaths.includes(path)) {
      console.warn('⚠️ Quality Control: GitHub not linked. Auto-deleting account...');
      
      const nuke = async () => {
        try {
          await API.delete('/api/users/me');
          localStorage.removeItem('user_data');
          setUser(null);
          window.location.href = '/auth?reason=github_required';
        } catch (err) {
          console.error('Failed to nuke account:', err);
          handleLogout();
        }
      };
      
      nuke();
    }
  }, [user, authChecked, location.pathname]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />

      {/* Protected routes — require auth */}
      <Route path="/dashboard" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <Dashboard user={user} onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/my-profile" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <MyProfile onUserUpdate={setUser} />
        </ProtectedRoute>
      } />
      <Route path="/profile/:id" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <UserProfile />
        </ProtectedRoute>
      } />
      <Route path="/chat/:id" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <ChatInterface />
        </ProtectedRoute>
      } />
      <Route path="/grid" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <GlobalFeed />
        </ProtectedRoute>
      } />
      <Route path="/network" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <Network />
        </ProtectedRoute>
      } />
      <Route path="/roadmap/:skill/:role" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <RoadmapPage />
        </ProtectedRoute>
      } />
      <Route path="/nexus" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <MissionBoard />
        </ProtectedRoute>
      } />
      <Route path="/squad/:id" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <SquadDetail />
        </ProtectedRoute>
      } />
      <Route path="/squad/:id/manage" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <SquadManage />
        </ProtectedRoute>
      } />
      <Route path="/my-squads" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <MyApplications />
        </ProtectedRoute>
      } />
      <Route path="/verify-skill" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <SkillVerifier />
        </ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/antifragile-admin" element={
        <ProtectedRoute user={user} authChecked={authChecked}>
          <AntifragileAdmin />
        </ProtectedRoute>
      } />

      {/* 404 — must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;