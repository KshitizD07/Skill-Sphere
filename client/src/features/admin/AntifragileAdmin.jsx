import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function AntifragileAdmin() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  // Basic role guard on top of ProtectedRoute
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-4">ACCESS_DENIED</div>
          <button onClick={() => navigate('/dashboard')} className="text-cyan-400 hover:text-white transition">
            ← RETURN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <Shield className="text-red-400" size={28} />
            <h1 className="text-3xl font-black text-white font-['Orbitron'] tracking-widest">ANTIFRAGILE_ADMIN</h1>
          </div>
        </div>
        <div className="border border-dashed border-gray-700 p-12 text-center text-gray-600 font-mono">
          ADMIN_PANEL_COMING_SOON
        </div>
      </div>
    </div>
  );
}