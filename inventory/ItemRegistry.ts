

import { ItemId, ItemInfo, BlockId } from '../types';
import { ITEM_CATEGORIES } from './ItemClassification';

const ITEM_INFO_MAP: Map<ItemId, ItemInfo> = new Map([
    // Building Blocks
    [ItemId.GRASS, { name: 'Grass Block', maxStackSize: 64, blockId: BlockId.GRASS, category: 'Building Blocks' }],
    [ItemId.DIRT, { name: 'Dirt', maxStackSize: 64, blockId: BlockId.DIRT, category: 'Building Blocks' }],
    [ItemId.STONE, { name: 'Stone', maxStackSize: 64, blockId: BlockId.STONE, category: 'Building Blocks' }],
    [ItemId.BEDROCK, { name: 'Bedrock', maxStackSize: 64, blockId: BlockId.BEDROCK, category: 'Building Blocks' }],
    [ItemId.OAK_LOG, { name: 'Oak Log', maxStackSize: 64, blockId: BlockId.OAK_LOG, category: 'Building Blocks' }],
    [ItemId.OAK_LEAVES, { name: 'Oak Leaves', maxStackSize: 64, blockId: BlockId.OAK_LEAVES, category: 'Building Blocks' }],
    [ItemId.COBBLESTONE, { name: 'Cobblestone', maxStackSize: 64, blockId: BlockId.COBBLESTONE, category: 'Building Blocks' }],
    [ItemId.OAK_PLANKS, { name: 'Oak Planks', maxStackSize: 64, blockId: BlockId.OAK_PLANKS, category: 'Building Blocks' }],
    [ItemId.SPRUCE_LOG, { name: 'Spruce Log', maxStackSize: 64, blockId: BlockId.SPRUCE_LOG, category: 'Building Blocks' }],
    [ItemId.SPRUCE_LEAVES, { name: 'Spruce Leaves', maxStackSize: 64, blockId: BlockId.SPRUCE_LEAVES, category: 'Building Blocks' }],
    [ItemId.SPRUCE_PLANKS, { name: 'Spruce Planks', maxStackSize: 64, blockId: BlockId.SPRUCE_PLANKS, category: 'Building Blocks' }],
    [ItemId.BIRCH_LOG, { name: 'Birch Log', maxStackSize: 64, blockId: BlockId.BIRCH_LOG, category: 'Building Blocks' }],
    [ItemId.BIRCH_LEAVES, { name: 'Birch Leaves', maxStackSize: 64, blockId: BlockId.BIRCH_LEAVES, category: 'Building Blocks' }],
    [ItemId.BIRCH_PLANKS, { name: 'Birch Planks', maxStackSize: 64, blockId: BlockId.BIRCH_PLANKS, category: 'Building Blocks' }],
    [ItemId.SAND, { name: 'Sand', maxStackSize: 64, blockId: BlockId.SAND, category: 'Building Blocks' }],
    [ItemId.GRAVEL, { name: 'Gravel', maxStackSize: 64, blockId: BlockId.GRAVEL, category: 'Building Blocks' }],
    [ItemId.STONE_BRICKS, { name: 'Stone Bricks', maxStackSize: 64, blockId: BlockId.STONE_BRICKS, category: 'Building Blocks' }],
    [ItemId.GLASS, { name: 'Glass', maxStackSize: 64, blockId: BlockId.GLASS, category: 'Building Blocks' }],
    [ItemId.SMOOTH_STONE, { name: 'Smooth Stone', maxStackSize: 64, blockId: BlockId.SMOOTH_STONE, category: 'Building Blocks' }],
    [ItemId.OBSIDIAN, { name: 'Obsidian', maxStackSize: 64, blockId: BlockId.OBSIDIAN, category: 'Building Blocks' }],
    [ItemId.FARMLAND, { name: 'Farmland', maxStackSize: 64, blockId: BlockId.FARMLAND, category: 'Building Blocks' }],

    // Decorations
    [ItemId.CRAFTING_TABLE, { name: 'Crafting Table', maxStackSize: 64, blockId: BlockId.CRAFTING_TABLE, category: 'Decorations' }],
    [ItemId.CHEST, { name: 'Chest', maxStackSize: 64, blockId: BlockId.CHEST, category: 'Decorations' }],
    [ItemId.FURNACE, { name: 'Furnace', maxStackSize: 64, blockId: BlockId.FURNACE, category: 'Decorations' }],
    [ItemId.TORCH, { name: 'Torch', maxStackSize: 64, blockId: BlockId.TORCH, category: 'Decorations' }],
    [ItemId.OAK_SAPLING, { name: 'Oak Sapling', maxStackSize: 64, blockId: BlockId.OAK_SAPLING, category: 'Decorations' }],
    [ItemId.SPRUCE_SAPLING, { name: 'Spruce Sapling', maxStackSize: 64, blockId: BlockId.SPRUCE_SAPLING, category: 'Decorations' }],
    [ItemId.BIRCH_SAPLING, { name: 'Birch Sapling', maxStackSize: 64, blockId: BlockId.BIRCH_SAPLING, category: 'Decorations' }],

    // Materials
    [ItemId.COAL_ORE, { name: 'Coal Ore', maxStackSize: 64, blockId: BlockId.COAL_ORE, category: 'Materials' }],
    [ItemId.IRON_ORE, { name: 'Iron Ore', maxStackSize: 64, blockId: BlockId.IRON_ORE, category: 'Materials' }],
    [ItemId.GOLD_ORE, { name: 'Gold Ore', maxStackSize: 64, blockId: BlockId.GOLD_ORE, category: 'Materials' }],
    [ItemId.DIAMOND_ORE, { name: 'Diamond Ore', maxStackSize: 64, blockId: BlockId.DIAMOND_ORE, category: 'Materials' }],
    [ItemId.EMERALD_ORE, { name: 'Emerald Ore', maxStackSize: 64, blockId: BlockId.EMERALD_ORE, category: 'Materials' }],
    [ItemId.LAPIS_LAZULI_ORE, { name: 'Lapis Lazuli Ore', maxStackSize: 64, blockId: BlockId.LAPIS_LAZULI_ORE, category: 'Materials' }],
    [ItemId.STICK, { name: 'Stick', maxStackSize: 64, category: 'Materials' }],
    [ItemId.COAL, { name: 'Coal', maxStackSize: 64, category: 'Materials' }],
    [ItemId.DIAMOND, { name: 'Diamond', maxStackSize: 64, category: 'Materials' }],
    [ItemId.EMERALD, { name: 'Emerald', maxStackSize: 64, category: 'Materials' }],
    [ItemId.RAW_IRON, { name: 'Raw Iron', maxStackSize: 64, category: 'Materials' }],
    [ItemId.IRON_INGOT, { name: 'Iron Ingot', maxStackSize: 64, category: 'Materials' }],
    [ItemId.RAW_GOLD, { name: 'Raw Gold', maxStackSize: 64, category: 'Materials' }],
    [ItemId.GOLD_INGOT, { name: 'Gold Ingot', maxStackSize: 64, category: 'Materials' }],
    [ItemId.LAPIS_LAZULI, { name: 'Lapis Lazuli', maxStackSize: 64, category: 'Materials' }],
    [ItemId.FLINT, { name: 'Flint', maxStackSize: 64, category: 'Materials' }],
    [ItemId.LEATHER, { name: 'Leather', maxStackSize: 64, category: 'Materials' }],

    // Redstone
    [ItemId.REDSTONE_ORE, { name: 'Redstone Ore', maxStackSize: 64, blockId: BlockId.REDSTONE_ORE, category: 'Redstone' }],
    [ItemId.REDSTONE_DUST, { name: 'Redstone Dust', maxStackSize: 64, category: 'Redstone' }],

    // Foodstuffs
    [ItemId.ROTTEN_FLESH, { name: 'Rotten Flesh', maxStackSize: 64, category: 'Foodstuffs' }],
    
    // Tools & Combat
    [ItemId.WOODEN_PICKAXE, { name: 'Wooden Pickaxe', maxStackSize: 1, toolInfo: { type: 'pickaxe', tier: 'wood', durability: 59 }, category: 'Tools & Combat' }],
    [ItemId.STONE_PICKAXE, { name: 'Stone Pickaxe', maxStackSize: 1, toolInfo: { type: 'pickaxe', tier: 'stone', durability: 131 }, category: 'Tools & Combat' }],
    [ItemId.IRON_PICKAXE, { name: 'Iron Pickaxe', maxStackSize: 1, toolInfo: { type: 'pickaxe', tier: 'iron', durability: 250 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_PICKAXE, { name: 'Diamond Pickaxe', maxStackSize: 1, toolInfo: { type: 'pickaxe', tier: 'diamond', durability: 1561 }, category: 'Tools & Combat' }],
    
    [ItemId.WOODEN_AXE, { name: 'Wooden Axe', maxStackSize: 1, toolInfo: { type: 'axe', tier: 'wood', durability: 59 }, category: 'Tools & Combat' }],
    [ItemId.STONE_AXE, { name: 'Stone Axe', maxStackSize: 1, toolInfo: { type: 'axe', tier: 'stone', durability: 131 }, category: 'Tools & Combat' }],
    [ItemId.IRON_AXE, { name: 'Iron Axe', maxStackSize: 1, toolInfo: { type: 'axe', tier: 'iron', durability: 250 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_AXE, { name: 'Diamond Axe', maxStackSize: 1, toolInfo: { type: 'axe', tier: 'diamond', durability: 1561 }, category: 'Tools & Combat' }],
    
    [ItemId.WOODEN_SHOVEL, { name: 'Wooden Shovel', maxStackSize: 1, toolInfo: { type: 'shovel', tier: 'wood', durability: 59 }, category: 'Tools & Combat' }],
    [ItemId.STONE_SHOVEL, { name: 'Stone Shovel', maxStackSize: 1, toolInfo: { type: 'shovel', tier: 'stone', durability: 131 }, category: 'Tools & Combat' }],
    [ItemId.IRON_SHOVEL, { name: 'Iron Shovel', maxStackSize: 1, toolInfo: { type: 'shovel', tier: 'iron', durability: 250 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_SHOVEL, { name: 'Diamond Shovel', maxStackSize: 1, toolInfo: { type: 'shovel', tier: 'diamond', durability: 1561 }, category: 'Tools & Combat' }],
    
    [ItemId.WOODEN_SWORD, { name: 'Wooden Sword', maxStackSize: 1, toolInfo: { type: 'sword', tier: 'wood', durability: 59, damage: 4 }, category: 'Tools & Combat' }],
    [ItemId.STONE_SWORD, { name: 'Stone Sword', maxStackSize: 1, toolInfo: { type: 'sword', tier: 'stone', durability: 131, damage: 5 }, category: 'Tools & Combat' }],
    [ItemId.IRON_SWORD, { name: 'Iron Sword', maxStackSize: 1, toolInfo: { type: 'sword', tier: 'iron', durability: 250, damage: 6 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_SWORD, { name: 'Diamond Sword', maxStackSize: 1, toolInfo: { type: 'sword', tier: 'diamond', durability: 1561, damage: 7 }, category: 'Tools & Combat' }],

    [ItemId.WOODEN_HOE, { name: 'Wooden Hoe', maxStackSize: 1, toolInfo: { type: 'hoe', tier: 'wood', durability: 59 }, category: 'Tools & Combat' }],
    [ItemId.STONE_HOE, { name: 'Stone Hoe', maxStackSize: 1, toolInfo: { type: 'hoe', tier: 'stone', durability: 131 }, category: 'Tools & Combat' }],
    [ItemId.IRON_HOE, { name: 'Iron Hoe', maxStackSize: 1, toolInfo: { type: 'hoe', tier: 'iron', durability: 250 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_HOE, { name: 'Diamond Hoe', maxStackSize: 1, toolInfo: { type: 'hoe', tier: 'diamond', durability: 1561 }, category: 'Tools & Combat' }],
    
    [ItemId.LEATHER_HELMET, { name: 'Leather Cap', maxStackSize: 1, armorInfo: { type: 'helmet', protection: 1, durability: 55 }, category: 'Tools & Combat' }],
    [ItemId.LEATHER_CHESTPLATE, { name: 'Leather Tunic', maxStackSize: 1, armorInfo: { type: 'chestplate', protection: 3, durability: 80 }, category: 'Tools & Combat' }],
    [ItemId.LEATHER_LEGGINGS, { name: 'Leather Pants', maxStackSize: 1, armorInfo: { type: 'leggings', protection: 2, durability: 75 }, category: 'Tools & Combat' }],
    [ItemId.LEATHER_BOOTS, { name: 'Leather Boots', maxStackSize: 1, armorInfo: { type: 'boots', protection: 1, durability: 65 }, category: 'Tools & Combat' }],

    [ItemId.IRON_HELMET, { name: 'Iron Helmet', maxStackSize: 1, armorInfo: { type: 'helmet', protection: 2, durability: 165 }, category: 'Tools & Combat' }],
    [ItemId.IRON_CHESTPLATE, { name: 'Iron Chestplate', maxStackSize: 1, armorInfo: { type: 'chestplate', protection: 6, durability: 240 }, category: 'Tools & Combat' }],
    [ItemId.IRON_LEGGINGS, { name: 'Iron Leggings', maxStackSize: 1, armorInfo: { type: 'leggings', protection: 5, durability: 225 }, category: 'Tools & Combat' }],
    [ItemId.IRON_BOOTS, { name: 'Iron Boots', maxStackSize: 1, armorInfo: { type: 'boots', protection: 2, durability: 195 }, category: 'Tools & Combat' }],

    [ItemId.DIAMOND_HELMET, { name: 'Diamond Helmet', maxStackSize: 1, armorInfo: { type: 'helmet', protection: 3, durability: 363 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_CHESTPLATE, { name: 'Diamond Chestplate', maxStackSize: 1, armorInfo: { type: 'chestplate', protection: 8, durability: 528 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_LEGGINGS, { name: 'Diamond Leggings', maxStackSize: 1, armorInfo: { type: 'leggings', protection: 6, durability: 495 }, category: 'Tools & Combat' }],
    [ItemId.DIAMOND_BOOTS, { name: 'Diamond Boots', maxStackSize: 1, armorInfo: { type: 'boots', protection: 3, durability: 429 }, category: 'Tools & Combat' }],

    [ItemId.SHIELD, { name: 'Shield', maxStackSize: 1, category: 'Tools & Combat' }],
    
    // Miscellaneous
    [ItemId.ZOMBIE_SPAWN_EGG, { name: 'Zombie Spawn Egg', maxStackSize: 64, category: 'Miscellaneous' }],
]);

export class ItemRegistry {
    private static allItems: ItemId[] = Array.from(ITEM_INFO_MAP.keys());
    private static itemsByCategory: Map<string, ItemId[]> = new Map();

    public static initialize() {
        // Ensure the map is clear before initializing
        this.itemsByCategory.clear();
        ITEM_CATEGORIES.forEach(cat => this.itemsByCategory.set(cat, []));
        
        for (const [id, info] of ITEM_INFO_MAP.entries()) {
            if (this.itemsByCategory.has(info.category)) {
                this.itemsByCategory.get(info.category)!.push(id);
            }
        }
    }

    public static getItemInfo(id: ItemId): ItemInfo | undefined {
        return ITEM_INFO_MAP.get(id);
    }
    
    public static getAllItemIds(): ItemId[] {
        return this.allItems;
    }
    
    public static getItemsByCategory(category: string): ItemId[] {
        return this.itemsByCategory.get(category) || [];
    }
}

// Initialize the registry immediately so its data is available.
ItemRegistry.initialize();