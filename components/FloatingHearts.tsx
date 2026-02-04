import React from 'react';
import { motion } from 'framer-motion';

export const FloatingHearts: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-pink-300/40 text-4xl"
          initial={{ 
            y: "100vh", 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
            scale: Math.random() * 0.5 + 0.5,
            rotate: 0 
          }}
          animate={{ 
            y: "-20vh",
            rotate: 360,
          }}
          transition={{ 
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10
          }}
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
};