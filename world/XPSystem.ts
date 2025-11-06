import { Vector2, XPOrb } from "../types";
import { GRAVITY } from "../core/Constants";

export class XPSystem {
  private orbs: XPOrb[] = [];
  
  public spawnXP(position: Vector2, amount: number): void {
    if (amount <= 0) return;
    // Split into multiple orbs for visual effect
    const orbValues = [];
    let remaining = Math.floor(amount);
    const sizes = [1, 3, 7, 17, 37, 73, 149]; // Standard minecraft orb values
    for(let i = sizes.length - 1; i >= 0; i--) {
        while(remaining >= sizes[i]) {
            orbValues.push(sizes[i]);
            remaining -= sizes[i];
        }
    }
    if (remaining > 0) orbValues.push(remaining);

    for (const value of orbValues) {
      this.orbs.push({
        position: { x: position.x + (Math.random() - 0.5) * 10, y: position.y },
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: -Math.random() * 10 - 5
        },
        value: value,
        lifetime: 6000, // 100 seconds
        collected: false
      });
    }
  }
  
  public update(deltaTime: number, playerPos: Vector2): number {
    let collectedXP = 0;
    
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      
      orb.lifetime -= deltaTime * 60;
      
      const dx = playerPos.x - orb.position.x;
      const dy = playerPos.y - orb.position.y;
      const distanceSq = dx * dx + dy * dy;
      
      // Move towards player when nearby
      if (distanceSq < 150 * 150) {
        const distance = Math.sqrt(distanceSq);
        const attractionSpeed = 10;
        orb.velocity.x += (dx / distance) * attractionSpeed * deltaTime;
        orb.velocity.y += (dy / distance) * attractionSpeed * deltaTime;
      }
      
      orb.velocity.y += GRAVITY * 0.5 * deltaTime * 60;
      orb.velocity.x *= 0.95;
      orb.velocity.y *= 0.98;
      
      orb.position.x += orb.velocity.x;
      orb.position.y += orb.velocity.y;
      
      // Collect if touching player
      if (distanceSq < 32 * 32) {
        orb.collected = true;
        collectedXP += orb.value;
      }
    }
    
    this.orbs = this.orbs.filter(o => !o.collected && o.lifetime > 0);
    
    return collectedXP;
  }
  
  public render(ctx: CanvasRenderingContext2D): void {
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      
      const size = 6 + Math.log(orb.value + 1);
      const pulse = Math.sin(Date.now() / 100 + orb.position.x) * 0.5 + 0.5;
      
      ctx.save();
      ctx.shadowColor = '#abff00';
      ctx.shadowBlur = 15 * pulse;
      ctx.fillStyle = '#7FFF00';
      ctx.beginPath();
      ctx.arc(orb.position.x, orb.position.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(orb.position.x - size*0.2, orb.position.y - size*0.2, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}