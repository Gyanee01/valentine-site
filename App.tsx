import React, { useState, useCallback, useEffect } from 'react';
import { EnvelopeScene } from './components/EnvelopeScene';
import { ValentineScene } from './components/ValentineScene';
import { SceneState } from './types';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [scene, setScene] = useState<SceneState>(SceneState.ENVELOPE);

  // Preload images for smoother transition
  useEffect(() => {
    const img1 = new Image();
    const img2 = new Image();
    img1.src = "https://picsum.photos/id/102/300/300";
    img2.src = "https://picsum.photos/id/109/300/300";
  }, []);

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ffccd5', '#ff4d6d', '#fff0f3']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ffccd5', '#ff4d6d', '#fff0f3']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handleOpenEnvelope = () => {
    triggerConfetti();
    setScene(SceneState.VALENTINE);
  };

  const handleAcceptProposal = () => {
    // Big celebration burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e11d48', '#fb7185', '#ffe4e6']
    });
    setScene(SceneState.ACCEPTED);
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {scene === SceneState.ENVELOPE && (
        <EnvelopeScene onOpen={handleOpenEnvelope} />
      )}
      
      {(scene === SceneState.VALENTINE || scene === SceneState.ACCEPTED) && (
        <ValentineScene 
          sceneState={scene} 
          onAccept={handleAcceptProposal} 
        />
      )}
    </div>
  );
};

export default App;