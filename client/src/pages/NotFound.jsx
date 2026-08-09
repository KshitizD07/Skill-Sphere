import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center font-outfit text-center p-8">
      <div className="text-[120px] font-black text-primary/15 font-syne leading-none select-none">404</div>
      <h1 className="text-4xl font-black text-text-primary font-syne tracking-widest mb-4 -mt-4">
        SIGNAL_LOST
      </h1>
      <p className="text-text-muted font-outfit text-sm mb-8 max-w-md">
        The node you were looking for has been disconnected or does not exist in the network.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-8 py-3 bg-primary text-on-primary font-bold font-syne uppercase tracking-wider hover:bg-primary-dim transition rounded-xs"
      >
        RETURN_TO_GRID
      </button>
    </div>
  );
}