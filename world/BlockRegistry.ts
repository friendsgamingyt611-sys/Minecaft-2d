

import { BlockId, BlockType, ItemId } from '../types';

function createOreTexture(baseColor: string, oreColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, x, y, size) => {
        // Base stone texture
        createDetailTexture('#808080', ['#757575', '#909090'])(ctx, x, y, size);
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

function createDetailTexture(baseColor: string, detailColors: string[], pebbleChance: number = 0): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, x, y, size) => {
    // Base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    
    // Add random detail pixels (like Minecraft's dithered texture)
    for (let i = 0; i < size * 1.5; i++) {
      const px = x + Math.random() * size;
      const py = y + Math.random() * size;
      ctx.fillStyle = detailColors[Math.floor(Math.random() * detailColors.length)];
      if (Math.random() < pebbleChance) {
        ctx.fillRect(px, py, 4, 4); // Larger pebble pixels
      } else {
        ctx.fillRect(px, py, 2, 2); // 2x2 detail pixels
      }
    }
    
    // Subtle gradient for depth
    const gradient = ctx.createRadialGradient(
      x + size/2, y + size/2, 0,
      x + size/2, y + size/2, size/2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
  };
}


function createCobblestoneTexture(): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, x, y, size) => {
    // Mortar/grout background
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(x, y, size, size);
    
    // Generate 4-6 irregularly shaped stones
    const stoneColors = ['#808080', '#898989', '#7a7a7a', '#838383'];
    const stones = [
      { dx: 0, dy: 0, w: 0.6, h: 0.6 },
      { dx: 0.5, dy: 0, w: 0.5, h: 0.5 },
      { dx: 0, dy: 0.5, w: 0.5, h: 0.5 },
      { dx: 0.6, dy: 0.4, w: 0.4, h: 0.6 },
    ];
    
    for (const stone of stones) {
      // Random stone color
      ctx.fillStyle = stoneColors[Math.floor(Math.random() * stoneColors.length)];
      
      // Position with slight randomness
      const stoneX = x + stone.dx * size + (Math.random() - 0.5) * 4;
      const stoneY = y + stone.dy * size + (Math.random() - 0.5) * 4;
      const stoneW = stone.w * size;
      const stoneH = stone.h * size;
      
      // Draw irregular rounded rectangle
      ctx.beginPath();
      ctx.roundRect(stoneX, stoneY, stoneW, stoneH, size / 8);
      ctx.fill();
      
      // Stone edge highlight
      ctx.strokeStyle = '#454545';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Top-left highlight for depth
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(stoneX + 2, stoneY + 2, stoneW - 4, stoneH - 4, size / 9);
      ctx.fill();
    }
  };
}


function createOakLogTexture(): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    const innerColor = '#a1885c';
    const barkColor = '#5a4524';
    const darkRingColor = '#8c744f';
    const barkDetailColor = '#6b5731';

    return (ctx, x, y, size) => {
        // End grain
        ctx.fillStyle = innerColor;
        ctx.fillRect(x, y, size, size);

        // Rings
        ctx.strokeStyle = darkRingColor;
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, (size / 2.5) * (i / 4), 0, Math.PI * 2);
            ctx.stroke();
        }

        // Bark sides
        const barkWidth = size * 0.18;
        ctx.fillStyle = barkColor;
        ctx.fillRect(x, y, barkWidth, size);
        ctx.fillRect(x + size - barkWidth, y, barkWidth, size);
        
        // Bark detail
        ctx.strokeStyle = barkDetailColor;
        ctx.lineWidth = 3;
        for (let i = 0; i < size; i+= 8) {
            ctx.beginPath();
            ctx.moveTo(x + barkWidth/2 + (Math.random() - 0.5) * 5, y + i);
            ctx.lineTo(x + barkWidth/2 + (Math.random() - 0.5) * 5, y + i + 6);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + size - barkWidth/2 + (Math.random() - 0.5) * 5, y + i);
            ctx.lineTo(x + size - barkWidth/2 + (Math.random() - 0.5) * 5, y + i + 6);
            ctx.stroke();
        }
    }
}

function createLogTexture(innerColor: string, barkColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, x, y, size) => {
        ctx.fillStyle = innerColor;
        ctx.fillRect(x, y, size, size);

        const barkWidth = size * 0.15;
        ctx.fillStyle = barkColor;
        ctx.fillRect(x, y, barkWidth, size);
        ctx.fillRect(x + size - barkWidth, y, barkWidth, size);

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        for (let i = 0; i < size; i += 4) {
            ctx.beginPath();
            ctx.moveTo(x + barkWidth, y + i);
            ctx.lineTo(x + size - barkWidth, y + i);
            ctx.stroke();
        }
    }
}

function createPlanksTexture(baseColor: string, grainColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, x, y, size) => {
    // Base wood color
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    
    // Individual plank boards (4 horizontal planks per block)
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const yPos = y + (size / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, yPos);
      ctx.lineTo(x + size, yPos);
      ctx.stroke();
    }
    
    // Wood grain lines (vertical, slightly wavy)
    ctx.lineWidth = 1;
    ctx.strokeStyle = `${grainColor}44`; // Semi-transparent
    for (let plank = 0; plank < 4; plank++) {
      const grainCount = 2 + Math.floor(Math.random() * 3);
      for (let g = 0; g < grainCount; g++) {
        const grainX = x + Math.random() * size;
        const plankY = y + (size / 4) * plank;
        ctx.beginPath();
        ctx.moveTo(grainX, plankY);
        ctx.lineTo(grainX + Math.random() * 4 - 2, plankY + size / 4);
        ctx.stroke();
      }
    }
    
    // Subtle shading for depth
    const gradient = ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
  };
}

function createLeavesTexture(baseColor: string, detailColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, x, y, size) => {
    // Base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);

    // Darker splotches for depth
    ctx.fillStyle = detailColor;
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc(
            x + Math.random() * size,
            y + Math.random() * size,
            size * (Math.random() * 0.2 + 0.1), // radius
            0, Math.PI * 2
        );
        ctx.fill();
    }

    // Transparent gaps to see through
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
     for (let i = 0; i < 5; i++) {
        ctx.fillRect(
            x + Math.random() * size,
            y + Math.random() * size,
            size * (Math.random() * 0.1 + 0.05),
            size * (Math.random() * 0.1 + 0.05)
        );
    }
  };
}

const BLOCK_TYPES: BlockType[] = [
  { id: BlockId.AIR, name: 'Air', color: 'rgba(0,0,0,0)', isSolid: false, hardness: 0 },
  { 
    id: BlockId.GRASS, name: 'Grass', color: '#6a9b3d', isSolid: true, hardness: 36, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min:1, max:1}, soundType: 'grass',
    texture: (ctx, x, y, size) => {
      createDetailTexture('#8b5a2b', ['#7e5126', '#69421f', '#704a22'], 0.1)(ctx, x, y, size);
      // Grass top
      ctx.fillStyle = '#6a9b3d';
      ctx.fillRect(x, y, size, size * 0.25);
      // Grass detail
      for (let i = 0; i < size / 2; i++) {
        const px = x + Math.random() * size;
        const py = y + Math.random() * (size * 0.25);
        ctx.fillStyle = ['#83b94a', '#548235'][Math.floor(Math.random() * 2)];
        ctx.fillRect(px, py, 2, 2);
      }
    }
  },
  { id: BlockId.DIRT, name: 'Dirt', color: '#8b5a2b', isSolid: true, hardness: 30, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min:1, max:1}, soundType: 'dirt', texture: createDetailTexture('#8b5a2b', ['#7e5126', '#69421f', '#704a22'], 0.1) },
  { id: BlockId.STONE, name: 'Stone', color: '#808080', isSolid: true, hardness: 90, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COBBLESTONE, min:1, max:1}, soundType: 'stone', texture: createDetailTexture('#808080', ['#757575', '#909090']) },
  { id: BlockId.COBBLESTONE, name: 'Cobblestone', color: '#888888', isSolid: true, hardness: 120, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COBBLESTONE, min:1, max:1}, soundType: 'stone', texture: createCobblestoneTexture() },
  { id: BlockId.BEDROCK, name: 'Bedrock', color: '#505050', isSolid: true, isIndestructible: true, hardness: Infinity, soundType: 'stone', texture: createDetailTexture('#505050', ['#404040', '#606060']) },
  // OAK
  { id: BlockId.OAK_LOG, name: 'Oak Log', color: '#69512b', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.OAK_LOG, min:1, max:1}, soundType: 'wood', texture: createOakLogTexture()},
  { id: BlockId.OAK_PLANKS, name: 'Oak Planks', color: '#af8f5b', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.OAK_PLANKS, min:1, max:1}, soundType: 'wood', texture: createPlanksTexture('#af8f5b', 'rgba(0,0,0,0.1)')},
  { id: BlockId.OAK_LEAVES, name: 'Oak Leaves', color: '#2a752e', isSolid: true, hardness: 12, toolType: 'none', itemDrop: { itemId: ItemId.OAK_LEAVES, min:1, max:1}, soundType: 'grass', texture: createLeavesTexture('#2a752e', '#205923'), isLightTransparent: true},
  // SPRUCE
  { id: BlockId.SPRUCE_LOG, name: 'Spruce Log', color: '#4a331a', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.SPRUCE_LOG, min:1, max:1}, soundType: 'wood', texture: createLogTexture('#694b2a', '#4a331a')},
  { id: BlockId.SPRUCE_PLANKS, name: 'Spruce Planks', color: '#694b2a', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.SPRUCE_PLANKS, min:1, max:1}, soundType: 'wood', texture: createPlanksTexture('#694b2a', 'rgba(0,0,0,0.15)')},
  { id: BlockId.SPRUCE_LEAVES, name: 'Spruce Leaves', color: '#3a5a3a', isSolid: true, hardness: 12, toolType: 'none', itemDrop: { itemId: ItemId.SPRUCE_LEAVES, min:1, max:1}, soundType: 'grass', texture: createLeavesTexture('#3a5a3a', '#2e472e'), isLightTransparent: true},
  // BIRCH
  { id: BlockId.BIRCH_LOG, name: 'Birch Log', color: '#e8e8e8', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.BIRCH_LOG, min:1, max:1}, soundType: 'wood', texture: createLogTexture('#e0d6b4', '#e8e8e8')},
  { id: BlockId.BIRCH_PLANKS, name: 'Birch Planks', color: '#d8c28b', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.BIRCH_PLANKS, min:1, max:1}, soundType: 'wood', texture: createPlanksTexture('#d8c28b', 'rgba(0,0,0,0.05)')},
  { id: BlockId.BIRCH_LEAVES, name: 'Birch Leaves', color: '#68a068', isSolid: true, hardness: 12, toolType: 'none', itemDrop: { itemId: ItemId.BIRCH_LEAVES, min:1, max:1}, soundType: 'grass', texture: createLeavesTexture('#68a068', '#548154'), isLightTransparent: true},
  
  // Ores
  { id: BlockId.COAL_ORE, name: 'Coal Ore', color: '#303030', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COAL, min:1, max:1}, xpDrop: { min: 0, max: 2 }, soundType: 'stone', texture: createOreTexture('#808080', '#303030') },
  { id: BlockId.IRON_ORE, name: 'Iron Ore', color: '#d8a077', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'stone', itemDrop: { itemId: ItemId.IRON_ORE, min:1, max:1}, soundType: 'stone', texture: createOreTexture('#808080', '#d8a077') },
  { id: BlockId.DIAMOND_ORE, name: 'Diamond Ore', color: '#68ded1', isSolid: true, hardness: 300, toolType: 'pickaxe', minToolTier: 'iron', itemDrop: { itemId: ItemId.DIAMOND, min:1, max:1}, xpDrop: { min: 3, max: 7 }, soundType: 'stone', texture: createOreTexture('#808080', '#68ded1') },

  // Utility Blocks
  { id: BlockId.CRAFTING_TABLE, name: 'Crafting Table', color: '#a0774a', isSolid: true, hardness: 45, toolType: 'axe', itemDrop: { itemId: ItemId.CRAFTING_TABLE, min:1, max:1}, soundType: 'wood'},
  { id: BlockId.CHEST, name: 'Chest', color: '#bf8c3c', isSolid: true, hardness: 60, toolType: 'axe', itemDrop: { itemId: ItemId.CHEST, min:1, max:1}, soundType: 'wood'},
];

const blockRegistry = new Map<BlockId, BlockType>();
BLOCK_TYPES.forEach(block => blockRegistry.set(block.id, block));

export function getBlockType(id: BlockId): BlockType | undefined {
  return blockRegistry.get(id);
}