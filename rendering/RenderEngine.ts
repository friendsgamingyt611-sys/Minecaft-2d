
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
import { BlockId } from '../types';

export class RenderEngine {
  private camera: Camera;
  private blockRenderer: BlockRenderer;
  private playerRenderer: PlayerRenderer;
  private clouds: {x: number, y: number, size: number, speed: number}[] = [];
  
  // V3.0 Lighting System
  private lightMap: Map<string, number> = new Map();
  private readonly MAX_LIGHT_DISTANCE = 15;


  constructor(camera: Camera) {
    this.camera = camera;
    this.blockRenderer = new BlockRenderer();
    this.playerRenderer = new PlayerRenderer();
    this.initializeClouds();
  }

  private initializeClouds() {
      const cloudWorldWidth = 4000;
      for (let i = 0; i < 15; i++) {
          this.clouds.push({
              x: Math.random() * cloudWorldWidth - cloudWorldWidth / 2,
              y: Math.random() * 150 + 20,
              size: Math.random() * 100 + 50,
              speed: (Math.random() * 10 + 5) / 60, // pixels per frame
          });
      }
  }

  private renderClouds(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const parallaxFactor = 0.5;
      const viewLeft = this.camera.position.x * parallaxFactor;
      const cloudWorldWidth = 4000;

      this.clouds.forEach(cloud => {
          cloud.x += cloud.speed;
          if (cloud.x > cloudWorldWidth / 2) cloud.x -= cloudWorldWidth;
          
          const screenX = cloud.x - viewLeft;

          // Culling and drawing
          if (screenX > -cloud.size && screenX < this.camera.width + cloud.size) {
            ctx.beginPath();
            const segments = 5;
            for(let i=0; i<segments; i++) {
                const xOffset = (i - segments/2) * (cloud.size * 0.3);
                const yOffset = Math.sin((i / segments) * Math.PI) * (cloud.size * 0.2);
                const radius = cloud.size * (0.3 + Math.sin(i * 0.5) * 0.1);
                ctx.arc(screenX + xOffset, cloud.y + yOffset, radius, 0, Math.PI * 2);
            }
            ctx.fill();
          }
      });
  }

  public render(ctx: CanvasRenderingContext2D, world: ChunkSystem, player: Player, mouseHandler: MouseHandler, animationSystem: AnimationSystem, itemEntities: ItemEntity[]): void {
    // FIX: Draw the sky background across the entire canvas first.
    // The renderWorld method will then draw dark underground air blocks on top of this.
    ctx.fillStyle = '#63a3ff';
    ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    
    this.renderClouds(ctx);
    
    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.position.x, -this.camera.position.y);

    this.renderWorld(ctx, world);
    
    itemEntities.forEach(entity => entity.render(ctx, this.blockRenderer));
    
    player.xpSystem.render(ctx);

    this.playerRenderer.render(ctx, player, animationSystem.getPose(player));
    
    this.renderParticles(ctx, player);
    
    // FIX: Access setting from the correct 'gameplay' sub-object.
    if (SettingsManager.instance.settings.gameplay.renderInteractiveArea) {
        this.renderInteractiveArea(ctx, player);
    }
    
    this.renderBlockHighlightAndBreaking(ctx, player, world);

    ctx.restore();
    
    // Apply brightness overlay after everything else is drawn
    const brightness = SettingsManager.instance.settings.graphics.brightness / 100;
    const alpha = (1 - brightness) * 0.8; // Max 80% darkness
    if (alpha > 0.01) {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
  
  private calculateLightMap(world: ChunkSystem, startX: number, endX: number, startY: number, endY: number): void {
    this.lightMap.clear();
    const queue: {x: number, y: number, dist: number}[] = [];

    // 1. Seed the queue with all air blocks at or above the surface. These are the sky light sources.
    for (let x = startX; x < endX; x++) {
        const surfaceHeight = world.generator.getSurfaceHeight(x);
        for (let y = startY; y < endY; y++) {
            const blockId = world.getBlock(x, y);
            const key = `${x},${y}`;
            // A block is lit by the sky if it's air and at or above the natural terrain height.
            if (blockId === BlockId.AIR && y <= surfaceHeight) {
                if (!this.lightMap.has(key)) {
                    this.lightMap.set(key, 0); // Light level 0 is brightest
                    queue.push({x, y, dist: 0});
                }
            }
        }
    }

    // 2. Perform BFS to spread the light through non-solid blocks.
    let head = 0;
    while(head < queue.length) {
        const curr = queue[head++];
        if (curr.dist >= this.MAX_LIGHT_DISTANCE) continue;

        for (const offset of [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}]) {
            const nx = curr.x + offset.dx;
            const ny = curr.y + offset.dy;
            const neighborKey = `${nx},${ny}`;
            
            const neighborBlockId = world.getBlock(nx, ny);
            const neighborType = getBlockType(neighborBlockId);

            // Light can only spread through air and other non-solid or light-transparent blocks
            if ((!neighborType || !neighborType.isSolid || neighborType.isLightTransparent) && !this.lightMap.has(neighborKey)) {
                this.lightMap.set(neighborKey, curr.dist + 1);
                queue.push({x: nx, y: ny, dist: curr.dist + 1});
            }
        }
    }
  }

  private renderWorld(ctx: CanvasRenderingContext2D, world: ChunkSystem): void {
    const viewWidth = this.camera.width / this.camera.zoom;
    const viewHeight = this.camera.height / this.camera.zoom;
    
    const lightBoundsExpand = this.MAX_LIGHT_DISTANCE + 2;
    const lightStartX = Math.floor(this.camera.position.x / BLOCK_SIZE) - lightBoundsExpand;
    const lightEndX = lightStartX + Math.ceil(viewWidth / BLOCK_SIZE) + lightBoundsExpand * 2;
    const lightStartY = Math.floor(this.camera.position.y / BLOCK_SIZE) - lightBoundsExpand;
    const lightEndY = lightStartY + Math.ceil(viewHeight / BLOCK_SIZE) + lightBoundsExpand * 2;
    
    this.calculateLightMap(world, lightStartX, lightEndX, lightStartY, lightEndY);

    const renderStartX = Math.floor(this.camera.position.x / BLOCK_SIZE) - 1;
    const renderEndX = renderStartX + Math.ceil(viewWidth / BLOCK_SIZE) + 2;
    const renderStartY = Math.floor(this.camera.position.y / BLOCK_SIZE) - 1;
    const renderEndY = renderStartY + Math.ceil(viewHeight / BLOCK_SIZE) + 2;

    for (let y = renderStartY; y < renderEndY; y++) {
      for (let x = renderStartX; x < renderEndX; x++) {
        const blockId = world.getBlock(x, y);
        const key = `${x},${y}`;

        if (blockId === BlockId.AIR) {
            // If air is not in the light map, it's underground. Draw the dark background.
            if (!this.lightMap.has(key)) {
                ctx.fillStyle = '#211d1c';
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
            continue;
        }
        
        const blockType = getBlockType(blockId);
        if (!blockType) continue;

        this.blockRenderer.render(ctx, blockId, x * BLOCK_SIZE, y * BLOCK_SIZE);
        
        const lightKey = blockType.isLightTransparent ? key : null;
        let minNeighborDist = Infinity;

        if (lightKey && this.lightMap.has(lightKey)) {
             minNeighborDist = this.lightMap.get(lightKey)!;
        } else if (blockType.isSolid && !blockType.isLightTransparent) {
            for (const offset of [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}]) {
                const neighborKey = `${x + offset.dx},${y + offset.dy}`;
                if (this.lightMap.has(neighborKey)) {
                    minNeighborDist = Math.min(minNeighborDist, this.lightMap.get(neighborKey)!);
                }
            }
        } else {
             minNeighborDist = 0; // Don't darken transparent blocks themselves
        }


        if (minNeighborDist === Infinity) {
            // Block is not adjacent to any lit air, so it's fully dark.
            ctx.fillStyle = 'rgba(0,0,0,0.95)';
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        } else {
            // The light level of the block is based on the distance of the nearest lit air.
            const alpha = Math.min(0.95, (minNeighborDist / this.MAX_LIGHT_DISTANCE) * 1.0);
            if (alpha > 0.01) {
                ctx.fillStyle = `rgba(0,0,0,${alpha})`;
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
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
        ctx.lineWidth = 2 / this.camera.zoom; // Keep line width consistent on screen
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

    const crackSize = BLOCK_SIZE * 0.8;
    const crackOffset = (BLOCK_SIZE - crackSize) / 2;
    
    ctx.save();
    ctx.lineWidth = 3 / this.camera.zoom;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    
    ctx.beginPath();
    ctx.rect(x + crackOffset, y + crackOffset, crackSize, crackSize);
    ctx.clip();

    ctx.beginPath();
    const crackProgress = crackSize * progress;
    ctx.moveTo(x + crackOffset, y + crackOffset + crackProgress);
    ctx.lineTo(x + crackOffset + crackSize, y + crackOffset + crackProgress);
    ctx.stroke();
    
    ctx.restore();
  }
}
