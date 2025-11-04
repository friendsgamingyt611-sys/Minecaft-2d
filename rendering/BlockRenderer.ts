
import { BlockId } from '../types';
import { getBlockType } from '../world/BlockRegistry';
import { BLOCK_SIZE } from '../core/Constants';

export class BlockRenderer {
  public render(ctx: CanvasRenderingContext2D, blockId: BlockId, x: number, y: number): void {
    if (blockId === BlockId.AIR) return;

    const blockType = getBlockType(blockId);
    if (blockType) {
        if (blockType.texture) {
            blockType.texture(ctx, x, y, BLOCK_SIZE);
        } else {
            ctx.fillStyle = blockType.color;
            ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
        }
        
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}
