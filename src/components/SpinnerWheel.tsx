import React, { useEffect, useRef, useState } from 'react';
import { Teacher } from '../types';

interface SpinnerWheelProps {
  teachers: Teacher[];
  isSpinning: boolean;
  onSpinEnd: (teacher: Teacher) => void;
  spinTrigger: number;
}

const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ teachers, isSpinning, onSpinEnd, spinTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const startRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const lastTickIndexRef = useRef(-1);
  const pointerFlickRef = useRef(0);

  const DURATION = 6000;

  // Professional color palette
  const COLORS = [
    '#2563eb', // Blue
    '#dc2626', // Red
    '#059669', // Emerald
    '#d97706', // Amber
    '#7c3aed', // Violet
    '#db2777', // Pink
  ];
  const TEXT_COLOR = '#ffffff';

  // Pre-render the wheel whenever teachers change
  useEffect(() => {
    if (teachers.length === 0) return;

    const size = 800; // High resolution for pre-render
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 40;
    const innerRadius = outerRadius - 20;
    const segmentAngle = (2 * Math.PI) / teachers.length;

    // Draw segments
    teachers.forEach((teacher, i) => {
      const startAngle = i * segmentAngle;
      const endAngle = (i + 1) * segmentAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 26px sans-serif';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      
      const displayName = teacher.name.length > 15 ? teacher.name.substring(0, 13) + '...' : teacher.name;
      ctx.fillText(displayName, innerRadius - 70, 10);
      ctx.restore();
    });

    // Draw outer rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Draw pegs
    const pegCount = Math.max(teachers.length, 12);
    for (let i = 0; i < pegCount; i++) {
      const angle = (i * (2 * Math.PI) / pegCount);
      const x = centerX + (innerRadius - 10) * Math.cos(angle);
      const y = centerY + (innerRadius - 10) * Math.sin(angle);
      
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }

    offscreenCanvasRef.current = canvas;
  }, [teachers]);

  useEffect(() => {
    if (spinTrigger > 0 && !isSpinningRef.current && teachers.length > 0) {
      startSpin();
    }
  }, [spinTrigger]);

  const easeOutBack = (x: number): number => {
    const c1 = 0.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };

  const startSpin = () => {
    isSpinningRef.current = true;
    startTimeRef.current = performance.now();
    startRotationRef.current = rotationRef.current % (2 * Math.PI);
    
    const extraRotations = 12 + Math.random() * 8;
    targetRotationRef.current = startRotationRef.current + (extraRotations * 2 * Math.PI);
    lastTickIndexRef.current = -1;
    pointerFlickRef.current = 0;
  };

  useEffect(() => {
    let animationFrameId: number;

    const update = (time: number) => {
      if (isSpinningRef.current && startTimeRef.current !== null) {
        const elapsed = time - startTimeRef.current;
        const progress = Math.min(elapsed / DURATION, 1);
        
        const easedProgress = easeOutBack(progress);
        rotationRef.current = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * easedProgress;

        if (teachers.length > 0) {
          const pegCount = Math.max(teachers.length, 12);
          const segmentAngle = (2 * Math.PI) / pegCount;
          const currentTickIndex = Math.floor((rotationRef.current + Math.PI / 2) / segmentAngle);
          
          if (currentTickIndex !== lastTickIndexRef.current) {
            lastTickIndexRef.current = currentTickIndex;
            const speed = (1 - progress);
            if (speed > 0.1) {
              pointerFlickRef.current = 15 * speed;
            }
          }
        }

        pointerFlickRef.current *= 0.8;

        if (progress >= 1) {
          isSpinningRef.current = false;
          startTimeRef.current = null;
          pointerFlickRef.current = 0;
          
          const segmentAngle = (2 * Math.PI) / teachers.length;
          const normalizedRotation = (rotationRef.current % (2 * Math.PI));
          let winningIndex = Math.floor((1.5 * Math.PI - normalizedRotation + 20 * Math.PI) % (2 * Math.PI) / segmentAngle);
          
          if (winningIndex < 0) winningIndex = 0;
          if (winningIndex >= teachers.length) winningIndex = teachers.length - 1;

          onSpinEnd(teachers[winningIndex]);
        }
      }
      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: disable alpha if possible, but we need it for background
      if (!ctx) return;

      const size = canvas.width;
      const centerX = size / 2;
      const centerY = size / 2;
      const outerRadius = size / 2 - 20;

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw outer shadow/glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 5, 0, 2 * Math.PI);
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      if (teachers.length === 0 || !offscreenCanvasRef.current) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius - 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Add teachers to start', centerX, centerY);
        return;
      }

      // Draw pre-rendered wheel
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);
      ctx.drawImage(offscreenCanvasRef.current, -centerX, -centerY, size, size);
      ctx.restore();

      // Draw metallic center pin
      const pinRadius = 28;
      const gradient = ctx.createRadialGradient(centerX - 8, centerY - 8, 2, centerX, centerY, pinRadius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#e2e8f0');
      gradient.addColorStop(0.8, '#94a3b8');
      gradient.addColorStop(1, '#475569');

      ctx.beginPath();
      ctx.arc(centerX, centerY, pinRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw pointer
      ctx.save();
      ctx.translate(centerX, 25);
      ctx.rotate((pointerFlickRef.current * Math.PI) / 180);
      
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(18, -12);
      ctx.lineTo(0, 35);
      ctx.closePath();
      
      const pointerGradient = ctx.createLinearGradient(-18, 0, 18, 0);
      pointerGradient.addColorStop(0, '#ef4444');
      pointerGradient.addColorStop(0.5, '#fca5a5');
      pointerGradient.addColorStop(1, '#b91c1c');
      
      ctx.fillStyle = pointerGradient;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [teachers, onSpinEnd]);

  return (
    <div className="relative flex justify-center items-center w-full max-w-[400px] aspect-square mx-auto">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="w-full h-full drop-shadow-2xl"
      />
    </div>
  );
};

export default SpinnerWheel;
