
import React, { useRef, useEffect } from 'react';
import { GameEngine } from './core/GameEngine';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      // Adjust canvas size to fit window while maintaining aspect ratio
      const aspectRatio = 16 / 9; // New 16:9 aspect ratio
      const resizeCanvas = () => {
        const { innerWidth, innerHeight } = window;
        let width = innerWidth;
        let height = innerWidth / aspectRatio;

        if (height > innerHeight) {
          height = innerHeight;
          width = innerHeight * aspectRatio;
        }
        
        canvas.width = 1280; // New Game resolution: 20 blocks * 64px
        canvas.height = 720; // New Game resolution: 11.25 blocks * 64px
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      const gameEngine = new GameEngine(canvas);
      gameEngine.start();

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        gameEngine.stop();
      };
    }
  }, []);

  return <canvas ref={canvasRef} className="shadow-2xl" style={{ border: '2px solid #4a5568' }}></canvas>;
};

export default App;
