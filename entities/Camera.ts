

import { Vector2 } from '../types';
import { Player } from './Player';
import { SettingsManager } from '../core/SettingsManager';

export class Camera {
  public position: Vector2 = { x: 0, y: 0 };
  private target: Player;
  public width: number;
  public height: number;
  private smoothSpeed: number = 0.1;
  public zoom: number = 1.0;
  
  // Camera Shake
  private shakeIntensity = 0;
  private shakeDuration = 0;

  constructor(width: number, height: number, target: Player) {
    this.width = width;
    this.height = height;
    this.target = target;
    this.updateZoom();
    this.position.x = this.target.position.x - (this.width / this.zoom) / 2;
    this.position.y = this.target.position.y - (this.height / this.zoom) / 2;
  }
  
  public triggerShake(intensity: number, duration: number) {
      const { accessibility, graphics } = SettingsManager.instance.settings;
      if (accessibility.reducedMotion) return;
      
      this.shakeIntensity = intensity * (graphics.cameraShakeIntensity / 100);
      this.shakeDuration = duration;
  }
  
  private updateZoom(): void {
      const fov = SettingsManager.instance.settings.graphics.fov;
      // This formula is an approximation. A higher FOV should mean a lower zoom level (more visible area).
      // We can map the 30-110 FOV range to a reasonable zoom range, e.g., 2.0 to 1.0.
      const minFov = 30, maxFov = 110;
      const minZoom = 2.5, maxZoom = 1.2;
      const fovPercent = (fov - minFov) / (maxFov - minFov);
      this.zoom = minZoom - (fovPercent * (minZoom - maxZoom));
  }

  update(deltaTime: number): void {
    this.updateZoom();
    const targetX = this.target.position.x + this.target.width / 2 - (this.width / this.zoom) / 2;
    const targetY = this.target.position.y + this.target.height / 2 - (this.height / this.zoom) / 2;

    this.position.x += (targetX - this.position.x) * this.smoothSpeed;
    this.position.y += (targetY - this.position.y) * this.smoothSpeed;
    
    if (this.shakeDuration > 0) {
        this.shakeDuration -= deltaTime;
        const shakeAngle = Math.random() * Math.PI * 2;
        const shakeAmount = this.shakeIntensity * (this.shakeDuration / 0.3); // Fade out
        this.position.x += Math.cos(shakeAngle) * shakeAmount;
        this.position.y += Math.sin(shakeAngle) * shakeAmount;
    } else {
        this.shakeIntensity = 0;
    }
  }
  
  public screenToWorld(screenPos: Vector2): Vector2 {
    return {
        x: (screenPos.x / this.zoom) + this.position.x,
        y: (screenPos.y / this.zoom) + this.position.y
    };
  }
}
