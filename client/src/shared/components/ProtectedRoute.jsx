import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user_data');
  const location = useLocation();

  if (!token || !user) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}