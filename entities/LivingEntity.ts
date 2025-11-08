import { Vector2, Particle } from '../types';
import { PhysicsSystem } from './PhysicsSystem';
import { GRAVITY, BLOCK_SIZE } from '../core/Constants';
import { Camera } from './Camera';

export abstract class LivingEntity {
  public id: string;
  public position: Vector2;
  public velocity: Vector2 = { x: 0, y: 0 };
  public width: number;
  public height: number;
  public health: number;
  public maxHealth: number;
  public onGround: boolean = false;
  public facingDirection: number = 1; // 1 = right, -1 = left
  public isAlive: boolean = true;
  
  // AI & Movement
  protected moveSpeed: number = 2;
  protected jumpForce: number = 10;
  
  // Combat
  protected damage: number = 1;
  protected attackRange: number = BLOCK_SIZE * 1.5;
  protected attackCooldown: number = 0;
  protected maxAttackCooldown: number = 1.0; // seconds
  
  // Visual
  // FIX: Make particles public so they can be rendered by the RenderEngine.
  public particles: Particle[] = [];
  protected damageFlashTimer: number = 0;
  
  constructor(position: Vector2, width: number, height: number, maxHealth: number) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.position = { ...position };
    this.width = width;
    this.height = height;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }
  
  public update(deltaTime: number, physics: PhysicsSystem): void {
    if (!this.isAlive) return;
    
    // Update timers
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= deltaTime;
    }
    
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= 60 * deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    
    // Apply physics
    // FIX: Cast `this` to `any` to resolve type mismatch with PhysicsEntity union type.
    // At runtime, `this` will be a concrete subclass (Player or Zombie) which is valid.
    physics.applyGravity(this as any);
    physics.applyFriction(this as any);
    physics.updatePositionAndCollision(this as any);
    
    // AI update (implemented by subclasses)
    this.updateAI(deltaTime);
  }
  
  protected abstract updateAI(deltaTime: number): void;
  
  public takeDamage(amount: number, source: string, camera?: Camera): void {
    if (!this.isAlive) return;
    
    this.health -= amount;
    this.damageFlashTimer = 0.2;
    
    // Damage particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.position.x + this.width / 2,
        y: this.position.y + this.height / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 3,
        life: 20,
        color: '#FF0000',
        size: 3
      });
    }
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  protected die(): void {
    this.isAlive = false;
    this.health = 0;
    
    // Death particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.position.x + this.width / 2,
        y: this.position.y + this.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 5,
        life: 40,
        color: '#888888',
        size: 4
      });
    }
  }
  
  public canAttack(): boolean {
    return this.attackCooldown <= 0;
  }
  
  protected attack(): void {
    this.attackCooldown = this.maxAttackCooldown;
  }
  
  public abstract render(ctx: CanvasRenderingContext2D): void;
  
  public shouldBeRemoved(): boolean {
    return !this.isAlive && this.particles.length === 0;
  }
}
