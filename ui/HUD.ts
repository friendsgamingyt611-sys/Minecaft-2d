import { Player } from '../entities/Player';
import { HOTBAR_SLOTS, HOTBAR_SLOT_SIZE, HOTBAR_ITEM_SIZE, MAX_HEALTH, MAX_HUNGER, BLOCK_SIZE } from '../core/Constants';
import { BlockRenderer } from '../rendering/BlockRenderer';
import { getBlockType } from '../world/BlockRegistry';
import { TouchControlsUI } from './TouchControlsUI';
import { SettingsManager } from '../core/SettingsManager';
import { TouchHandler } from '../input/TouchHandler';
// FIX: The `Item` type is defined in `types.ts`, not `ItemRegistry.ts`.
// Updated imports to reflect the correct source for the `Item` interface.
import { ItemRegistry } from '../inventory/ItemRegistry';
import { Item } from '../types';

export class HUD {
  private player: Player;
  private blockRenderer: BlockRenderer;
  private touchControlsUI: TouchControlsUI;
  private touchHandler: TouchHandler;
  private togglePauseCallback: () => void;
  private canvas: HTMLCanvasElement;
  
  private lastFrameTimes: number[] = [];
  private fps: number = 0;

  private pauseButtonRect: { x: number, y: number, w: number, h: number };
  private autoSaveIndicatorTimer: number = 0;
  public showDebugOverlay: boolean = false;

  // Hotbar selection animation state
  private lastSelectedSlot: number = -1;
  private selectionChangeTime: number = 0;
  
  // Notification
  private notification: { text: string, timer: number } | null = null;


  constructor(player: Player, touchControlsUI: TouchControlsUI, touchHandler: TouchHandler, togglePause: () => void) {
    this.player = player;
    this.blockRenderer = new BlockRenderer();
    this.touchControlsUI = new TouchControlsUI(touchHandler);
    this.touchHandler = touchHandler;
    this.togglePauseCallback = togglePause;
    this.canvas = document.querySelector('canvas')!;

    const size = 50 * this.guiScale;
    this.pauseButtonRect = { x: this.canvas.width - size - 15, y: 15, w: size, h: size};
  }
  
  private get guiScale(): number {
      return SettingsManager.instance.settings.graphics.guiScale;
  }
  
  public showNotification(text: string, duration: number = 3) {
      this.notification = { text, timer: duration * 60 };
  }
  
  public displaySaveIndicator(): void {
      this.autoSaveIndicatorTimer = 180; // 3 seconds at 60fps
  }

  public toggleDebugOverlay(): void {
    this.showDebugOverlay = !this.showDebugOverlay;
  }
  
  public update(deltaTime: number): void {
      if (this.autoSaveIndicatorTimer > 0) {
          this.autoSaveIndicatorTimer -= 60 * deltaTime;
      }
      if (this.notification && this.notification.timer > 0) {
          this.notification.timer -= 60 * deltaTime;
          if (this.notification.timer <= 0) this.notification = null;
      }
      if (this.player.activeHotbarSlot !== this.lastSelectedSlot) {
        this.lastSelectedSlot = this.player.activeHotbarSlot;
        this.selectionChangeTime = Date.now();
      }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    while (this.lastFrameTimes.length > 0 && this.lastFrameTimes[0] <= now - 1000) {
      this.lastFrameTimes.shift();
    }
    this.lastFrameTimes.push(now);
    this.fps = this.lastFrameTimes.length;
    
    if (this.player.gamemode === 'survival' || this.player.gamemode === 'creative' && (this.player.health < MAX_HEALTH)) {
        this.renderHealthBar(ctx);
    }
    if (this.player.gamemode === 'survival') {
        this.renderHungerBar(ctx);
        this.renderXpBar(ctx);
    }
    
    this.renderHotbar(ctx);
    this.renderAttackIndicator(ctx);
    
    if (SettingsManager.instance.getEffectiveControlScheme() === 'touch') {
        this.touchControlsUI.render(ctx, this.player);
        this.renderPauseButton(ctx);
    }

    this.renderDebugInfo(ctx);
    this.renderAutoSaveIndicator(ctx);
    this.renderNotification(ctx);
  }
  
  private renderNotification(ctx: CanvasRenderingContext2D) {
      if (!this.notification) return;

      const alpha = Math.min(1, this.notification.timer / 30); // Fade out in last 0.5s
      ctx.font = `${24 * this.guiScale}px Minecraftia`;
      ctx.textAlign = 'center';

      const text = this.notification.text;
      const textMetrics = ctx.measureText(text);
      const x = ctx.canvas.width / 2;
      const y = 30 * this.guiScale;

      ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillText(text, x, y);
  }

  public getHotbarSlotRect(slotIndex: number): { x: number, y: number, w: number, h: number } {
      const scaledSlotSize = HOTBAR_SLOT_SIZE * this.guiScale;
      const hudWidth = HOTBAR_SLOTS * scaledSlotSize;
      const startX = (this.canvas.width - hudWidth) / 2;
      const startY = this.canvas.height - scaledSlotSize - (20 * this.guiScale);
      const slotX = startX + slotIndex * scaledSlotSize;
      return { x: slotX, y: startY, w: scaledSlotSize, h: scaledSlotSize };
  }

  private renderAutoSaveIndicator(ctx: CanvasRenderingContext2D) {
      const { gameplay } = SettingsManager.instance.settings;
      if (this.autoSaveIndicatorTimer > 0 && gameplay.autoSaveIndicator) {
          const text = "Saving...";
          ctx.font = `${18 * this.guiScale}px Minecraftia`;
          const textMetrics = ctx.measureText(text);
          const x = this.canvas.width - textMetrics.width - 15;
          const y = this.canvas.height - 15;

          const alpha = Math.min(1, this.autoSaveIndicatorTimer / 60);

          ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
          ctx.fillText(text, x + 1, y + 1);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillText(text, x, y);
      }
  }

  private renderPauseButton(ctx: CanvasRenderingContext2D) {
    for (const touch of this.touchHandler.justEndedTouches) {
        if (touch.x > this.pauseButtonRect.x && touch.x < this.pauseButtonRect.x + this.pauseButtonRect.w &&
            touch.y > this.pauseButtonRect.y && touch.y < this.pauseButtonRect.y + this.pauseButtonRect.h) {
            this.togglePauseCallback();
            break;
        }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(this.pauseButtonRect.x, this.pauseButtonRect.y, this.pauseButtonRect.w, this.pauseButtonRect.h);
    
    const barW = this.pauseButtonRect.w * 0.2;
    const barH = this.pauseButtonRect.h * 0.6;
    const barY = this.pauseButtonRect.y + this.pauseButtonRect.h * 0.2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(this.pauseButtonRect.x + this.pauseButtonRect.w * 0.25, barY, barW, barH);
    ctx.fillRect(this.pauseButtonRect.x + this.pauseButtonRect.w * 0.55, barY, barW, barH);
  }

  private renderDebugInfo(ctx: CanvasRenderingContext2D) {
    const { gameplay } = SettingsManager.instance.settings;
    if (!this.showDebugOverlay && !gameplay.showFps && !gameplay.showCoordinates && !gameplay.showBiome) return;

    ctx.font = `${18 * this.guiScale}px Minecraftia`;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    
    let infoLines = 0;
    if (this.showDebugOverlay || gameplay.showFps) infoLines++;
    if (this.showDebugOverlay || gameplay.showCoordinates) infoLines++;
    if (this.showDebugOverlay || gameplay.showBiome) infoLines++;
    if (this.showDebugOverlay) infoLines++; // For gamemode
    
    ctx.fillRect(5, 5, 250 * this.guiScale, 5 + infoLines * (20 * this.guiScale));
    
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    let yOffset = 25 * this.guiScale;
    const xOffset = 10 * this.guiScale;

    if (this.showDebugOverlay || gameplay.showFps) {
      ctx.fillText(`FPS: ${this.fps}`, xOffset, yOffset);
      yOffset += 20 * this.guiScale;
    }
    if (this.showDebugOverlay || gameplay.showCoordinates) {
      const x = (this.player.position.x / BLOCK_SIZE).toFixed(2);
      const y = (this.player.position.y / BLOCK_SIZE).toFixed(2);
      ctx.fillText(`X: ${x} Y: ${y}`, xOffset, yOffset);
      yOffset += 20 * this.guiScale;
    }
    if (this.showDebugOverlay || gameplay.showBiome) {
      const biome = this.player.world.generator.getBiome(Math.floor(this.player.position.x / BLOCK_SIZE));
      ctx.fillText(`Biome: ${biome.name}`, xOffset, yOffset);
      yOffset += 20 * this.guiScale;
    }
    if (this.showDebugOverlay) {
        ctx.fillText(`Mode: ${this.player.gamemode}`, xOffset, yOffset);
    }
  }

    private renderDurabilityBar(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, width: number): void {
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        const maxDurability = itemInfo?.toolInfo?.durability || itemInfo?.armorInfo?.durability;
        
        if (item.durability === undefined || !maxDurability || item.durability >= maxDurability) return;

        const durabilityPercent = item.durability / maxDurability;
        const barHeight = 4 * this.guiScale;
        const barY = y + width - barHeight - (2 * this.guiScale);
        
        let barColor = '#00FF00'; // Green
        if (durabilityPercent < 0.5) barColor = '#FFFF00'; // Yellow
        if (durabilityPercent < 0.25) barColor = '#FF0000'; // Red

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x + (2 * this.guiScale), barY, width - (4 * this.guiScale), barHeight);
        
        ctx.fillStyle = barColor;
        ctx.fillRect(x + (2 * this.guiScale), barY, (width - (4 * this.guiScale)) * durabilityPercent, barHeight);
    }

  private renderHotbar(ctx: CanvasRenderingContext2D): void {
    const scaledItemSize = HOTBAR_ITEM_SIZE * this.guiScale;
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const rect = this.getHotbarSlotRect(i);
      const isSelected = this.player.activeHotbarSlot === i;
      
      ctx.save();
      
      if (isSelected) {
          const elapsed = Date.now() - this.selectionChangeTime;
          const animProgress = Math.min(1, elapsed / 150); // 150ms animation
          const scale = 1 + Math.sin(animProgress * Math.PI) * 0.08;
          ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
          ctx.scale(scale, scale);
          ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
      }

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = isSelected ? '#ffffff' : '#888888';
      ctx.lineWidth = isSelected ? 6 * this.guiScale : 3 * this.guiScale;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      const item = this.player.inventory.getItem(i);
      if (item !== null) {
        const itemX = rect.x + (rect.w - scaledItemSize) / 2;
        const itemY = rect.y + (rect.h - scaledItemSize) / 2;
        
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        const blockId = itemInfo?.blockId;

        if (blockId) {
            const blockType = getBlockType(blockId);
            if (blockType) {
                if (blockType.texture) {
                    blockType.texture(ctx, itemX, itemY, scaledItemSize);
                } else {
                    ctx.fillStyle = blockType.color;
                    ctx.fillRect(itemX, itemY, scaledItemSize, scaledItemSize);
                }
            }
        }

        if (item.count > 1) {
            const text = item.count.toString();
            ctx.font = `${18 * this.guiScale}px Minecraftia`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            
            ctx.fillStyle = '#3f3f3f';
            ctx.fillText(text, rect.x + rect.w - 4, rect.y + rect.h - 4);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, rect.x + rect.w - 5, rect.y + rect.h - 5);
            
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        }

        this.renderDurabilityBar(ctx, item, rect.x, rect.y, rect.w);
      }
      ctx.restore();
    }
  }

    private renderAttackIndicator(ctx: CanvasRenderingContext2D): void {
        if (this.player.gamemode !== 'survival' || this.player.canAttack()) return;

        const cooldownPercent = this.player.getAttackCooldownPercent();
        
        const cx = ctx.canvas.width / 2;
        const cy = ctx.canvas.height / 2 + 30 * this.guiScale;

        const barWidth = 40 * this.guiScale;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(cx - barWidth/2, cy + 15 * this.guiScale, barWidth, 4 * this.guiScale);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - barWidth/2, cy + 15 * this.guiScale, barWidth * cooldownPercent, 4 * this.guiScale);
    }

  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const scaledSlotSize = HOTBAR_SLOT_SIZE * this.guiScale;
    const hudWidth = HOTBAR_SLOTS * scaledSlotSize;
    const startX = (ctx.canvas.width - hudWidth) / 2;
    const startY = ctx.canvas.height - scaledSlotSize - (20 * this.guiScale) - (30 * this.guiScale);
    const iconSize = 20 * this.guiScale;

    for (let i = 0; i < MAX_HEALTH / 2; i++) {
        const x = startX + i * (iconSize + 2 * this.guiScale);
        const y = startY;
        const healthValue = this.player.health - i * 2;

        this.drawHeart(ctx, x, y, iconSize, healthValue);
    }
  }
  
  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: number) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.35);
      ctx.bezierCurveTo(x + size / 2, y + size * 0.3, x, y, x, y + size * 0.4);
      ctx.bezierCurveTo(x, y + size * 0.8, x + size / 2, y + size, x + size / 2, y + size);
      ctx.bezierCurveTo(x + size / 2, y + size, x + size, y + size * 0.8, x + size, y + size * 0.4);
      ctx.bezierCurveTo(x + size, y, x + size / 2, y + size * 0.3, x + size / 2, y + size * 0.35);
      ctx.closePath();
      
      ctx.fillStyle = '#220000';
      ctx.fill();

      if (fill > 0) {
        if (fill >= 2) {
            ctx.fillStyle = '#ff4444';
        } else {
            ctx.clip();
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(x, y, size / 2, size);
        }
        ctx.fill();
      }
      ctx.restore();
  }

  private renderHungerBar(ctx: CanvasRenderingContext2D): void {
      const scaledSlotSize = HOTBAR_SLOT_SIZE * this.guiScale;
      const hudWidth = HOTBAR_SLOTS * scaledSlotSize;
      const startX = (ctx.canvas.width + hudWidth) / 2;
      const startY = ctx.canvas.height - scaledSlotSize - (20 * this.guiScale) - (30 * this.guiScale);
      const iconSize = 20 * this.guiScale;

      for (let i = 0; i < MAX_HUNGER / 2; i++) {
          const x = startX - (i + 1) * (iconSize + 2 * this.guiScale);
          const y = startY;
          const hungerValue = this.player.hunger - i * 2;
          this.drawDrumstick(ctx, x, y, iconSize, hungerValue);
      }
  }
  
  private drawDrumstick(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: number) {
    ctx.save();
    
    ctx.fillStyle = '#3a200a';
    ctx.beginPath();
    ctx.arc(x + size * 0.6, y + size * 0.6, size * 0.4, 0, Math.PI * 2);
    ctx.rect(x + size * 0.1, y + size * 0.1, size * 0.4, size * 0.4);
    ctx.fill();

    if (fill > 0) {
        ctx.fillStyle = '#8c531d';
        if (fill < 2) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x,y,size/2,size);
            ctx.clip();
        }
        ctx.beginPath();
        ctx.arc(x + size * 0.6, y + size * 0.6, size * 0.35, 0, Math.PI * 2);
        ctx.rect(x + size * 0.15, y + size * 0.15, size * 0.4, size * 0.4);
        ctx.fill();
        if (fill < 2) {
            ctx.restore();
        }

    }
    ctx.restore();
  }

  private renderXpBar(ctx: CanvasRenderingContext2D): void {
    const scaledSlotSize = HOTBAR_SLOT_SIZE * this.guiScale;
    const hudWidth = HOTBAR_SLOTS * scaledSlotSize;
    const barY = this.canvas.height - scaledSlotSize - (20 * this.guiScale) - (15 * this.guiScale);
    const barX = (this.canvas.width - hudWidth) / 2;
    const barHeight = 10 * this.guiScale;

    // Bar background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, hudWidth, barHeight);
    
    // XP Fill
    const requiredXp = this.player.getRequiredXPForLevel(this.player.level);
    const progress = this.player.experience / requiredXp;
    ctx.fillStyle = '#7FFF00';
    ctx.fillRect(barX, barY, hudWidth * progress, barHeight);
    
    // Level number
    if (this.player.level > 0) {
        const text = this.player.level.toString();
        ctx.font = `${20 * this.guiScale}px Minecraftia`;
        ctx.textAlign = 'center';

        ctx.fillStyle = '#3f3f3f'; // Shadow
        ctx.fillText(text, this.canvas.width / 2 + 1, barY - (10 * this.guiScale) + 1);
        ctx.fillStyle = '#80FF20'; // Main text
        ctx.fillText(text, this.canvas.width / 2, barY - (10 * this.guiScale));
    }
  }
}