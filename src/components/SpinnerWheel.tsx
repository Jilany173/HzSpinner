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
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const isSpinningRef = useRef(false);

  const COLORS = ['#2563eb', '#dc2626']; // Blue-600, Red-600
  const TEXT_COLOR = '#ffffff';

  useEffect(() => {
    if (spinTrigger > 0 && !isSpinningRef.current && teachers.length > 0) {
      startSpin();
    }
  }, [spinTrigger]);

  const startSpin = () => {
    isSpinningRef.current = true;
    // Random velocity between 0.15 and 0.25 radians per frame
    velocityRef.current = 0.2 + Math.random() * 0.1;
  };

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      if (isSpinningRef.current) {
        rotationRef.current += velocityRef.current;
        velocityRef.current *= 0.985; // Friction

        if (velocityRef.current < 0.001) {
          isSpinningRef.current = false;
          velocityRef.current = 0;
          
          // Calculate winner
          const segmentAngle = (2 * Math.PI) / teachers.length;
          // Normalize rotation to 0 - 2PI
          const normalizedRotation = (rotationRef.current % (2 * Math.PI));
          // The pointer is at the top (3/2 PI)
          // The wheel rotates clockwise, so we subtract the rotation from the pointer position
          let winningIndex = Math.floor((1.5 * Math.PI - normalizedRotation + 2 * Math.PI) % (2 * Math.PI) / segmentAngle);
          
          // Safety check for index
          if (winningIndex < 0) winningIndex = 0;
          if (winningIndex >= teachers.length) winningIndex = teachers.length - 1;

          onSpinEnd(teachers[winningIndex]);
        }
        setRotation(rotationRef.current);
      }
      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 10;

      ctx.clearRect(0, 0, size, size);

      if (teachers.length === 0) {
        // Draw empty wheel
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#f3f4f6';
        ctx.fill();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Add teachers to start', centerX, centerY);
        return;
      }

      const segmentAngle = (2 * Math.PI) / teachers.length;

      teachers.forEach((teacher, i) => {
        const startAngle = i * segmentAngle + rotationRef.current;
        const endAngle = (i + 1) * segmentAngle + rotationRef.current;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = 'bold 14px sans-serif';
        
        // Truncate text if too long
        const displayName = teacher.name.length > 12 ? teacher.name.substring(0, 10) + '...' : teacher.name;
        ctx.fillText(displayName, radius - 20, 5);
        ctx.restore();
      });

      // Draw center pin
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw pointer (at the top)
      ctx.beginPath();
      ctx.moveTo(centerX - 15, 10);
      ctx.lineTo(centerX + 15, 10);
      ctx.lineTo(centerX, 40);
      ctx.closePath();
      ctx.fillStyle = '#dc2626'; // Red pointer
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
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
