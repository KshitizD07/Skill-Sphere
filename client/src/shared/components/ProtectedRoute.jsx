import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, user, authChecked }) {
  const location = useLocation();

  // Still verifying session with server — show nothing to prevent flash
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-[#adc6ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}