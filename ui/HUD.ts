

import { Player } from '../entities/Player';
import { HOTBAR_SLOTS, HOTBAR_SLOT_SIZE, HOTBAR_ITEM_SIZE, MAX_HEALTH, MAX_HUNGER } from '../core/Constants';
import { BlockRenderer } from '../rendering/BlockRenderer';
import { getBlockType } from '../world/BlockRegistry';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { TouchControlsUI } from './TouchControlsUI';
import { SettingsManager } from '../core/SettingsManager';

export class HUD {
  private player: Player;
  private blockRenderer: BlockRenderer;
  private touchControlsUI: TouchControlsUI;
  private canvas: HTMLCanvasElement;

  constructor(player: Player, touchControlsUI: TouchControlsUI) {
    this.player = player;
    this.blockRenderer = new BlockRenderer();
    this.touchControlsUI = touchControlsUI;
    this.canvas = document.querySelector('canvas')!;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderHealthBar(ctx);
    this.renderHungerBar(ctx);
    this.renderHotbar(ctx);
    
    if (SettingsManager.instance.getEffectiveControlScheme() === 'touch') {
        this.touchControlsUI.render(ctx, this.player);
    }
  }

  public getHotbarSlotRect(slotIndex: number): { x: number, y: number, w: number, h: number } {
      const hudWidth = HOTBAR_SLOTS * HOTBAR_SLOT_SIZE;
      const startX = (this.canvas.width - hudWidth) / 2;
      const startY = this.canvas.height - HOTBAR_SLOT_SIZE - 20;
      const slotX = startX + slotIndex * HOTBAR_SLOT_SIZE;
      return { x: slotX, y: startY, w: HOTBAR_SLOT_SIZE, h: HOTBAR_SLOT_SIZE };
  }

  private renderHotbar(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const rect = this.getHotbarSlotRect(i);
      
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = this.player.activeHotbarSlot === i ? '#ffffff' : '#888888';
      ctx.lineWidth = 3;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      const item = this.player.inventory.getItem(i);
      if (item !== null) {
        const itemX = rect.x + (HOTBAR_SLOT_SIZE - HOTBAR_ITEM_SIZE) / 2;
        const itemY = rect.y + (HOTBAR_SLOT_SIZE - HOTBAR_ITEM_SIZE) / 2;
        
        const itemInfo = CraftingSystem.getItemInfo(item.id);
        const blockId = itemInfo?.blockId;

        if (blockId) {
            const blockType = getBlockType(blockId);
            if (blockType) {
                if (blockType.texture) {
                    blockType.texture(ctx, itemX, itemY, HOTBAR_ITEM_SIZE);
                } else {
                    ctx.fillStyle = blockType.color;
                    ctx.fillRect(itemX, itemY, HOTBAR_ITEM_SIZE, HOTBAR_ITEM_SIZE);
                }
            }
        }

        if (item.count > 1) {
            const text = item.count.toString();
            ctx.font = "18px Minecraftia";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            
            ctx.fillStyle = '#3f3f3f';
            ctx.fillText(text, rect.x + HOTBAR_SLOT_SIZE - 4, rect.y + HOTBAR_SLOT_SIZE - 4);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, rect.x + HOTBAR_SLOT_SIZE - 5, rect.y + HOTBAR_SLOT_SIZE - 5);
            
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        }
      }
    }
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const hudWidth = HOTBAR_SLOTS * HOTBAR_SLOT_SIZE;
    const startX = (ctx.canvas.width - hudWidth) / 2;
    const startY = ctx.canvas.height - HOTBAR_SLOT_SIZE - 20 - 30;
    const iconSize = 20;

    for (let i = 0; i < MAX_HEALTH / 2; i++) {
        const x = startX + i * (iconSize + 2);
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
      const hudWidth = HOTBAR_SLOTS * HOTBAR_SLOT_SIZE;
      const startX = (ctx.canvas.width + hudWidth) / 2;
      const startY = ctx.canvas.height - HOTBAR_SLOT_SIZE - 20 - 30;
      const iconSize = 20;

      for (let i = 0; i < MAX_HUNGER / 2; i++) {
          const x = startX - (i + 1) * (iconSize + 2);
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
}