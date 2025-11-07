

import { SceneManager } from '../scenes/SceneManager';
import { TitleScene } from '../scenes/TitleScene';
import { InputManager } from '../input/InputManager';
import { MouseHandler } from '../input/MouseHandler';
import { SettingsManager } from './SettingsManager';
import { TouchHandler } from '../input/TouchHandler';
import { SoundManager } from './SoundManager';
import { ProfileManager } from './ProfileManager';
import { ProfileCreationScene } from '../scenes/ProfileCreationScene';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private mouseHandler: MouseHandler;
  private touchHandler: TouchHandler;
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
    
    // Initialize managers
    SettingsManager.instance.load();
    ProfileManager.instance.loadProfiles();
    SoundManager.instance.preloadSounds();

    this.inputManager = new InputManager();
    this.mouseHandler = new MouseHandler(this.canvas);
    this.touchHandler = new TouchHandler(this.canvas);
    this.sceneManager = new SceneManager(this.inputManager, this.mouseHandler, this.touchHandler);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Check if a player profile exists, otherwise force creation
    if (!ProfileManager.instance.getActiveProfile()) {
        this.sceneManager.pushScene(new ProfileCreationScene(this.sceneManager));
    } else {
        this.sceneManager.pushScene(new TitleScene(this.sceneManager));
    }
    
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    this.inputManager.dispose();
    this.mouseHandler.dispose();
    this.touchHandler.dispose();
  }

  private gameLoop = (timestamp: number) => {
    if (!this.isRunning) return;
    
    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();
    
    // Centralize late updates for input handlers
    this.mouseHandler.lateUpdate();
    this.touchHandler.lateUpdate();

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
