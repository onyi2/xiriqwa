import React, { useRef, useEffect } from 'react';

export const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const emojis = document.querySelectorAll('.floating-emoji');
      const nodes: { x: number; y: number }[] = [];

      emojis.forEach((emoji) => {
        const rect = emoji.getBoundingClientRect();
        nodes.push({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      });

      const currentMouse = mousePos.current;
      const interactionRadius = 250;

      for (let i = 0; i < nodes.length; i++) {
        const d1 = Math.hypot(nodes[i].x - currentMouse.x, nodes[i].y - currentMouse.y);
        
        if (d1 < interactionRadius) {
            const alpha1 = 1 - (d1 / interactionRadius);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(currentMouse.x, currentMouse.y);
            ctx.strokeStyle = `rgba(225, 29, 72, ${alpha1 * 0.5})`; // rose-600
            ctx.lineWidth = 1;
            ctx.stroke();

            for (let j = i + 1; j < nodes.length; j++) {
                const d2 = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                const dMouseJ = Math.hypot(nodes[j].x - currentMouse.x, nodes[j].y - currentMouse.y);

                if (d2 < 400 && dMouseJ < interactionRadius) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.strokeStyle = `rgba(225, 29, 72, ${Math.min(alpha1, 1 - (dMouseJ / interactionRadius)) * 0.4})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 mix-blend-multiply"
    />
  );
};
