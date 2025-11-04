
import { SceneManager } from '../scenes/SceneManager';
import { TitleScene } from '../scenes/TitleScene';
import { InputManager } from '../input/InputManager';
import { MouseHandler } from '../input/MouseHandler';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private mouseHandler: MouseHandler;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = context;
    this.inputManager = new InputManager();
    this.mouseHandler = new MouseHandler(this.canvas);
    this.sceneManager = new SceneManager(this.inputManager, this.mouseHandler);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sceneManager.pushScene(new TitleScene(this.sceneManager));
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    this.inputManager.dispose();
    this.mouseHandler.dispose();
  }

  private gameLoop = (timestamp: number) => {
    if (!this.isRunning) return;
    
    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number) {
    this.sceneManager.update(deltaTime);
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.sceneManager.render(this.ctx);
  }
}
