

import { Vector2 } from '../types';

export class MouseHandler {
  public position: Vector2 = { x: 0, y: 0 };
  public isLeftDown: boolean = false;
  public isRightDown: boolean = false;
  public isMiddleDown: boolean = false;
  public isLeftClicked: boolean = false;
  public isRightClicked: boolean = false;
  public isMiddleClicked: boolean = false;
  public isLeftUp: boolean = false;
  public scrollDelta: number = 0;
  
  public isRightDoubleClicked: boolean = false;
  private lastRightClickTime: number = 0;
  
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
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  private addEventListeners() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('wheel', this.handleWheel);
  }

  public lateUpdate() {
      this.isLeftClicked = false;
      this.isRightClicked = false;
      this.isMiddleClicked = false;
      this.isLeftUp = false;
      this.isRightDoubleClicked = false;
      this.scrollDelta = 0;
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
      this.isLeftClicked = true;
    } else if (event.button === 1) {
      this.isMiddleDown = true;
      this.isMiddleClicked = true;
    } else if (event.button === 2) {
      this.isRightDown = true;
      this.isRightClicked = true;
      
      const now = Date.now();
      if (now - this.lastRightClickTime < 300) { // 300ms for double click
          this.isRightDoubleClicked = true;
      }
      this.lastRightClickTime = now;
    }
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      this.isLeftDown = false;
      this.isLeftUp = true;
    } else if (event.button === 1) {
      this.isMiddleDown = false;
    } else if (event.button === 2) {
      this.isRightDown = false;
    }
  };
  
  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    if (event.deltaY < 0) {
        this.scrollDelta = -1; // Up
    } else if (event.deltaY > 0) {
        this.scrollDelta = 1; // Down
    }
  }

  public consumeScroll(): number {
    const delta = this.scrollDelta;
    this.scrollDelta = 0;
    return delta;
  }
}