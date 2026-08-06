import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, X, Github, GraduationCap, Briefcase, Building } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';

export default function AuthPage() {
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState('STUDENT'); // STUDENT, PROFESSIONAL
  const [recruiterNotice, setRecruiterNotice] = useState(false);

  // Derive error message directly from URL search params during render
  const params = new URLSearchParams(location.search);
  const reasonParam = params.get('reason');
  const errorParam = params.get('error');

  let error = '';
  if (reasonParam === 'github_required') {
    error = 'Account deleted: Linking GitHub is mandatory to ensure quality profiles. Please register again and link your GitHub.';
  } else if (errorParam) {
    if (errorParam === 'OAuthCodeMissing') error = 'OAuth login failed: Missing authorization code.';
    else if (errorParam === 'GoogleOAuthFailed') error = 'Google login failed. Please try again.';
    else if (errorParam === 'GithubOAuthFailed') error = 'GitHub login failed. Please try again.';
    else if (errorParam === 'EmailMissing') error = 'Failed to retrieve email from your account.';
    else error = 'OAuth authentication failed. Please try again.';
  }

  const handleRoleSelect = (role) => {
    if (role === 'RECRUITER') {
      setRecruiterNotice(true);
      return;
    }
    setRecruiterNotice(false);
    setSelectedRole(role);
    localStorage.setItem('signup_role', role);
  };

  const cardBase = "min-h-screen bg-bg-base flex items-center justify-center p-4 font-outfit";
  const panelBase = "bg-surface border border-outline-var/30 rounded-md p-8 w-full max-w-md shadow-2xl shadow-bg-base/80";

  return (
    <div className={cardBase}>
      <div className={panelBase}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-md flex items-center justify-center mx-auto mb-3">
            <Shield size={22} className="text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight mb-1">
            Sign In to SkillSphere
          </h1>
          <p className="text-outline text-xs">
            Access your professional network and portfolio grid.
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleRoleSelect('STUDENT')}
              className={`p-2.5 border rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition ${
                selectedRole === 'STUDENT'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-mid/50 border-outline-var/30 text-text-muted hover:text-text-primary'
              }`}
            >
              <GraduationCap size={16} />
              Student
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('PROFESSIONAL')}
              className={`p-2.5 border rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition ${
                selectedRole === 'PROFESSIONAL'
                  ? 'bg-secondary-bright/10 border-secondary-bright text-secondary-bright'
                  : 'bg-surface-mid/50 border-outline-var/30 text-text-muted hover:text-text-primary'
              }`}
            >
              <Briefcase size={16} />
              Professional
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('RECRUITER')}
              className="p-2.5 border border-outline-var/30 bg-surface-mid/30 text-text-muted hover:text-text-primary rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition relative"
            >
              <Building size={16} />
              Recruiter
            </button>
          </div>
        </div>

        {recruiterNotice && (
          <div className="mb-6 p-3 bg-secondary-bright/10 border border-secondary-bright/30 text-secondary-bright text-xs rounded-xs flex items-center gap-2 font-syne uppercase tracking-wider font-bold">
            <span>Recruiter accounts will be available soon! Stay tuned.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-error-container/15 border border-error-container/40 text-error text-xs flex items-start gap-2 rounded-xs">
            <X size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <a href={`${API_BASE_URL}/auth/google?role=${selectedRole}`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-surface-high border border-outline-var/40 hover:border-primary/50 rounded-xs text-sm font-syne font-bold text-text-primary transition-all shadow-sm hover:shadow-primary/10">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
          <a href={`${API_BASE_URL}/auth/github?role=${selectedRole}`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-surface-high border border-outline-var/40 hover:border-primary/50 rounded-xs text-sm font-syne font-bold text-text-primary transition-all shadow-sm hover:shadow-primary/10">
            <Github size={18} />
            Continue with GitHub
          </a>
        </div>
      </div>
    </div>
  );
}