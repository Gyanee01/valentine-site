import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Spotlight } from './Spotlight';

interface EnvelopeSceneProps {
  onOpen: () => void;
}

export const EnvelopeScene: React.FC<EnvelopeSceneProps> = ({ onOpen }) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = () => {
    setIsOpening(true);
    setTimeout(onOpen, 800); // Wait for animation to start morphing
  };

  return (
    <motion.div 
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
    >
      <Spotlight />

      <motion.div
        className="relative z-30 cursor-pointer group"
        onClick={handleOpen}
        initial={{ scale: 0.8, y: 50 }}
        animate={isOpening ? { scale: 1.5, rotateY: 180, opacity: 0 } : { scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Envelope Body */}
        <div className="w-[320px] h-[220px] md:w-[400px] md:h-[280px] bg-[#fdf4e3] rounded-lg shadow-2xl relative flex items-center justify-center border border-[#e6dcc5]">
          
          {/* Back Flap Design */}
          <div 
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #fdf4e3 0%, #f0e6d2 100%)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
            }}
          />

          {/* Text */}
          <div className="relative z-10 text-center p-4 transform translate-y-2">
            <h2 className="font-handwriting text-2xl md:text-3xl text-stone-800 leading-relaxed">
              To my bhindi hater<br/>baby strawberry 💕
            </h2>
          </div>

          {/* Envelope Flaps (CSS Triangles essentially) */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-[#f4ebd0] opacity-50 z-0 clip-triangle-top" 
               style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }} 
          />
          
          {/* Wax Seal */}
          <motion.div 
            className="absolute z-20 w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center shadow-lg border-4 border-rose-700"
            style={{ 
              top: '50%', 
              right: '-8px', // Slightly offset for aesthetic
              transform: 'translateY(-50%)'
            }}
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="w-12 h-12 rounded-full border border-rose-400/30 flex items-center justify-center">
              <Heart className="text-rose-100 fill-rose-100 w-6 h-6" />
            </div>
            {/* Wax drip effect */}
            <div className="absolute -bottom-2 w-3 h-4 bg-rose-600 rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};