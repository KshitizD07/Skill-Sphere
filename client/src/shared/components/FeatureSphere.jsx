import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const features = [
  { id: 'analysis', label: 'AI_SCAN',  color: 'border-cyan-400',   glow: 'shadow-[0_0_15px_rgba(34,211,238,0.5)]',  icon: '🧠' },
  { id: 'swap',     label: 'LINK_UP',  color: 'border-yellow-400', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.5)]',  icon: '🔗' },
  { id: 'feed',     label: 'NET_LOG',  color: 'border-pink-500',   glow: 'shadow-[0_0_15px_rgba(236,72,153,0.5)]',  icon: '📡' },
  { id: 'mentorship', label: 'ELDER_DB', color: 'border-green-500', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.5)]',  icon: '🎓' },
  { id: 'rankings', label: 'FAME_VAL', color: 'border-purple-500', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]', icon: '🏆' },
];

export default function FeatureSphere({ scrollToSection }) {
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Auto-rotate when not hovering
  useEffect(() => {
    let raf;
    const animate = () => {
      if (!isHovering) {
        setRotation(prev => ({
          x: prev.x + 0.005,
          y: prev.y + 0.008,
        }));
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isHovering]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { width, height, left, top } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2);
    const y = (e.clientY - top - height / 2);
    setRotation({ x: y * 0.02, y: x * 0.02 });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      className="relative w-[400px] h-[400px] md:w-[500px] md:h-[500px] flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Central core rings */}
      <div className="absolute w-40 h-40 border-2 border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
      <div className="absolute w-32 h-32 border border-yellow-400/20 rounded-full animate-[spin_5s_linear_infinite_reverse]" />
      <div className="absolute w-24 h-24 border border-purple-500/20 rounded-full animate-[spin_8s_linear_infinite]" />

      {/* Logo */}
      <div
        className="absolute z-0 text-7xl font-black text-cyan-400 select-none tracking-tighter pointer-events-none"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        SS
      </div>

      {/* Orbiting feature nodes */}
      {features.map((feature, i) => {
        const baseAngle = (i / features.length) * 2 * Math.PI;
        const radius = 180;
        const effectiveX = rotation.y + baseAngle;
        const effectiveY = rotation.x;

        // Simplified 3D projection
        const x = radius * Math.cos(effectiveX) - radius * Math.sin(effectiveY) * Math.sin(effectiveX);
        const y = radius * Math.sin(effectiveX) * Math.cos(effectiveY);

        // Depth cue — nodes "behind" the centre are slightly dimmer and smaller
        const depth = Math.sin(effectiveX) * Math.cos(effectiveY);
        const scale = 0.75 + 0.35 * ((depth + 1) / 2);
        const opacity = 0.5 + 0.5 * ((depth + 1) / 2);

        return (
          <motion.button
            key={feature.id}
            onClick={() => scrollToSection(feature.id)}
            animate={{ x, y, scale, opacity }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className={`absolute flex flex-col items-center justify-center w-20 h-20 bg-black/80 backdrop-blur-sm border-2 ${feature.color} ${feature.glow} rounded-lg cursor-pointer hover:bg-white/10 transition-colors z-10`}
          >
            <span className="text-2xl mb-1 leading-none">{feature.icon}</span>
            <span className="text-[9px] font-bold text-gray-200 tracking-widest font-mono uppercase">
              {feature.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}