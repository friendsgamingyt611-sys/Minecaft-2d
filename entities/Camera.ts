import { Vector2 } from '../types';
import { Player } from './Player';

export class Camera {
  public position: Vector2 = { x: 0, y: 0 };
  private target: Player;
  // FIX: Made width and height public to allow access from RenderEngine.
  public width: number;
  public height: number;
  private smoothSpeed: number = 0.1;

  constructor(width: number, height: number, target: Player) {
    this.width = width;
    this.height = height;
    this.target = target;
    this.position.x = this.target.position.x - this.width / 2;
    this.position.y = this.target.position.y - this.height / 2;
  }

  update(deltaTime: number): void {
    const targetX = this.target.position.x - this.width / 2 + this.target.width / 2;
    const targetY = this.target.position.y - this.height / 2 + this.target.height / 2;

    this.position.x += (targetX - this.position.x) * this.smoothSpeed;
    this.position.y += (targetY - this.position.y) * this.smoothSpeed;
  }
  
  public screenToWorld(screenPos: Vector2): Vector2 {
    return {
        x: screenPos.x + this.position.x,
        y: screenPos.y + this.position.y
    };
  }
}