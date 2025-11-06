
import { Vector2 } from '../types';
import { Player } from './Player';

export class Camera {
  public position: Vector2 = { x: 0, y: 0 };
  private target: Player;
  public width: number;
  public height: number;
  private smoothSpeed: number = 0.1;
  public zoom: number = 1.5;

  constructor(width: number, height: number, target: Player) {
    this.width = width;
    this.height = height;
    this.target = target;
    this.position.x = this.target.position.x - (this.width / this.zoom) / 2;
    this.position.y = this.target.position.y - (this.height / this.zoom) / 2;
  }

  update(deltaTime: number): void {
    const targetX = this.target.position.x + this.target.width / 2 - (this.width / this.zoom) / 2;
    const targetY = this.target.position.y + this.target.height / 2 - (this.height / this.zoom) / 2;

    this.position.x += (targetX - this.position.x) * this.smoothSpeed;
    this.position.y += (targetY - this.position.y) * this.smoothSpeed;
  }
  
  public screenToWorld(screenPos: Vector2): Vector2 {
    return {
        x: (screenPos.x / this.zoom) + this.position.x,
        y: (screenPos.y / this.zoom) + this.position.y
    };
  }
}
