import { useRef, useState, useEffect } from 'react';

const features = [
  { id: 'analysis',   label: 'AI Analysis',    icon: '🧠', color: '#C29F5D', glow: 'rgba(194,159,93,0.30)' },
  { id: 'swap',       label: 'Mentorship',     icon: '🔗', color: '#6B7F5E', glow: 'rgba(107,127,94,0.30)' },
  { id: 'feed',       label: 'Community',      icon: '📡', color: '#A88243', glow: 'rgba(168,130,67,0.25)' },
  { id: 'nexus',      label: 'N.E.X.U.S.',     icon: '⚡', color: '#556B4A', glow: 'rgba(85,107,74,0.30)' },
  { id: 'verification', label: 'Verification', icon: '🛡️', color: '#C29F5D', glow: 'rgba(194,159,93,0.25)' },
];

export default function FeatureSphere({ scrollToSection }) {
  const containerRef = useRef(null);
  const rotationRef  = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const mouseRafRef  = useRef(null);

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let animationFrameId;
    const animate = () => {
      if (containerRef.current) {
        if (!isHovering) {
          rotationRef.current.x += 0.003;
          rotationRef.current.y += 0.004;
        }
        const nodes = containerRef.current.querySelectorAll('.feature-node');
        const winWidth = window.innerWidth;
        const isMobile = winWidth < 768;
        const radius = isMobile ? (winWidth < 380 ? 95 : 120) : 180;

        nodes.forEach((node, i) => {
          const baseAngle = (i / features.length) * 2 * Math.PI;
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
  }, [isHovering, isVisible]);

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

  const lastTouchRef = useRef(null);

  const handleTouchStart = (e) => {
    setIsHovering(true);
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (!lastTouchRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchRef.current.x;
    const dy = touch.clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

    rotationRef.current.y += dx * 0.008;
    rotationRef.current.x -= dy * 0.008;
  };

  const handleTouchEnd = () => {
    setIsHovering(false);
    lastTouchRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[480px] md:h-[480px] flex items-center justify-center max-w-full overflow-hidden touch-none"
      style={{ perspective: '1000px' }}
    >
      {/* Central orbit rings */}
      <div className="absolute w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 border border-primary/10 rounded-full animate-[spin_12s_linear_infinite]" />
      <div className="absolute w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 border border-secondary/10 rounded-full animate-[spin_7s_linear_infinite_reverse]" />
      <div className="absolute w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 border border-primary/5 rounded-full animate-[spin_9s_linear_infinite]" />

      {/* Central logo */}
      <div className="absolute z-0 select-none pointer-events-none text-center">
        <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-outfit tracking-tighter" style={{ color: '#C29F5D', opacity: 0.9 }}>
          SS
        </div>
        <div className="font-syne text-[7px] sm:text-[8px] font-bold tracking-[0.2em] uppercase text-outline mt-0.5">
          SkillSphere
        </div>
      </div>

      {/* Orbiting feature nodes */}
      {features.map((feature) => (
        <button
          key={feature.id}
          onClick={() => scrollToSection?.(feature.id)}
          className="feature-node absolute flex flex-col items-center justify-center w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-md cursor-pointer z-10 transition-all hover:scale-110"
          style={{
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            background: 'rgba(26, 25, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${feature.color}30`,
            boxShadow: `0 0 15px ${feature.glow}, inset 0 0 15px ${feature.glow}06`,
          }}
        >
          <span className="text-base sm:text-lg md:text-xl mb-0.5 leading-none">{feature.icon}</span>
          <span className="text-[6.5px] sm:text-[8px] font-bold font-syne tracking-[0.08em] uppercase" style={{ color: feature.color }}>
            {feature.label}
          </span>
        </button>
      ))}
    </div>
  );
}