import React from 'react';
import { motion } from 'framer-motion';

export const Spotlight: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Light Beam */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[150%] h-[150%] opacity-60 z-10"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 250, 220, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          transform: 'rotate(-15deg)',
          filter: 'blur(40px)',
        }}
      />
      
      {/* Dust Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full opacity-20 z-20"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, -10, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};