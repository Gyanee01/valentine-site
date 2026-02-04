import React from 'react';
import { motion } from 'framer-motion';

export const RoseAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-[60vh] flex items-end justify-center">
      <svg
        viewBox="0 0 200 400"
        className="w-full h-full max-w-[300px] overflow-visible"
      >
        {/* Stem */}
        <motion.path
          d="M100 400 C100 350, 80 300, 100 200 C110 150, 90 100, 100 80"
          fill="none"
          stroke="#2d5a27"
          strokeWidth="6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Leaf Left */}
        <motion.path
          d="M100 250 Q60 240, 50 210 Q60 270, 100 260"
          fill="#4a8a3f"
          stroke="#2d5a27"
          strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          style={{ originX: 1, originY: 1 }}
        />

        {/* Leaf Right */}
        <motion.path
          d="M100 300 Q140 290, 150 260 Q140 320, 100 310"
          fill="#4a8a3f"
          stroke="#2d5a27"
          strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          style={{ originX: 0, originY: 1 }}
        />

        {/* Rose Petals (simplified layers) */}
        <motion.g 
          initial={{ scale: 0, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ delay: 2, duration: 1.5, type: "spring" }}
          style={{ originX: 0.5, originY: 1 }} // Pivot at bottom of flower head
        >
            {/* Outer Petals */}
           <path d="M70 80 C40 40, 160 40, 130 80 C130 110, 70 110, 70 80" fill="#e11d48" />
           <path d="M80 80 C80 30, 120 30, 120 80 C120 100, 80 100, 80 80" fill="#f43f5e" />
           <path d="M90 70 C90 50, 110 50, 110 70 C110 85, 90 85, 90 70" fill="#fb7185" />
        </motion.g>
      </svg>
    </div>
  );
};