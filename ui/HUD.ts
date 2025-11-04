
import { Player } from '../entities/Player';
import { HOTBAR_SLOTS, HOTBAR_SLOT_SIZE, HOTBAR_ITEM_SIZE } from '../core/Constants';
import { BlockRenderer } from '../rendering/BlockRenderer';
import { getBlockType } from '../world/BlockRegistry';

export class HUD {
  private player: Player;
  private blockRenderer: BlockRenderer;

  constructor(player: Player) {
    this.player = player;
    this.blockRenderer = new BlockRenderer();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderHotbar(ctx);
    this.renderCrosshair(ctx);
  }

  private renderHotbar(ctx: CanvasRenderingContext2D): void {
    const hudWidth = HOTBAR_SLOTS * HOTBAR_SLOT_SIZE;
    const startX = (ctx.canvas.width - hudWidth) / 2;
    const startY = ctx.canvas.height - HOTBAR_SLOT_SIZE - 20;

    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const slotX = startX + i * HOTBAR_SLOT_SIZE;
      
      // Slot background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(slotX, startY, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE);

      // Slot border
      ctx.strokeStyle = this.player.activeHotbarSlot === i ? '#ffffff' : '#888888';
      ctx.lineWidth = 3;
      ctx.strokeRect(slotX, startY, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE);

      // Item in slot
      const itemId = this.player.hotbar[i];
      if (itemId !== null) {
        const itemX = slotX + (HOTBAR_SLOT_SIZE - HOTBAR_ITEM_SIZE) / 2;
        const itemY = startY + (HOTBAR_SLOT_SIZE - HOTBAR_ITEM_SIZE) / 2;
        
        const blockType = getBlockType(itemId);
        if (blockType) {
            if (blockType.texture) {
                blockType.texture(ctx, itemX, itemY, HOTBAR_ITEM_SIZE);
            } else {
                ctx.fillStyle = blockType.color;
                ctx.fillRect(itemX, itemY, HOTBAR_ITEM_SIZE, HOTBAR_ITEM_SIZE);
            }
        }
      }
    }
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D): void {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const size = 10;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - size, centerY);
    ctx.lineTo(centerX + size, centerY);
    ctx.moveTo(centerX, centerY - size);
    ctx.lineTo(centerX, centerY + size);
    ctx.stroke();
  }
}
