import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import API from '../api';

// Auth
const AuthPage = lazy(() => import('../features/auth/AuthPage'));

// Pages
const Landing = lazy(() => import('../pages/Landing'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const GlobalFeed = lazy(() => import('../pages/GlobalFeed'));
const RoadmapPage = lazy(() => import('../pages/Roadmap'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
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
const AdminDashboard = lazy(() => import('../features/admin/AdminDashboard'));

// Shared
import ProtectedRoute from '../shared/components/ProtectedRoute';
import { useAdminInactivityTimer } from '../shared/hooks/useAdminInactivityTimer';
import { useToast, ToastContainer } from '../shared/components/Toast';

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
  const toast = useToast();

  // Enforce 15-minute rolling inactivity demotion for elevated admins
  useAdminInactivityTimer(user, (updatedUser) => setUser(updatedUser), toast);

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

  // ── Strict Quality Control: Mandatory GitHub Account ─────────────────────────
  // Automatically purge accounts attempting to access the platform without linking GitHub
  useEffect(() => {
    if (!authChecked || !user) return;

    const publicPaths = ['/', '/auth', '/my-profile'];
    const path = location.pathname.replace(/\/$/, '') || '/';
    const isPublic = publicPaths.includes(path) || path.startsWith('/roadmap/shared');
    const hasGithub = user.github && user.github.trim() !== '';

    if (!hasGithub && !isPublic) {
      console.warn('⚠️ Quality Control: GitHub account not linked. Purging account...');

      const purgeAccount = async () => {
        try {
          await API.delete('/users/me');
        } catch (err) {
          console.error('Failed to execute account purge:', err);
        } finally {
          localStorage.removeItem('user_data');
          localStorage.removeItem('ss_token');
          setUser(null);
          window.location.replace('/auth?reason=github_required');
        }
      };

      purgeAccount();
    }
  }, [user, authChecked, location.pathname]);

  return (
    <Suspense fallback={<PageLoader />}>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
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
        <Route path="/chat" element={
          <ProtectedRoute user={user} authChecked={authChecked}>
            <ChatInterface />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute user={user} authChecked={authChecked}>
            <NotificationsPage />
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
        <Route path="/roadmap/:id" element={
          <ProtectedRoute user={user} authChecked={authChecked}>
            <RoadmapPage />
          </ProtectedRoute>
        } />
        <Route path="/roadmap/shared/:token" element={<RoadmapPage />} />
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
        <Route path="/admin" element={
          <ProtectedRoute user={user} authChecked={authChecked}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/antifragile-admin" element={
          <ProtectedRoute user={user} authChecked={authChecked}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* 404 — must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;