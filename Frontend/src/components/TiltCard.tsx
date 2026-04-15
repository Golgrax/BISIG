import React, { forwardRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const TiltCard = forwardRef(({ children, className, style, ...props }: any, ref: any) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div ref={ref} style={{ perspective: '1000px', height: '100%' }}>
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateY, rotateX, transformStyle: "preserve-3d", ...style }}
        className={`card ${className || ''}`}
        {...props}
      >
        <div style={{ transform: "translateZ(40px)", height: '100%' }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
});

export const BackgroundOrbs = () => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
    <div className="glow-orb" style={{ top: '-20%', left: '-10%', background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)' }}></div>
    <div className="glow-orb" style={{ bottom: '-20%', right: '-10%', animationDelay: '-10s', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)' }}></div>
    <div className="glow-orb" style={{ top: '30%', left: '40%', animationDelay: '-5s', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 70%)' }}></div>
  </div>
);
