import React, { useEffect, useRef } from 'react';

export default function IndustrialCanvasBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Subtle atmospheric orbs drifting in Framer style
    const orbs = [
      { x: width * 0.2, y: height * 0.25, r: 350, color: 'rgba(56, 189, 248, 0.04)', vx: 0.15, vy: 0.1 },
      { x: width * 0.8, y: height * 0.6, r: 420, color: 'rgba(129, 140, 248, 0.035)', vx: -0.12, vy: -0.08 },
      { x: width * 0.5, y: height * 0.8, r: 300, color: 'rgba(6, 182, 212, 0.03)', vx: 0.08, vy: -0.12 }
    ];

    // Delicate starfield particles
    const particleCount = 20;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.2 + 0.4,
      alpha: Math.random() * 0.35 + 0.1
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render drifting atmospheric light pools
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < 0 || orb.x > width) orb.vx *= -1;
        if (orb.y < 0 || orb.y > height) orb.vy *= -1;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render micro dust particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden framer-mesh-bg">
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-60"
        style={{ mixBlendMode: 'screen' }}
      />
      {/* Specular Micro Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(3, 5, 8, 0.75) 100%)'
        }}
      />
    </div>
  );
}
