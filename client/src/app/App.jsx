import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
import SkillVerifier from '../features/skills/SkillVerifier';
import Network from '../features/network/Network';
import AntifragileAdmin from '../features/admin/AntifragileAdmin';

// Shared
import ProtectedRoute from '../shared/components/ProtectedRoute';

function App() {
  const [user, setUser] = useState(null);

  // Rehydrate user from localStorage on mount — fixes refresh logout
  useEffect(() => {
    const stored = localStorage.getItem('user_data');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage onLogin={setUser} />} />

        {/* Protected routes — require auth */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/my-profile" element={
          <ProtectedRoute>
            <MyProfile />
          </ProtectedRoute>
        } />
        <Route path="/profile/:id" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        <Route path="/chat/:id" element={
          <ProtectedRoute>
            <ChatInterface />
          </ProtectedRoute>
        } />
        <Route path="/grid" element={
          <ProtectedRoute>
            <GlobalFeed />
          </ProtectedRoute>
        } />
        <Route path="/network" element={
          <ProtectedRoute>
            <Network />
          </ProtectedRoute>
        } />
        <Route path="/roadmap/:skill/:role" element={
          <ProtectedRoute>
            <RoadmapPage />
          </ProtectedRoute>
        } />
        <Route path="/nexus" element={
          <ProtectedRoute>
            <MissionBoard />
          </ProtectedRoute>
        } />
        <Route path="/squad/:id" element={
          <ProtectedRoute>
            <SquadDetail />
          </ProtectedRoute>
        } />
        <Route path="/squad/:id/manage" element={
          <ProtectedRoute>
            <SquadManage />
          </ProtectedRoute>
        } />
        <Route path="/verify-skill" element={
          <ProtectedRoute>
            <SkillVerifier />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/antifragile-admin" element={
          <ProtectedRoute>
            <AntifragileAdmin />
          </ProtectedRoute>
        } />

        {/* 404 — must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;