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

function interpolateColor(color1: string, color2: string, factor: number): string {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


export class RenderEngine {
  private camera: Camera;
  private blockRenderer: BlockRenderer;
  private playerRenderer: PlayerRenderer;
  private clouds: {x: number, y: number, size: number, speed: number}[] = [];
  
  private lightMap: Map<string, number> = new Map();
  private readonly MAX_LIGHT_LEVEL = 15;


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
  
  private getSkyColor(worldTime: number): string {
    const dayColor = '#63a3ff';
    const nightColor = '#0b0d1c';
    const sunriseColor = '#ffaf4b';
    const sunsetColor = '#ff6a3d';

    if (worldTime >= 0 && worldTime < 500) { // Dawn
        return interpolateColor(nightColor, sunriseColor, worldTime / 500);
    } else if (worldTime >= 500 && worldTime < 1000) { // Sunrise
        return interpolateColor(sunriseColor, dayColor, (worldTime - 500) / 500);
    } else if (worldTime >= 1000 && worldTime < 12000) { // Day
        return dayColor;
    } else if (worldTime >= 12000 && worldTime < 13000) { // Sunset
        return interpolateColor(dayColor, sunsetColor, (worldTime - 12000) / 1000);
    } else if (worldTime >= 13000 && worldTime < 14000) { // Dusk
        return interpolateColor(sunsetColor, nightColor, (worldTime - 13000) / 1000);
    } else { // Night
        return nightColor;
    }
  }

  public render(ctx: CanvasRenderingContext2D, world: ChunkSystem, player: Player, mouseHandler: MouseHandler, animationSystem: AnimationSystem, itemEntities: ItemEntity[], worldTime: number): void {
    const skyColor = this.getSkyColor(worldTime);
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    
    this.renderClouds(ctx);
    
    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.position.x, -this.camera.position.y);

    this.renderWorld(ctx, world, worldTime);
    
    itemEntities.forEach(entity => entity.render(ctx, this.blockRenderer));
    
    player.xpSystem.render(ctx);

    this.playerRenderer.render(ctx, player, animationSystem.getPose(player));
    
    this.renderParticles(ctx, player);
    
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
  
  private calculateLightMap(world: ChunkSystem, startX: number, endX: number, startY: number, endY: number, worldTime: number): void {
    this.lightMap.clear();
    const queue: {x: number, y: number, light: number}[] = [];

    // 1. Determine sky light level
    let skyLightLevel = this.MAX_LIGHT_LEVEL;
    const MIN_NIGHT_LIGHT = 4;
    if (worldTime > 13000 && worldTime < 23000) { // Full night
        skyLightLevel = MIN_NIGHT_LIGHT;
    } else if (worldTime >= 12000 && worldTime <= 13000) { // Sunset
        const factor = (worldTime - 12000) / 1000;
        skyLightLevel = Math.round(this.MAX_LIGHT_LEVEL - (this.MAX_LIGHT_LEVEL - MIN_NIGHT_LIGHT) * factor);
    } else if (worldTime >= 23000 || worldTime < 1000) { // Sunrise
        const factor = worldTime >= 23000 ? (worldTime - 23000) / 1000 : (worldTime + 1000) / 1000;
        skyLightLevel = Math.round(MIN_NIGHT_LIGHT + (this.MAX_LIGHT_LEVEL - MIN_NIGHT_LIGHT) * factor);
    }
    skyLightLevel = Math.max(0, Math.min(this.MAX_LIGHT_LEVEL, skyLightLevel));
    
    // 2. Seed queue with all light sources (block and sky)
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const key = `${x},${y}`;
            const blockId = world.getBlock(x, y);
            const blockType = getBlockType(blockId);
            
            // Check for block light sources
            if (blockType && blockType.lightLevel && blockType.lightLevel > 0) {
                this.lightMap.set(key, blockType.lightLevel);
                queue.push({x, y, light: blockType.lightLevel});
            }

            // Check for sky light sources
            if (skyLightLevel > 0 && blockId === BlockId.AIR && y <= world.generator.getSurfaceHeight(x)) {
                if ((this.lightMap.get(key) || 0) < skyLightLevel) {
                    this.lightMap.set(key, skyLightLevel);
                    queue.push({x, y, light: skyLightLevel});
                }
            }
        }
    }
    
    // 3. Perform BFS to spread the light
    let head = 0;
    while(head < queue.length) {
        const curr = queue[head++];
        if (curr.light <= 1) continue;

        for (const offset of [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}]) {
            const nx = curr.x + offset.dx;
            const ny = curr.y + offset.dy;
            const neighborKey = `${nx},${ny}`;
            
            const neighborBlockId = world.getBlock(nx, ny);
            const neighborType = getBlockType(neighborBlockId);

            if (neighborType && neighborType.isSolid && !neighborType.isLightTransparent) {
                continue;
            }
            
            const newLight = curr.light - 1;

            if (newLight > (this.lightMap.get(neighborKey) || 0)) {
                this.lightMap.set(neighborKey, newLight);
                queue.push({x: nx, y: ny, light: newLight});
            }
        }
    }
  }

  private renderWorld(ctx: CanvasRenderingContext2D, world: ChunkSystem, worldTime: number): void {
    const viewWidth = this.camera.width / this.camera.zoom;
    const viewHeight = this.camera.height / this.camera.zoom;
    
    const lightBoundsExpand = this.MAX_LIGHT_LEVEL + 2;
    const lightStartX = Math.floor(this.camera.position.x / BLOCK_SIZE) - lightBoundsExpand;
    const lightEndX = lightStartX + Math.ceil(viewWidth / BLOCK_SIZE) + lightBoundsExpand * 2;
    const lightStartY = Math.floor(this.camera.position.y / BLOCK_SIZE) - lightBoundsExpand;
    const lightEndY = lightStartY + Math.ceil(viewHeight / BLOCK_SIZE) + lightBoundsExpand * 2;
    
    this.calculateLightMap(world, lightStartX, lightEndX, lightStartY, lightEndY, worldTime);

    const renderStartX = Math.floor(this.camera.position.x / BLOCK_SIZE) - 1;
    const renderEndX = renderStartX + Math.ceil(viewWidth / BLOCK_SIZE) + 2;
    const renderStartY = Math.floor(this.camera.position.y / BLOCK_SIZE) - 1;
    const renderEndY = renderStartY + Math.ceil(viewHeight / BLOCK_SIZE) + 2;

    for (let y = renderStartY; y < renderEndY; y++) {
      for (let x = renderStartX; x < renderEndX; x++) {
        const blockId = world.getBlock(x, y);

        if (blockId === BlockId.AIR) {
            const lightLevel = this.lightMap.get(`${x},${y}`) || 0;
            if (lightLevel === 0) {
                 ctx.fillStyle = '#211d1c';
                 ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
            continue;
        }
        
        const blockType = getBlockType(blockId);
        if (!blockType) continue;

        this.blockRenderer.render(ctx, blockId, x * BLOCK_SIZE, y * BLOCK_SIZE);
        
        let finalLightLevel = 0;
        if (blockType.isLightTransparent || !blockType.isSolid) {
            finalLightLevel = this.lightMap.get(`${x},${y}`) || 0;
        } else {
            let maxNeighborLight = 0;
            for (const offset of [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}]) {
                const neighborKey = `${x + offset.dx},${y + offset.dy}`;
                maxNeighborLight = Math.max(maxNeighborLight, this.lightMap.get(neighborKey) || 0);
            }
            finalLightLevel = maxNeighborLight;
        }

        if (blockType.lightLevel) {
            finalLightLevel = Math.max(finalLightLevel, blockType.lightLevel);
        }

        const alpha = Math.min(0.95, (this.MAX_LIGHT_LEVEL - finalLightLevel) / this.MAX_LIGHT_LEVEL);
        if (alpha > 0.01) {
            ctx.fillStyle = `rgba(0,0,0,${alpha})`;
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
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