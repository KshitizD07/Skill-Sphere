import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Navbar from '../shared/components/Navbar';
import SEOHead from '../shared/components/SEOHead';
import SkillVerifier from '../features/skills/SkillVerifier';

export default function SkillVerifierPage({ user, onLogout }) {
  const navigate = useNavigate();
  const currentUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  })();

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <SEOHead
        title="Skill Verifier · SkillSphere"
        description="Verify and validate your technical skills via automated GitHub, LeetCode, and credential proofs."
      />
      <Navbar user={currentUser} onLogout={onLogout} />

      <main className="flex-1 md:ml-64 pt-16 md:pt-8 pb-16 p-4 md:p-8 flex flex-col items-center justify-start w-full">
        <div className="w-full max-w-lg mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 border border-outline-var/40 rounded-xs text-text-muted hover:border-primary/40 hover:text-primary transition-all font-syne text-xs uppercase tracking-wider font-bold cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-1.5 text-primary text-xs font-syne font-bold uppercase tracking-wider">
            <ShieldCheck size={16} /> Automated Protocol
          </div>
        </div>

        <SkillVerifier />
      </main>
    </div>
  );
}
