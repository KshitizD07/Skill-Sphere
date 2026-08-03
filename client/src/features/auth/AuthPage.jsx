import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, X, Github } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';

export default function AuthPage() {
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    // Check for reason or error in URL
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'github_required') {
      setError('Account deleted: Linking GitHub is mandatory to ensure quality profiles. Please register again and link your GitHub.');
    } else if (params.get('error')) {
      const err = params.get('error');
      if (err === 'OAuthCodeMissing') setError('OAuth login failed: Missing authorization code.');
      else if (err === 'GoogleOAuthFailed') setError('Google login failed. Please try again.');
      else if (err === 'GithubOAuthFailed') setError('GitHub login failed. Please try again.');
      else if (err === 'EmailMissing') setError('Failed to retrieve email from your account.');
      else setError('OAuth authentication failed. Please try again.');
    } else {
      setError('');
    }
  }, [location]);

  const cardBase = "min-h-screen bg-bg-base flex items-center justify-center p-4 font-outfit";
  const panelBase = "bg-surface border border-outline-var/30 rounded-md p-8 w-full max-w-md shadow-2xl shadow-bg-base/80";

  return (
    <div className={cardBase}>
      <div className={panelBase}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-md flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight mb-1">
            Sign In to SkillSphere
          </h1>
          <p className="text-outline text-sm">
            Access your professional network and portfolio grid.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-error-container/15 border border-error-container/40 text-error text-xs flex items-start gap-2 rounded-xs">
            <X size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <a href={`${API_BASE_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-surface-high border border-outline-var/40 hover:border-primary/50 rounded-xs text-sm font-syne font-bold text-text-primary transition-all shadow-sm hover:shadow-primary/10">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
          <a href={`${API_BASE_URL}/auth/github`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-surface-high border border-outline-var/40 hover:border-primary/50 rounded-xs text-sm font-syne font-bold text-text-primary transition-all shadow-sm hover:shadow-primary/10">
            <Github size={18} />
            Continue with GitHub
          </a>
        </div>
      </div>
    </div>
  );
}