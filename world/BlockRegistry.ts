

import { BlockId, BlockType, ItemId } from '../types';

function createOreTexture(baseColor: string, oreColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, x, y, size) => {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = oreColor;
        
        let seed = x * 13 + y * 37;
        const random = () => {
            const a = 1103515245;
            const c = 12345;
            const m = Math.pow(2, 31);
            seed = (a * seed + c) % m;
            return seed / m;
        };

        for(let i = 0; i < size / 4; i++) {
            const oreX = x + random() * (size - size/8);
            const oreY = y + random() * (size - size/8);
            const oreSize = random() * (size / 8) + (size / 16);
            ctx.fillRect(oreX, oreY, oreSize, oreSize);
        }
    };
}

const BLOCK_TYPES: BlockType[] = [
  { id: BlockId.AIR, name: 'Air', color: 'rgba(0,0,0,0)', isSolid: false, hardness: 0 },
  { 
    id: BlockId.GRASS, name: 'Grass', color: '#6a9b3d', isSolid: true, hardness: 36, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min:1, max:1},
    texture: (ctx, x, y, size) => {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#6a9b3d';
      ctx.fillRect(x, y, size, size * 0.25);
    }
  },
  { id: BlockId.DIRT, name: 'Dirt', color: '#8b5a2b', isSolid: true, hardness: 30, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min:1, max:1} },
  { id: BlockId.STONE, name: 'Stone', color: '#808080', isSolid: true, hardness: 90, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COBBLESTONE, min:1, max:1} },
  { id: BlockId.COBBLESTONE, name: 'Cobblestone', color: '#888888', isSolid: true, hardness: 120, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COBBLESTONE, min:1, max:1} },
  { id: BlockId.BEDROCK, name: 'Bedrock', color: '#505050', isSolid: true, isIndestructible: true, hardness: Infinity },
  // OAK
  { id: BlockId.OAK_LOG, name: 'Oak Log', color: '#69512b', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.OAK_LOG, min:1, max:1}},
  { id: BlockId.OAK_PLANKS, name: 'Oak Planks', color: '#af8f5b', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.OAK_PLANKS, min:1, max:1}},
  { id: BlockId.OAK_LEAVES, name: 'Oak Leaves', color: '#2a752e', isSolid: true, hardness: 12, itemDrop: { itemId: ItemId.OAK_LEAVES, min:1, max:1}}, // TODO: Drop saplings
  // SPRUCE
  { id: BlockId.SPRUCE_LOG, name: 'Spruce Log', color: '#4a331a', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.SPRUCE_LOG, min:1, max:1}},
  { id: BlockId.SPRUCE_PLANKS, name: 'Spruce Planks', color: '#694b2a', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.SPRUCE_PLANKS, min:1, max:1}},
  { id: BlockId.SPRUCE_LEAVES, name: 'Spruce Leaves', color: '#3a5a3a', isSolid: true, hardness: 12, itemDrop: { itemId: ItemId.SPRUCE_LEAVES, min:1, max:1}},
  // BIRCH
  { id: BlockId.BIRCH_LOG, name: 'Birch Log', color: '#e8e8e8', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.BIRCH_LOG, min:1, max:1}},
  { id: BlockId.BIRCH_PLANKS, name: 'Birch Planks', color: '#d8c28b', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.BIRCH_PLANKS, min:1, max:1}},
  { id: BlockId.BIRCH_LEAVES, name: 'Birch Leaves', color: '#68a068', isSolid: true, hardness: 12, itemDrop: { itemId: ItemId.BIRCH_LEAVES, min:1, max:1}},
  
  // Ores
  { id: BlockId.COAL_ORE, name: 'Coal Ore', color: '#303030', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COAL, min:1, max:1}, texture: createOreTexture('#808080', '#303030') },
  { id: BlockId.IRON_ORE, name: 'Iron Ore', color: '#d8a077', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'stone', itemDrop: { itemId: ItemId.IRON_ORE, min:1, max:1}, texture: createOreTexture('#808080', '#d8a077') },
  { id: BlockId.DIAMOND_ORE, name: 'Diamond Ore', color: '#68ded1', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'iron', itemDrop: { itemId: ItemId.DIAMOND, min:1, max:1}, texture: createOreTexture('#808080', '#68ded1') },

  // Utility Blocks
  { id: BlockId.CRAFTING_TABLE, name: 'Crafting Table', color: '#a0774a', isSolid: true, hardness: 45, toolType: 'axe', itemDrop: { itemId: ItemId.CRAFTING_TABLE, min:1, max:1}},
  { id: BlockId.CHEST, name: 'Chest', color: '#bf8c3c', isSolid: true, hardness: 60, toolType: 'axe', itemDrop: { itemId: ItemId.CHEST, min:1, max:1}},
];

const blockRegistry = new Map<BlockId, BlockType>();
BLOCK_TYPES.forEach(block => blockRegistry.set(block.id, block));

export function getBlockType(id: BlockId): BlockType | undefined {
  return blockRegistry.get(id);
}
