
import { BlockId, BlockType } from '../types';
import { BLOCK_SIZE } from '../core/Constants';

const blockRegistry = new Map<BlockId, BlockType>();

const BLOCK_TYPES: BlockType[] = [
  { id: BlockId.AIR, name: 'Air', color: 'rgba(0,0,0,0)', isSolid: false },
  { 
    id: BlockId.GRASS, name: 'Grass', color: '#6a9b3d', isSolid: true,
    texture: (ctx, x, y, size) => {
      ctx.fillStyle = '#8b5a2b'; // Dirt color
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#6a9b3d'; // Grass color
      ctx.fillRect(x, y, size, size / 4);
    }
  },
  { id: BlockId.DIRT, name: 'Dirt', color: '#8b5a2b', isSolid: true },
  { id: BlockId.STONE, name: 'Stone', color: '#808080', isSolid: true },
  { id: BlockId.BEDROCK, name: 'Bedrock', color: '#505050', isSolid: true, isIndestructible: true },
  { 
    id: BlockId.OAK_LOG, name: 'Oak Log', color: '#69512b', isSolid: true,
    texture: (ctx, x, y, size) => {
        ctx.fillStyle = '#69512b'; // Bark
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#9c7b4a'; // Inner wood
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#69512b';
        ctx.lineWidth = size * 0.05;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.25, 0, Math.PI * 2);
        ctx.stroke();
    }
  },
  { id: BlockId.OAK_LEAVES, name: 'Oak Leaves', color: '#2a752e', isSolid: true },
];

BLOCK_TYPES.forEach(block => blockRegistry.set(block.id, block));

export function getBlockType(id: BlockId): BlockType | undefined {
  return blockRegistry.get(id);
}
