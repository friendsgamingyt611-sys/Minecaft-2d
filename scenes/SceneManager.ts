
import { InputManager } from '../input/InputManager';
import { MouseHandler } from '../input/MouseHandler';

export interface Scene {
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  enter(): void;
  exit(): void;
}

export class SceneManager {
  private scenes: Scene[] = [];
  public inputManager: InputManager;
  public mouseHandler: MouseHandler;

  constructor(inputManager: InputManager, mouseHandler: MouseHandler) {
    this.inputManager = inputManager;
    this.mouseHandler = mouseHandler;
  }

  pushScene(scene: Scene) {
    if (this.scenes.length > 0) {
      this.scenes[this.scenes.length - 1].exit();
    }
    this.scenes.push(scene);
    scene.enter();
  }

  popScene() {
    if (this.scenes.length > 0) {
      this.scenes[this.scenes.length - 1].exit();
      this.scenes.pop();
    }
    if (this.scenes.length > 0) {
      this.scenes[this.scenes.length - 1].enter();
    }
  }
  
  switchScene(scene: Scene) {
    this.popScene();
    this.pushScene(scene);
  }

  update(deltaTime: number) {
    if (this.scenes.length > 0) {
      this.scenes[this.scenes.length - 1].update(deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.scenes.length > 0) {
      this.scenes[this.scenes.length - 1].render(ctx);
    }
  }
}
