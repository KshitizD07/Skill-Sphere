import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import API from '../api';

// Auth
const AuthPage = lazy(() => import('../features/auth/AuthPage'));

// Pages
const Landing = lazy(() => import('../pages/Landing'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const GlobalFeed = lazy(() => import('../pages/GlobalFeed'));
const RoadmapPage = lazy(() => import('../pages/Roadmap'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Features
const MyProfile = lazy(() => import('../features/profile/MyProfile'));
const UserProfile = lazy(() => import('../features/profile/UserProfile'));
const ChatInterface = lazy(() => import('../features/chat/ChatInterface'));
const MissionBoard = lazy(() => import('../features/squads/MissionBoard'));
const SquadDetail = lazy(() => import('../features/squads/SquadDetail'));
const SquadManage = lazy(() => import('../features/squads/SquadManage'));
const MyApplications = lazy(() => import('../features/squads/MyApplications'));
const SkillVerifier = lazy(() => import('../features/skills/SkillVerifier'));
const Network = lazy(() => import('../features/network/Network'));
const AntifragileAdmin = lazy(() => import('../features/admin/AntifragileAdmin'));

// Shared
import ProtectedRoute from '../shared/components/ProtectedRoute';

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-bg-base flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary/20 border-t-[#adc6ff] rounded-full animate-spin" />
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  // Rehydrate user from httpOnly cookie session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('ss_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // We wait for the server to verify the session so we don't flash the UI
    // with incomplete cached data (which lacks the 'github' field).
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
        localStorage.removeItem('ss_token');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try { await API.post('/auth/logout'); } catch { /* ignore */ }
    // Clear persisted auth data
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    setUser(null);
    // Replace the current entry with the landing page to prevent back‑navigation to a protected view
    window.location.replace('/');
  };

  // ── Quality Control Nuke ──────────────────────────────────────────────────
  // If user tries to bypass profile setup without linking GitHub, nuke account
  useEffect(() => {
    // Wait until auth is fully verified by the server AND we have a user
    if (!authChecked || !user) return;
    
    // We only enforce github once the profile has loaded completely from the server, 
    // avoiding the flash where cached user data might not have the github field.
    const publicPaths = ['/', '/auth', '/my-profile'];
    const path = location.pathname.replace(/\/$/, '') || '/';
    
    // Strict enforcement: github link is mandatory
    const hasGithub = user.github && user.github.trim() !== '';
    if (!hasGithub && !publicPaths.includes(path)) {
      console.warn('⚠️ Quality Control: GitHub not linked. Auto-deleting account...');
      
      const nuke = async () => {
        try {
          await API.delete('/users/me');
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
    <Suspense fallback={<PageLoader />}>
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
            <MyProfile user={user} onUserUpdate={setUser} />
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
    </Suspense>
  );
}

export default App;