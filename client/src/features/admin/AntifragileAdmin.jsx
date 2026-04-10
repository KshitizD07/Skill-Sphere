import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function AntifragileAdmin() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#0b1326] flex items-center justify-center font-['Manrope']">
        <div className="text-center bg-[#171f33] border border-[#93000a]/30 rounded-md p-10 max-w-sm w-full">
          <Shield className="mx-auto mb-4 text-[#ffb4ab]" size={36} />
          <h2 className="text-lg font-bold text-[#ffb4ab] mb-2 tracking-tight">Access Restricted</h2>
          <p className="text-[#8d90a0] text-sm mb-6">You do not have permission to view this page.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 border border-[#434655]/40 rounded-xs text-[#c3c6d7] hover:border-[#adc6ff]/40 hover:text-[#adc6ff] transition-all font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-[0.1em]">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 border border-[#434655]/40 rounded-xs hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ffb4ab]/8 rounded-xs border border-[#ffb4ab]/15">
              <Shield className="text-[#ffb4ab]" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#dae2fd] tracking-tight">Admin Panel</h1>
              <p className="font-['Space_Grotesk'] text-[9px] font-bold tracking-[0.12em] uppercase text-[#8d90a0]">Antifragile Engine Control</p>
            </div>
          </div>
        </div>

        <div className="border border-dashed border-[#434655]/30 rounded-md p-16 text-center">
          <p className="text-[#656d84] font-['Space_Grotesk'] text-[10px] uppercase tracking-[0.12em]">Admin panel — coming soon</p>
        </div>
      </div>
    </div>
  );
}