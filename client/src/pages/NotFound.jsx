import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-['Rajdhani'] text-center p-8">
      <div className="text-[120px] font-black text-cyan-500/20 font-['Orbitron'] leading-none select-none">404</div>
      <h1 className="text-4xl font-black text-white font-['Orbitron'] tracking-widest mb-4 -mt-4">
        SIGNAL_LOST
      </h1>
      <p className="text-gray-500 font-mono text-sm mb-8 max-w-md">
        The node you were looking for has been disconnected or does not exist in the network.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-8 py-3 bg-cyan-600 text-black font-bold font-['Orbitron'] hover:bg-cyan-400 transition"
      >
        RETURN_TO_GRID
      </button>
    </div>
  );
}