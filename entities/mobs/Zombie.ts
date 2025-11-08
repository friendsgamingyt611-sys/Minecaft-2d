import { LivingEntity } from '../LivingEntity';
import { ItemId, Vector2 } from '../../types';
import { BLOCK_SIZE } from '../../core/Constants';
import { Player } from '../Player';
import { Camera } from '../Camera';

export class Zombie extends LivingEntity {
  private target: Player | null = null;
  private detectionRange: number = BLOCK_SIZE * 16;
  private idleTimer: number = 0;
  private wanderDirection: number = 0;
  
  // Appearance
  private skinColor: string = '#7a9c6f';
  private clothesColor: string = '#4a6745';
  
  constructor(position: Vector2) {
    super(position, BLOCK_SIZE * 0.75, BLOCK_SIZE * 1.8, 20);
    this.moveSpeed = 2;
    this.damage = 3;
    this.maxAttackCooldown = 1.5;
  }
  
  public setTarget(player: Player): void {
    this.target = player;
  }
  
  protected updateAI(deltaTime: number): void {
    if (!this.target) return;
    
    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distanceSquared = dx * dx + dy * dy;
    
    // Check if player is in detection range
    if (distanceSquared > this.detectionRange * this.detectionRange) {
      // Idle/wander behavior
      this.idleTimer -= deltaTime;
      if (this.idleTimer <= 0) {
        this.wanderDirection = Math.random() < 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        this.idleTimer = 2 + Math.random() * 3;
      }
      this.velocity.x = this.wanderDirection * this.moveSpeed * 0.5;
      return;
    }
    
    // Face target
    this.facingDirection = dx > 0 ? 1 : -1;
    
    // Check if in attack range
    const distance = Math.sqrt(distanceSquared);
    if (distance <= this.attackRange) {
      // Attack player
      this.velocity.x = 0; // Stop moving
      if (this.canAttack()) {
        this.attackTarget();
      }
    } else {
      // Move toward player
      this.velocity.x = this.facingDirection * this.moveSpeed;
      
      // Jump if blocked
      const nextX = Math.floor((this.position.x + this.velocity.x * deltaTime + (this.facingDirection > 0 ? this.width : 0)) / BLOCK_SIZE);
      const currentY = Math.floor((this.position.y + this.height) / BLOCK_SIZE);
      if (this.onGround && this.target.world.getBlock(nextX, currentY - 1) !== 0) {
        this.velocity.y = -this.jumpForce;
      }
    }
  }
  
  private attackTarget(): void {
    if (!this.target || !this.canAttack()) return;
    
    this.attack();
    
    // Calculate if hit connects (simple AABB check)
    const zombieAttackBox = {
      x: this.position.x + (this.facingDirection > 0 ? this.width : -this.attackRange),
      y: this.position.y,
      width: this.attackRange,
      height: this.height
    };
    
    const playerBox = {
      x: this.target.position.x,
      y: this.target.position.y,
      width: this.target.width,
      height: this.target.height
    };
    
    if (this.checkCollision(zombieAttackBox, playerBox)) {
      this.target.takeDamage(this.damage, "Zombie");
      
      // Knockback
      this.target.velocity.x = this.facingDirection * 6;
      this.target.velocity.y = -4;
    }
  }
  
  private checkCollision(box1: any, box2: any): boolean {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }
  
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // Flash red when damaged
    if (this.damageFlashTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.damageFlashTimer * 30) * 0.5;
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
      ctx.globalAlpha = 1.0;
    }
    
    // Simple zombie rendering (placeholder - enhance later)
    // Head
    ctx.fillStyle = this.skinColor;
    ctx.fillRect(
      this.position.x,
      this.position.y,
      this.width,
      this.height * 0.4
    );
    
    // Body
    ctx.fillStyle = this.clothesColor;
    ctx.fillRect(
      this.position.x,
      this.position.y + this.height * 0.4,
      this.width,
      this.height * 0.6
    );
    
    // Eyes (red and menacing)
    const eyeY = this.position.y + this.height * 0.15;
    const eyeSize = 4;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(this.position.x + this.width * 0.2, eyeY, eyeSize, eyeSize);
    ctx.fillRect(this.position.x + this.width * 0.6, eyeY, eyeSize, eyeSize);
    
    // Render particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 40;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    
    ctx.globalAlpha = 1.0;
    
    // Health bar
    if (this.health < this.maxHealth) {
      const barWidth = this.width;
      const barHeight = 4;
      const barY = this.position.y - 10;
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.position.x, barY, barWidth, barHeight);
      
      ctx.fillStyle = this.health / this.maxHealth > 0.5 ? '#00FF00' : (this.health / this.maxHealth > 0.25 ? '#FFFF00' : '#FF0000');
      ctx.fillRect(this.position.x, barY, barWidth * (this.health / this.maxHealth), barHeight);
    }
    
    ctx.restore();
  }
  
  public dropLoot(): { itemId: number, count: number }[] {
    const loot: { itemId: number, count: number }[] = [];
    
    // Rotten flesh (always drops 0-2)
    const fleshCount = Math.floor(Math.random() * 3);
    if (fleshCount > 0) {
      loot.push({ itemId: ItemId.ROTTEN_FLESH, count: fleshCount });
    }
    
    // Rare drops
    if (Math.random() < 0.025) { // 2.5% chance
      loot.push({ itemId: ItemId.IRON_INGOT, count: 1 });
    }
    
    return loot;
  }
}
