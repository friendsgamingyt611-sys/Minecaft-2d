
import { Vector2 } from '../types';

export class MouseHandler {
  public position: Vector2 = { x: 0, y: 0 };
  public isLeftDown: boolean = false;
  public isRightDown: boolean = false;
  
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.addEventListeners();
  }

  dispose() {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private addEventListeners() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  private handleMouseMove = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.position.x = (event.clientX - rect.left) * scaleX;
    this.position.y = (event.clientY - rect.top) * scaleY;
  };

  private handleMouseDown = (event: MouseEvent) => {
    if (event.button === 0) {
      this.isLeftDown = true;
    } else if (event.button === 2) {
      this.isRightDown = true;
    }
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      this.isLeftDown = false;
    } else if (event.button === 2) {
      this.isRightDown = false;
    }
  };
  
  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
}
