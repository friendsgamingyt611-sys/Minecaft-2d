
import { Camera } from '../entities/Camera';
import { ChunkSystem } from '../world/ChunkSystem';
import { Player } from '../entities/Player';
import { BlockRenderer } from './BlockRenderer';
import { BLOCK_SIZE, REACH_DISTANCE } from '../core/Constants';
import { Vector2 } from '../types';

export class RenderEngine {
  private camera: Camera;
  private blockRenderer: BlockRenderer;

  constructor(camera: Camera) {
    this.camera = camera;
    this.blockRenderer = new BlockRenderer();
  }

  public render(ctx: CanvasRenderingContext2D, world: ChunkSystem, player: Player, mousePosition: Vector2): void {
    // Sky background
    ctx.fillStyle = '#63a3ff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(-this.camera.position.x, -this.camera.position.y);

    // Render world
    this.renderWorld(ctx, world);
    
    // Render player
    this.renderPlayer(ctx, player);
    
    // Render particles
    this.renderParticles(ctx, player);

    // Render block highlight
    this.renderBlockHighlight(ctx, player, mousePosition);

    ctx.restore();
  }
  
  private renderWorld(ctx: CanvasRenderingContext2D, world: ChunkSystem): void {
    const startX = Math.floor(this.camera.position.x / BLOCK_SIZE) - 1;
    const endX = startX + Math.ceil(this.camera.width / BLOCK_SIZE) + 2;
    const startY = Math.floor(this.camera.position.y / BLOCK_SIZE) - 1;
    const endY = startY + Math.ceil(this.camera.height / BLOCK_SIZE) + 2;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const blockId = world.getBlock(x, y);
        this.blockRenderer.render(ctx, blockId, x * BLOCK_SIZE, y * BLOCK_SIZE);
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.position.x, player.position.y, player.width, player.height);
  }
  
  private renderParticles(ctx: CanvasRenderingContext2D, player: Player): void {
    player.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }
  
  private renderBlockHighlight(ctx: CanvasRenderingContext2D, player: Player, mousePosition: Vector2): void {
    const worldMouseX = mousePosition.x + this.camera.position.x;
    const worldMouseY = mousePosition.y + this.camera.position.y;
    
    const blockX = Math.floor(worldMouseX / BLOCK_SIZE);
    const blockY = Math.floor(worldMouseY / BLOCK_SIZE);
    
    const playerCenterX = player.position.x + player.width / 2;
    const playerCenterY = player.position.y + player.height / 2;
    const distance = Math.sqrt(Math.pow(worldMouseX - playerCenterX, 2) + Math.pow(worldMouseY - playerCenterY, 2));

    if (distance <= REACH_DISTANCE) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(blockX * BLOCK_SIZE, blockY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}
