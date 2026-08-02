import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function AntifragileAdmin() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-outfit">
        <div className="text-center bg-surface border border-error-container/30 rounded-md p-10 max-w-sm w-full">
          <Shield className="mx-auto mb-4 text-error" size={36} />
          <h2 className="text-lg font-bold text-error mb-2 tracking-tight">Access Restricted</h2>
          <p className="text-outline text-sm mb-6">You do not have permission to view this page.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 border border-outline-var/40 rounded-xs text-text-muted hover:border-primary/40 hover:text-primary transition-all font-syne font-bold text-[10px] uppercase tracking-[0.1em]">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit p-8">
      <div className="w-full max-w-[1200px] mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/8 rounded-xs border border-error/15">
              <Shield className="text-error" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight">Admin Panel</h1>
              <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline">Antifragile Engine Control</p>
            </div>
          </div>
        </div>

        <div className="border border-dashed border-outline-var/30 rounded-md p-16 text-center">
          <p className="text-[#656d84] font-syne text-[10px] uppercase tracking-[0.12em]">Admin panel — coming soon</p>
        </div>
      </div>
    </div>
  );
}