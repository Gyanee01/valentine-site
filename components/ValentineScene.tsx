import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingHearts } from './FloatingHearts';
import { RoseAnimation } from './RoseAnimation';
import { SceneState } from '../types';
import Ballpit from './Ballpit';

interface ValentineSceneProps {
  onAccept: () => void;
  sceneState: SceneState;
}

export const ValentineScene: React.FC<ValentineSceneProps> = ({ onAccept, sceneState }) => {
  const [noBtnPos, setNoBtnPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  const noBtnContainerRef = React.useRef<HTMLDivElement>(null);
  const yesBtnRef = React.useRef<HTMLButtonElement>(null);

  // Random position generator for "No" button
  const moveButton = () => {
    if (!noBtnContainerRef.current || !yesBtnRef.current) return;

    const containerRect = noBtnContainerRef.current.getBoundingClientRect();
    const yesRect = yesBtnRef.current.getBoundingClientRect();
    const btnWidth = containerRect.width;
    const btnHeight = containerRect.height;
    
    const padding = 20; // Padding from screen edges
    const buffer = 20; // Buffer distance from Yes button
    
    // Try to find a valid position
    for (let i = 0; i < 50; i++) {
        // Generate random position within viewport
        const targetX = Math.random() * (window.innerWidth - btnWidth - 2 * padding) + padding;
        const targetY = Math.random() * (window.innerHeight - btnHeight - 2 * padding) + padding;

        // Check for overlap with Yes button
        const noLeft = targetX;
        const noRight = targetX + btnWidth;
        const noTop = targetY;
        const noBottom = targetY + btnHeight;

        const overlap = !(
            noLeft > yesRect.right + buffer ||
            noRight < yesRect.left - buffer ||
            noTop > yesRect.bottom + buffer ||
            noBottom < yesRect.top - buffer
        );

        if (!overlap) {
            // Valid position found
            // Calculate transform relative to the container's layout position
            setNoBtnPos({
                x: targetX - containerRect.left,
                y: targetY - containerRect.top
            });
            return;
        }
    }

    // Fallback if no valid position found (move somewhere far)
    const fallbackX = (Math.random() - 0.5) * (window.innerWidth - 150);
    const fallbackY = (Math.random() - 0.5) * (window.innerHeight - 150);
    setNoBtnPos({ x: fallbackX, y: fallbackY });
  };

  const handleNoHover = () => {
    setIsHovered(true);
    moveButton();
  };

  const isAccepted = sceneState === SceneState.ACCEPTED;

  return (
    <motion.div 
      className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 3D Ballpit Background */}
      <div className="absolute inset-0 z-0">
        <Ballpit 
          count={100}
          gravity={0.7}
          friction={0.995}
          wallBounce={0.9}
          followCursor={true}
          colors={['#ffccd5', '#fb7185', '#e11d48', '#fff0f3']}
        />
      </div>

      <FloatingHearts />

      <AnimatePresence mode="wait">
        {!isAccepted ? (
          <motion.div 
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-10 flex flex-col items-center gap-8 w-full max-w-lg px-4"
          >
            <h1 className="text-4xl md:text-6xl font-handwriting text-rose-600 text-center drop-shadow-sm bg-white/50 backdrop-blur-sm p-4 rounded-xl">
              Will you be my<br/>Valentine? 💖
            </h1>

            <div className="flex flex-row items-center justify-center gap-12 mt-8 w-full h-64 relative">
              {/* YES Button - Significantly larger */}
              <motion.button
                ref={yesBtnRef}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAccept}
                className="relative overflow-hidden rounded-2xl shadow-xl w-48 h-48 md:w-64 md:h-64 border-8 border-white transform transition-transform z-20"
              >
                <img 
                  src="https://picsum.photos/id/102/500/500" 
                  alt="Romantic scenery"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                  <span className="text-white font-bold text-4xl tracking-widest drop-shadow-lg">YES</span>
                </div>
              </motion.button>

              {/* NO Button - Significantly smaller */}
              <div ref={noBtnContainerRef} className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                <motion.button
                  animate={{ x: noBtnPos.x, y: noBtnPos.y }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onMouseEnter={handleNoHover}
                  onTouchStart={handleNoHover} // For mobile
                  onClick={handleNoHover}
                  className="relative overflow-hidden rounded-full shadow-lg w-full h-full border-2 border-white/50 z-10"
                >
                  <img 
                    src="https://picsum.photos/id/109/200/200" 
                    alt="Dark scenery"
                    className="absolute inset-0 w-full h-full object-cover grayscale opacity-70"
                  />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-gray-300 font-bold text-xs">NO</span>
                  </div>
                </motion.button>
              </div>
            </div>
            
            <p className="text-rose-600 font-bold text-sm mt-8 bg-white/60 px-4 py-1 rounded-full shadow-sm">
              (There is only one correct choice)
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="accepted"
            className="z-20 flex flex-col items-center justify-end w-full h-full pb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background GIF container */}
            <motion.div 
              className="absolute inset-0 z-0 opacity-40 mix-blend-multiply pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.5, duration: 2 }}
            >
               <img 
                 src="https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif"
                 alt="Romantic background"
                 className="w-full h-full object-cover"
               />
            </motion.div>

            <div className="z-10 relative mb-12 text-center bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-xl mx-4">
              <motion.h2 
                className="text-5xl md:text-7xl font-handwriting text-rose-600 mb-4 drop-shadow-md"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 3.5, type: 'spring' }}
              >
                YAY! You said yess!
              </motion.h2>
              <motion.p
                 className="text-rose-800 font-serif text-lg font-semibold"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 4 }}
              >
                See you on Feb 14th, my strawberry 🍓
              </motion.p>
            </div>

            <RoseAnimation />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};