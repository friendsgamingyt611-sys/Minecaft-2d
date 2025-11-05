

import { Camera } from '../entities/Camera';
import { ChunkSystem } from '../world/ChunkSystem';
import { Player } from '../entities/Player';
import { BlockRenderer } from './BlockRenderer';
import { BLOCK_SIZE, REACH_DISTANCE } from '../core/Constants';
import { MouseHandler } from '../input/MouseHandler';
import { PlayerRenderer } from './PlayerRenderer';
import { AnimationSystem } from './AnimationSystem';
import { getBlockType } from '../world/BlockRegistry';
import { ItemEntity } from '../entities/ItemEntity';
import { SettingsManager } from '../core/SettingsManager';

export class RenderEngine {
  private camera: Camera;
  private blockRenderer: BlockRenderer;
  private playerRenderer: PlayerRenderer;

  constructor(camera: Camera) {
    this.camera = camera;
    this.blockRenderer = new BlockRenderer();
    this.playerRenderer = new PlayerRenderer();
  }

  public render(ctx: CanvasRenderingContext2D, world: ChunkSystem, player: Player, mouseHandler: MouseHandler, animationSystem: AnimationSystem, itemEntities: ItemEntity[]): void {
    // Sky background
    ctx.fillStyle = '#63a3ff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(-this.camera.position.x, -this.camera.position.y);

    // Render world
    this.renderWorld(ctx, world);
    
    // Render item entities
    itemEntities.forEach(entity => entity.render(ctx, this.blockRenderer));
    
    // Render player
    this.playerRenderer.render(ctx, player, animationSystem.getPose(player));
    
    // Render particles
    this.renderParticles(ctx, player);
    
    // Render interactive area highlight
    if (SettingsManager.instance.settings.renderInteractiveArea) {
        this.renderInteractiveArea(ctx, player);
    }
    
    // Render block highlight and breaking progress
    this.renderBlockHighlightAndBreaking(ctx, player, world);

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
  
  private renderParticles(ctx: CanvasRenderingContext2D, player: Player): void {
    player.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }

  private renderInteractiveArea(ctx: CanvasRenderingContext2D, player: Player): void {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.position.x + player.width / 2, player.position.y + player.height / 2, REACH_DISTANCE, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }
  
  private renderBlockHighlightAndBreaking(ctx: CanvasRenderingContext2D, player: Player, world: ChunkSystem): void {
    if (player.targetBlock) {
        const { x: blockX, y: blockY } = player.targetBlock;
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(blockX * BLOCK_SIZE, blockY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

        if (player.breakingBlock && player.breakingBlock.x === blockX && player.breakingBlock.y === blockY) {
            const blockType = getBlockType(world.getBlock(blockX, blockY));
            if (blockType && blockType.hardness > 0) {
                const progress = player.breakingBlock.progress / blockType.hardness;
                this.renderBreakingProgress(ctx, blockX * BLOCK_SIZE, blockY * BLOCK_SIZE, progress);
            }
        }
    }
  }

  private renderBreakingProgress(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
    if (progress <= 0.01 || progress >= 1) return;

    const centerX = x + BLOCK_SIZE / 2;
    const centerY = y + BLOCK_SIZE / 2;
    const radius = BLOCK_SIZE * 0.4;
    
    ctx.save();

    // Outer circle outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Filling pie
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}