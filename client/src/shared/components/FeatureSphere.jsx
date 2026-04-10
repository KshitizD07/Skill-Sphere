import { useRef, useState, useEffect } from 'react';

const features = [
  { id: 'analysis',   label: 'AI Analysis',    icon: '🧠', color: '#adc6ff', glow: 'rgba(173,198,255,0.35)' },
  { id: 'swap',       label: 'Mentorship',     icon: '🔗', color: '#89f5e7', glow: 'rgba(137,245,231,0.35)' },
  { id: 'feed',       label: 'Community',      icon: '📡', color: '#bec6e0', glow: 'rgba(190,198,224,0.30)' },
  { id: 'nexus',      label: 'N.E.X.U.S.',     icon: '⚡', color: '#6bd8cb', glow: 'rgba(107,216,203,0.35)' },
  { id: 'verification', label: 'Verification', icon: '🛡️', color: '#adc6ff', glow: 'rgba(173,198,255,0.30)' },
];

export default function FeatureSphere({ scrollToSection }) {
  const containerRef = useRef(null);
  const rotationRef  = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const mouseRafRef  = useRef(null);

  useEffect(() => {
    let animationFrameId;
    const animate = () => {
      if (containerRef.current) {
        if (!isHovering) {
          rotationRef.current.x += 0.003;
          rotationRef.current.y += 0.004;
        }
        const nodes = containerRef.current.querySelectorAll('.feature-node');
        nodes.forEach((node, i) => {
          const baseAngle = (i / features.length) * 2 * Math.PI;
          const radius = 180;
          const ex = rotationRef.current.y + baseAngle;
          const ey = rotationRef.current.x;
          const x = radius * Math.cos(ex) - radius * Math.sin(ey) * Math.sin(ex);
          const y = radius * Math.sin(ex) * Math.cos(ey);
          const depth = Math.sin(ex) * Math.cos(ey);
          const scale = 0.75 + 0.35 * ((depth + 1) / 2);
          const opacity = 0.45 + 0.55 * ((depth + 1) / 2);
          node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
          node.style.opacity = opacity;
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovering]);

  const handleMouseMove = (e) => {
    if (!containerRef.current || mouseRafRef.current) return;
    mouseRafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) { mouseRafRef.current = null; return; }
      const { width, height, left, top } = containerRef.current.getBoundingClientRect();
      const x = e.clientX - left - width / 2;
      const y = e.clientY - top - height / 2;
      rotationRef.current = { x: y * 0.005, y: x * 0.005 };
      mouseRafRef.current = null;
    });
  };

  useEffect(() => {
    return () => { if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current); };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      className="relative w-[400px] h-[400px] md:w-[480px] md:h-[480px] flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Central orbit rings */}
      <div className="absolute w-40 h-40 border border-[#adc6ff]/10 rounded-full animate-[spin_12s_linear_infinite]" />
      <div className="absolute w-28 h-28 border border-[#6bd8cb]/10 rounded-full animate-[spin_7s_linear_infinite_reverse]" />
      <div className="absolute w-20 h-20 border border-[#adc6ff]/5 rounded-full animate-[spin_9s_linear_infinite]" />

      {/* Central logo */}
      <div className="absolute z-0 select-none pointer-events-none text-center">
        <div className="text-5xl font-extrabold font-['Manrope'] tracking-tighter" style={{ color: '#adc6ff', opacity: 0.9 }}>
          SS
        </div>
        <div className="font-['Space_Grotesk'] text-[8px] font-bold tracking-[0.2em] uppercase text-[#8d90a0] mt-1">
          SkillSphere
        </div>
      </div>

      {/* Orbiting feature nodes */}
      {features.map((feature) => (
        <button
          key={feature.id}
          onClick={() => scrollToSection?.(feature.id)}
          className="feature-node absolute flex flex-col items-center justify-center w-20 h-20 rounded-md cursor-pointer z-10 transition-all hover:scale-110"
          style={{
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            background: 'rgba(23, 31, 51, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${feature.color}30`,
            boxShadow: `0 0 20px ${feature.glow}, inset 0 0 20px ${feature.glow}06`,
          }}
        >
          <span className="text-xl mb-1 leading-none">{feature.icon}</span>
          <span className="text-[8px] font-bold font-['Space_Grotesk'] tracking-[0.1em] uppercase" style={{ color: feature.color }}>
            {feature.label}
          </span>
        </button>
      ))}
    </div>
  );
}