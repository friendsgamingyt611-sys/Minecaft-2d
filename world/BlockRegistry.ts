
import { BlockId, BlockType, ItemId } from '../types';

function createPixelatedTexture(baseColor: string, detailColors: string[], detailChance: number = 0.2): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, blockX, blockY, size) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(blockX, blockY, size, size);
    
    let seed = blockX * 13 + blockY * 37;
    const random = () => {
        const a = 1103515245;
        const c = 12345;
        const m = Math.pow(2, 31);
        seed = (a * seed + c) % m;
        return seed / m;
    };

    const pixelSize = size / 16; // 32x32 on a 64px canvas would be 2px pixels. 16x16 is 4px. Let's use 16x16 as base.
    
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
            if (random() < detailChance) {
                ctx.fillStyle = detailColors[Math.floor(random() * detailColors.length)];
                ctx.fillRect(blockX + i * pixelSize, blockY + j * pixelSize, pixelSize, pixelSize);
            }
        }
    }
  };
}


function createOreTexture(baseTexture: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void, oreColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, x, y, size) => {
        baseTexture(ctx, x, y, size);
        
        let seed = x * 13 + y * 37;
        const random = () => {
            const a = 1103515245;
            const c = 12345;
            const m = Math.pow(2, 31);
            seed = (a * seed + c) % m;
            return seed / m;
        };
        
        const pixelSize = size / 16;
        const orePatches = 5 + Math.floor(random() * 4);
        for(let i = 0; i < orePatches; i++) {
            const oreX = Math.floor(random() * 14);
            const oreY = Math.floor(random() * 14);
            ctx.fillStyle = oreColor;
            ctx.fillRect(x + oreX * pixelSize, y + oreY * pixelSize, pixelSize * 2, pixelSize * 2);
            ctx.fillStyle = shadeColor(oreColor, 0.2);
            ctx.fillRect(x + oreX * pixelSize, y + oreY * pixelSize, pixelSize, pixelSize);
            ctx.fillStyle = shadeColor(oreColor, -0.2);
            ctx.fillRect(x + (oreX+1) * pixelSize, y + (oreY+1) * pixelSize, pixelSize, pixelSize);
        }
    };
}

function shadeColor(color: string, percent: number): string {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.floor(R * (1 + percent));
    G = Math.floor(G * (1 + percent));
    B = Math.floor(B * (1 + percent));
    R = Math.min(255, R); G = Math.min(255, G); B = Math.min(255, B);
    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');
    return "#" + RR + GG + BB;
}


function createCobblestoneTexture(): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, blockX, blockY, size) => {
    ctx.fillStyle = '#898989';
    ctx.fillRect(blockX, blockY, size, size);
    
    let seed = blockX * 13 + blockY * 37;
    const random = () => {
        const a = 1103515245;
        const c = 12345;
        const m = Math.pow(2, 31);
        seed = (a * seed + c) % m;
        return seed / m;
    };
    
    const stoneColors = ['#808080', '#909090', '#7a7a7a'];
    const pixelSize = size/16;

    for(let i=0; i<8; i++){
        const stoneX = blockX + (random() * size * 0.7);
        const stoneY = blockY + (random() * size * 0.7);
        const stoneW = size * (0.2 + random() * 0.3);
        const stoneH = size * (0.2 + random() * 0.3);
        
        ctx.fillStyle = stoneColors[Math.floor(random() * stoneColors.length)];
        ctx.beginPath();
        ctx.roundRect(stoneX, stoneY, stoneW, stoneH, size / 16);
        ctx.fill();
        
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
  };
}

const stoneTexture = createPixelatedTexture('#898989', ['#808080', '#959595'], 0.3);

function createLogTexture(innerColor: string, barkColor: string, ringsColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, blockX, blockY, size) => {
        // Bark sides
        ctx.fillStyle = barkColor;
        ctx.fillRect(blockX, blockY, size, size);
        const pixelSize = size/16;
        for(let i=0; i < 16; i++) {
            const shade = i % 2 === 0 ? 0.1 : -0.1;
             ctx.fillStyle = shadeColor(barkColor, shade + (Math.random()-0.5)*0.05);
             ctx.fillRect(blockX, blockY + i * pixelSize, size, pixelSize);
        }

        // Top/Bottom (cut) view
        const cutSize = size * 0.8;
        const cutOffset = (size - cutSize) / 2;
        ctx.fillStyle = innerColor;
        ctx.fillRect(blockX + cutOffset, blockY, cutSize, size);

        // Rings
        ctx.strokeStyle = ringsColor;
        ctx.lineWidth = pixelSize;
        ctx.strokeRect(blockX + cutOffset + pixelSize*1, blockY, cutSize - pixelSize*2, size);
        ctx.strokeRect(blockX + cutOffset + pixelSize*3, blockY, cutSize - pixelSize*6, size);
    }
}

function createBirchLogTexture(): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    const baseTexture = createLogTexture('#f7f0d8', '#f8f8f8', '#d7cfb3');
    return (ctx, x, y, size) => {
        baseTexture(ctx,x,y,size);
        let seed = x * 13 + y * 37;
        const random = () => { (seed = (1103515245 * seed + 12345) % Math.pow(2, 31)); return seed / Math.pow(2, 31); };

        for(let i=0; i<3; i++) {
            const spotY = y + random() * size;
            const spotH = size * (0.05 + random() * 0.1);
            ctx.fillStyle = `rgba(30,30,30,${0.5 + random() * 0.3})`;
            ctx.fillRect(x, spotY, size, spotH);
        }
    }
}

function createPlanksTexture(baseColor: string, grainColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, x, y, size) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = size/32;
    const pixelSize = size/16;

    for (let i = 0; i < 4; i++) {
      const yPos = y + (size / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, yPos);
      ctx.lineTo(x + size, yPos);
      ctx.stroke();
    }
  };
}

function createLeavesTexture(baseColor: string): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
  return (ctx, blockX, blockY, size) => {
    ctx.fillStyle = baseColor; // Solid color for the background part of the leaves
    ctx.fillRect(blockX, blockY, size, size);

    // Opaque part of the texture
    const opaqueColor = shadeColor(baseColor, 0.2);
    const transparentColor = shadeColor(baseColor, -0.2);
    let seed = blockX * 13 + blockY * 37;
    const random = () => { (seed = (1103515245 * seed + 12345) % Math.pow(2, 31)); return seed / Math.pow(2, 31); };
    const pixelSize = size / 8;
    
    for(let i=0; i<8; i++){
        for(let j=0; j<8; j++){
            if(random() > 0.4) {
                 ctx.fillStyle = random() > 0.5 ? opaqueColor : transparentColor;
                 ctx.fillRect(blockX + i * pixelSize, blockY + j * pixelSize, pixelSize, pixelSize);
            }
        }
    }
  };
}

function createCraftingTableTexture(): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, blockX, blockY, size) => {
        createPlanksTexture('#af8f5b', '#9e8052')(ctx, blockX, blockY, size);
        ctx.fillStyle = '#d1b080';
        ctx.fillRect(blockX, blockY, size, size * 0.25); // Top surface
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(blockX, blockY + size * 0.25, size, 4); // Shadow
        // Tools on top
        ctx.fillStyle = '#686868';
        ctx.fillRect(blockX + size*0.2, blockY + size*0.1, size*0.3, size*0.08); // Saw
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(blockX + size*0.6, blockY + size*0.05, size*0.1, size*0.15); // Hammer head
    };
}

function createFurnaceTexture(isLit: boolean): (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void {
    return (ctx, blockX, blockY, size) => {
        createCobblestoneTexture()(ctx, blockX, blockY, size);
        ctx.fillStyle = '#404040';
        ctx.fillRect(blockX + size * 0.1, blockY, size * 0.8, size); // Top
        const openingX = blockX + size*0.2;
        const openingY = blockY + size*0.4;
        const openingW = size*0.6;
        const openingH = size*0.4;
        ctx.fillStyle = '#202020';
        ctx.fillRect(openingX, openingY, openingW, openingH);
        
        if (isLit) {
            ctx.fillStyle = '#ff9800';
            ctx.fillRect(openingX + 2, openingY + 2, openingW - 4, openingH - 4);
            const flicker = Math.random();
            if (flicker > 0.5) {
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(openingX + 4, openingY + openingH - 10, openingW - 8, 8);
            }
        }
    };
}

const BLOCK_TYPES: BlockType[] = [
  { id: BlockId.AIR, name: 'Air', color: 'rgba(0,0,0,0)', isSolid: false, hardness: 0 },
  { id: BlockId.GRASS, name: 'Grass', color: '#6a9b3d', isSolid: true, hardness: 36, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min:1, max:1}, soundType: 'grass', texture: (ctx, x, y, size) => { createPixelatedTexture('#8b5a2b', ['#7e5126', '#69421f'])(ctx, x, y, size); ctx.fillStyle = '#6a9b3d'; ctx.fillRect(x, y, size, size * 0.25); createPixelatedTexture('#6a9b3d', ['#83b94a', '#548235'], 0.1)(ctx, x, y, size * 0.25); }},
  { id: BlockId.DIRT, name: 'Dirt', color: '#8b5a2b', isSolid: true, hardness: 30, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min:1, max:1}, soundType: 'dirt', texture: createPixelatedTexture('#8b5a2b', ['#7e5126', '#69421f']) },
  { id: BlockId.STONE, name: 'Stone', color: '#808080', isSolid: true, hardness: 90, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COBBLESTONE, min:1, max:1}, soundType: 'stone', texture: stoneTexture },
  { id: BlockId.COBBLESTONE, name: 'Cobblestone', color: '#888888', isSolid: true, hardness: 120, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COBBLESTONE, min:1, max:1}, soundType: 'stone', texture: createCobblestoneTexture() },
  { id: BlockId.BEDROCK, name: 'Bedrock', color: '#505050', isSolid: true, isIndestructible: true, hardness: Infinity, soundType: 'stone', texture: createPixelatedTexture('#505050', ['#404040', '#606060']) },
  
  { id: BlockId.OAK_LOG, name: 'Oak Log', color: '#69512b', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.OAK_LOG, min:1, max:1}, soundType: 'wood', texture: createLogTexture('#deb887', '#705b3c', '#5a4a31')},
  { id: BlockId.OAK_PLANKS, name: 'Oak Planks', color: '#af8f5b', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.OAK_PLANKS, min:1, max:1}, soundType: 'wood', texture: createPlanksTexture('#af8f5b', '#9e8052')},
  { id: BlockId.OAK_LEAVES, name: 'Oak Leaves', color: 'rgba(42, 117, 46, 0.5)', isSolid: true, hardness: 12, soundType: 'grass', texture: createLeavesTexture('#2a752e'), isLightTransparent: true, itemDrop: { itemId: ItemId.OAK_SAPLING, min: 0, max: 1}},
  
  { id: BlockId.SPRUCE_LOG, name: 'Spruce Log', color: '#4a331a', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.SPRUCE_LOG, min:1, max:1}, soundType: 'wood', texture: createLogTexture('#694b2a', '#4a331a', '#3b2815')},
  { id: BlockId.SPRUCE_PLANKS, name: 'Spruce Planks', color: '#694b2a', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.SPRUCE_PLANKS, min:1, max:1}, soundType: 'wood', texture: createPlanksTexture('#694b2a', '#5a3d21')},
  { id: BlockId.SPRUCE_LEAVES, name: 'Spruce Leaves', color: 'rgba(58, 90, 58, 0.5)', isSolid: true, hardness: 12, soundType: 'grass', texture: createLeavesTexture('#3a5a3a'), isLightTransparent: true, itemDrop: { itemId: ItemId.SPRUCE_SAPLING, min: 0, max: 1}},
  
  { id: BlockId.BIRCH_LOG, name: 'Birch Log', color: '#e8e8e8', isSolid: true, hardness: 90, toolType: 'axe', itemDrop: { itemId: ItemId.BIRCH_LOG, min:1, max:1}, soundType: 'wood', texture: createBirchLogTexture()},
  { id: BlockId.BIRCH_PLANKS, name: 'Birch Planks', color: '#d8c28b', isSolid: true, hardness: 48, toolType: 'axe', itemDrop: { itemId: ItemId.BIRCH_PLANKS, min:1, max:1}, soundType: 'wood', texture: createPlanksTexture('#d8c28b', '#c7b17a')},
  { id: BlockId.BIRCH_LEAVES, name: 'Birch Leaves', color: 'rgba(104, 160, 104, 0.5)', isSolid: true, hardness: 12, soundType: 'grass', texture: createLeavesTexture('#68a068'), isLightTransparent: true, itemDrop: { itemId: ItemId.BIRCH_SAPLING, min: 0, max: 1}},

  { id: BlockId.SAND, name: 'Sand', color: '#e0d6b4', isSolid: true, hardness: 30, toolType: 'shovel', itemDrop: { itemId: ItemId.SAND, min: 1, max: 1 }, soundType: 'sand', texture: createPixelatedTexture('#e0d6b4', ['#d2c8a9', '#f0e6c4']) },
  { id: BlockId.GRAVEL, name: 'Gravel', color: '#a0a0a0', isSolid: true, hardness: 36, toolType: 'shovel', itemDrop: { itemId: ItemId.GRAVEL, min: 1, max: 1 }, soundType: 'gravel', texture: createPixelatedTexture('#a0a0a0', ['#8d8d8d', '#b1b1b1'], 0.5) },

  { id: BlockId.COAL_ORE, name: 'Coal Ore', color: '#303030', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.COAL, min:1, max:1}, xpDrop: { min: 0, max: 2 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#303030') },
  { id: BlockId.IRON_ORE, name: 'Iron Ore', color: '#d8a077', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'stone', itemDrop: { itemId: ItemId.RAW_IRON, min:1, max:1}, xpDrop: { min: 0, max: 2 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#d8a077') },
  { id: BlockId.GOLD_ORE, name: 'Gold Ore', color: '#fcee5a', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'iron', itemDrop: { itemId: ItemId.RAW_GOLD, min: 1, max: 1 }, xpDrop: { min: 0, max: 2 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#fcee5a') },
  { id: BlockId.DIAMOND_ORE, name: 'Diamond Ore', color: '#68ded1', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'iron', itemDrop: { itemId: ItemId.DIAMOND, min:1, max:1}, xpDrop: { min: 3, max: 7 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#68ded1') },
  { id: BlockId.REDSTONE_ORE, name: 'Redstone Ore', color: '#ff0000', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'iron', itemDrop: { itemId: ItemId.REDSTONE_DUST, min: 4, max: 5 }, xpDrop: { min: 1, max: 5 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#ff0000') },
  { id: BlockId.EMERALD_ORE, name: 'Emerald Ore', color: '#04d94f', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'iron', itemDrop: { itemId: ItemId.EMERALD, min: 1, max: 1 }, xpDrop: { min: 3, max: 7 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#04d94f') },
  
  { id: BlockId.CRAFTING_TABLE, name: 'Crafting Table', color: '#a0774a', isSolid: true, hardness: 150, toolType: 'axe', itemDrop: { itemId: ItemId.CRAFTING_TABLE, min:1, max:1}, soundType: 'wood', texture: createCraftingTableTexture()},
  { id: BlockId.CHEST, name: 'Chest', color: '#bf8c3c', isSolid: true, hardness: 150, toolType: 'axe', itemDrop: { itemId: ItemId.CHEST, min:1, max:1}, soundType: 'wood', isBlockEntity: true},
  { id: BlockId.FURNACE, name: 'Furnace', color: '#707070', isSolid: true, hardness: 210, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.FURNACE, min:1, max:1}, soundType: 'stone', isBlockEntity: true, texture: createFurnaceTexture(false)},
  { id: BlockId.FURNACE_LIT, name: 'Furnace', color: '#707070', isSolid: true, hardness: 210, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.FURNACE, min:1, max:1}, soundType: 'stone', isBlockEntity: true, texture: createFurnaceTexture(true), lightLevel: 13 },
  { id: BlockId.TORCH, name: 'Torch', color: '#ffa500', isSolid: false, hardness: 0, itemDrop: { itemId: ItemId.TORCH, min: 1, max: 1 }, lightLevel: 14, soundType: 'wood' },
  
  { id: BlockId.STONE_BRICKS, name: 'Stone Bricks', color: '#999999', isSolid: true, hardness: 90, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.STONE_BRICKS, min: 1, max: 1 }, soundType: 'stone' },
  { id: BlockId.GLASS, name: 'Glass', color: 'rgba(200, 220, 255, 0.5)', isSolid: true, hardness: 18, isLightTransparent: true, soundType: 'glass' },
  
  // New Blocks
  { id: BlockId.SMOOTH_STONE, name: 'Smooth Stone', color: '#a0a0a0', isSolid: true, hardness: 120, toolType: 'pickaxe', minToolTier: 'wood', itemDrop: { itemId: ItemId.SMOOTH_STONE, min: 1, max: 1 }, soundType: 'stone' },
  { id: BlockId.LAPIS_LAZULI_ORE, name: 'Lapis Lazuli Ore', color: '#1a4f91', isSolid: true, hardness: 180, toolType: 'pickaxe', minToolTier: 'stone', itemDrop: { itemId: ItemId.LAPIS_LAZULI, min: 4, max: 9 }, xpDrop: { min: 2, max: 5 }, soundType: 'stone', texture: createOreTexture(stoneTexture, '#1a4f91') },
  { id: BlockId.OBSIDIAN, name: 'Obsidian', color: '#1e102f', isSolid: true, hardness: 3000, toolType: 'pickaxe', minToolTier: 'diamond', itemDrop: { itemId: ItemId.OBSIDIAN, min: 1, max: 1 }, soundType: 'stone' },
  { id: BlockId.OAK_SAPLING, name: 'Oak Sapling', color: '#779944', isSolid: false, hardness: 0, itemDrop: { itemId: ItemId.OAK_SAPLING, min: 1, max: 1 }, soundType: 'grass' },
  { id: BlockId.SPRUCE_SAPLING, name: 'Spruce Sapling', color: '#4c643c', isSolid: false, hardness: 0, itemDrop: { itemId: ItemId.SPRUCE_SAPLING, min: 1, max: 1 }, soundType: 'grass' },
  { id: BlockId.BIRCH_SAPLING, name: 'Birch Sapling', color: '#9fbb8b', isSolid: false, hardness: 0, itemDrop: { itemId: ItemId.BIRCH_SAPLING, min: 1, max: 1 }, soundType: 'grass' },
  { id: BlockId.FARMLAND, name: 'Farmland', color: '#966c4a', isSolid: true, hardness: 36, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min: 1, max: 1 }, soundType: 'dirt' },
  { id: BlockId.FARMLAND_WET, name: 'Farmland', color: '#5e432e', isSolid: true, hardness: 36, toolType: 'shovel', itemDrop: { itemId: ItemId.DIRT, min: 1, max: 1 }, soundType: 'dirt' },
];

const blockRegistry = new Map<BlockId, BlockType>();
BLOCK_TYPES.forEach(block => blockRegistry.set(block.id, block));

export function getBlockType(id: BlockId): BlockType | undefined {
  return blockRegistry.get(id);
}
