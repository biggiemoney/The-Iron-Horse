
import React, { useRef, useEffect, useState } from 'react';
import { WHEEL_SEGMENTS } from '../constants';
import { WheelSegment } from '../types';

interface WheelProps {
  isSpinning: boolean;
  onSpinEnd: (segment: WheelSegment) => void;
  disabled: boolean;
  onSpinStart: () => void;
}

const Wheel: React.FC<WheelProps> = ({ isSpinning, onSpinEnd, disabled, onSpinStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const requestRef = useRef<number | undefined>(undefined);

  const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const radius = canvas.width / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 5, 0, Math.PI * 2);
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(rotation);

      WHEEL_SEGMENTS.forEach((segment, i) => {
        const startAngle = i * segmentAngle;
        const endAngle = startAngle + segmentAngle;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius - 10, startAngle, endAngle);
        ctx.fillStyle = segment.color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        ctx.save();
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = segment.color === '#FFFFFF' || segment.color === '#FFD700' ? '#000000' : '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        const label = segment.value.toString();
        ctx.fillText(label, radius - 30, 4);
        ctx.restore();
      });

      ctx.restore();

      ctx.save();
      ctx.translate(radius, radius);
      
      // Center Hub
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
      gradient.addColorStop(0, '#ff4444');
      gradient.addColorStop(1, '#660000');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#330000';
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Staatliches"';
      ctx.textAlign = 'center';
      ctx.fillText('SPIN', 0, 6);
      ctx.restore();

      // Indicator
      ctx.beginPath();
      ctx.moveTo(radius - 12, 5);
      ctx.lineTo(radius + 12, 5);
      ctx.lineTo(radius, 30);
      ctx.closePath();
      ctx.fillStyle = '#ff0000';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    draw();
  }, [rotation]);

  const spin = () => {
    if (disabled || isSpinning) return;
    onSpinStart();
    const initialVelocity = 0.45 + Math.random() * 0.45;
    setVelocity(initialVelocity);
  };

  useEffect(() => {
    if (velocity > 0) {
      const animate = () => {
        setRotation(prev => prev + velocity);
        const friction = 0.94; // Snappier decay for ~1s spin
        const nextVel = velocity * friction;
        
        if (nextVel < 0.005) {
          setVelocity(0);
          const finalRotation = (rotation + velocity) % (2 * Math.PI);
          const normalizedRotation = (1.5 * Math.PI - (finalRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const winningIndex = Math.floor(normalizedRotation / segmentAngle);
          onSpinEnd(WHEEL_SEGMENTS[winningIndex]);
        } else {
          setVelocity(nextVel);
          requestRef.current = requestAnimationFrame(animate);
        }
      };
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [velocity, rotation, segmentAngle, onSpinEnd]);

  return (
    <div className="relative flex flex-col items-center">
      <div 
        className="relative cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98]"
        onClick={spin}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className={`rounded-full shadow-2xl border-2 border-zinc-800 transition-opacity ${disabled ? 'opacity-80' : 'opacity-100'}`}
        />
        {disabled && !isSpinning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full pointer-events-none">
          </div>
        )}
      </div>
    </div>
  );
};

export default Wheel;
