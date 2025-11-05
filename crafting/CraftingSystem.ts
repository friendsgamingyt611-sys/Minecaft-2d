
import { Item, ItemId, Recipe, ItemInfo, ToolInfo, BlockId } from '../types';

const ITEM_INFO_MAP: Map<ItemId, ItemInfo> = new Map([
    // Blocks
    [ItemId.GRASS, { name: 'Grass Block', maxStackSize: 64, blockId: BlockId.GRASS }],
    [ItemId.DIRT, { name: 'Dirt', maxStackSize: 64, blockId: BlockId.DIRT }],
    [ItemId.STONE, { name: 'Stone', maxStackSize: 64, blockId: BlockId.STONE }],
    [ItemId.COBBLESTONE, { name: 'Cobblestone', maxStackSize: 64, blockId: BlockId.COBBLESTONE }],
    [ItemId.OAK_LOG, { name: 'Oak Log', maxStackSize: 64, blockId: BlockId.OAK_LOG }],
    [ItemId.OAK_PLANKS, { name: 'Oak Planks', maxStackSize: 64, blockId: BlockId.OAK_PLANKS }],
    [ItemId.SPRUCE_LOG, { name: 'Spruce Log', maxStackSize: 64, blockId: BlockId.SPRUCE_LOG }],
    [ItemId.SPRUCE_PLANKS, { name: 'Spruce Planks', maxStackSize: 64, blockId: BlockId.SPRUCE_PLANKS }],
    [ItemId.BIRCH_LOG, { name: 'Birch Log', maxStackSize: 64, blockId: BlockId.BIRCH_LOG }],
    [ItemId.BIRCH_PLANKS, { name: 'Birch Planks', maxStackSize: 64, blockId: BlockId.BIRCH_PLANKS }],
    [ItemId.CRAFTING_TABLE, { name: 'Crafting Table', maxStackSize: 64, blockId: BlockId.CRAFTING_TABLE }],
    [ItemId.CHEST, { name: 'Chest', maxStackSize: 64, blockId: BlockId.CHEST }],
    [ItemId.COAL_ORE, { name: 'Coal Ore', maxStackSize: 64, blockId: BlockId.COAL_ORE }],
    [ItemId.IRON_ORE, { name: 'Iron Ore', maxStackSize: 64, blockId: BlockId.IRON_ORE }],
    [ItemId.DIAMOND_ORE, { name: 'Diamond Ore', maxStackSize: 64, blockId: BlockId.DIAMOND_ORE }],

    // Non-block items
    [ItemId.STICK, { name: 'Stick', maxStackSize: 64 }],
    [ItemId.COAL, { name: 'Coal', maxStackSize: 64 }],
    [ItemId.DIAMOND, { name: 'Diamond', maxStackSize: 64 }],
    
    // Tools
    [ItemId.WOODEN_PICKAXE, { name: 'Wooden Pickaxe', maxStackSize: 1, toolInfo: { type: 'pickaxe', tier: 'wood', durability: 59 } }],
    [ItemId.STONE_PICKAXE, { name: 'Stone Pickaxe', maxStackSize: 1, toolInfo: { type: 'pickaxe', tier: 'stone', durability: 131 } }],
    [ItemId.WOODEN_AXE, { name: 'Wooden Axe', maxStackSize: 1, toolInfo: { type: 'axe', tier: 'wood', durability: 59 } }],
    [ItemId.STONE_AXE, { name: 'Stone Axe', maxStackSize: 1, toolInfo: { type: 'axe', tier: 'stone', durability: 131 } }],
    [ItemId.WOODEN_SHOVEL, { name: 'Wooden Shovel', maxStackSize: 1, toolInfo: { type: 'shovel', tier: 'wood', durability: 59 } }],
    [ItemId.STONE_SHOVEL, { name: 'Stone Shovel', maxStackSize: 1, toolInfo: { type: 'shovel', tier: 'stone', durability: 131 } }],
]);

const RECIPES: Recipe[] = [
    // Wood Planks (shapeless)
    { result: { id: ItemId.OAK_PLANKS, count: 4 }, shape: [[ItemId.OAK_LOG]], isShapeless: true },
    { result: { id: ItemId.SPRUCE_PLANKS, count: 4 }, shape: [[ItemId.SPRUCE_LOG]], isShapeless: true },
    { result: { id: ItemId.BIRCH_PLANKS, count: 4 }, shape: [[ItemId.BIRCH_LOG]], isShapeless: true },
    
    // Sticks
    { result: { id: ItemId.STICK, count: 4 }, shape: [[ItemId.OAK_PLANKS], [ItemId.OAK_PLANKS]] },
    { result: { id: ItemId.STICK, count: 4 }, shape: [[ItemId.SPRUCE_PLANKS], [ItemId.SPRUCE_PLANKS]] },
    { result: { id: ItemId.STICK, count: 4 }, shape: [[ItemId.BIRCH_PLANKS], [ItemId.BIRCH_PLANKS]] },
    
    // Crafting Table
    { result: { id: ItemId.CRAFTING_TABLE, count: 1 }, shape: [[ItemId.OAK_PLANKS, ItemId.OAK_PLANKS], [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS]] },
    { result: { id: ItemId.CRAFTING_TABLE, count: 1 }, shape: [[ItemId.SPRUCE_PLANKS, ItemId.SPRUCE_PLANKS], [ItemId.SPRUCE_PLANKS, ItemId.SPRUCE_PLANKS]] },
    { result: { id: ItemId.CRAFTING_TABLE, count: 1 }, shape: [[ItemId.BIRCH_PLANKS, ItemId.BIRCH_PLANKS], [ItemId.BIRCH_PLANKS, ItemId.BIRCH_PLANKS]] },

    // Chest
    { result: { id: ItemId.CHEST, count: 1 }, shape: [
        [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS],
        [ItemId.OAK_PLANKS, null, ItemId.OAK_PLANKS],
        [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS],
    ]},
    // Add Spruce/Birch chest recipes as well
    
    // Wooden Tools
    { result: { id: ItemId.WOODEN_PICKAXE, count: 1 }, shape: [
        [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS],
        [null, ItemId.STICK, null],
        [null, ItemId.STICK, null],
    ]},
    // Stone Tools
    { result: { id: ItemId.STONE_PICKAXE, count: 1 }, shape: [
        [ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE],
        [null, ItemId.STICK, null],
        [null, ItemId.STICK, null],
    ]},
];

export class CraftingSystem {

    public static getItemInfo(id: ItemId): ItemInfo | undefined {
        return ITEM_INFO_MAP.get(id);
    }
    
    public checkGrid(grid: (Item | null)[][]): Item | null {
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;

        for (const recipe of RECIPES) {
            if (this.matchRecipe(grid, recipe)) {
                return { ...recipe.result };
            }
        }
        return null;
    }

    private matchRecipe(grid: (Item | null)[][], recipe: Recipe): boolean {
        const shape = recipe.shape;
        const recipeHeight = shape.length;
        const recipeWidth = shape[0].length;
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;

        if (recipe.isShapeless) {
            // Simplified shapeless logic for 1x1 recipes like logs -> planks
            const itemsInGrid = grid.flat().filter(Boolean);
            if (itemsInGrid.length === 1 && itemsInGrid[0]?.id === shape[0][0]) {
                return true;
            }
            return false;
        }

        if (recipeHeight > gridHeight || recipeWidth > gridWidth) {
            return false;
        }

        // Find the top-left corner of the items in the grid to match against
        let minX = gridWidth, minY = gridHeight, maxX = -1, maxY = -1;
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (grid[y][x]) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        if (maxX === -1) return false; // Empty grid

        const boundedGridWidth = maxX - minX + 1;
        const boundedGridHeight = maxY - minY + 1;

        if (boundedGridWidth !== recipeWidth || boundedGridHeight !== recipeHeight) {
            return false;
        }
        
        for (let y = 0; y < recipeHeight; y++) {
            for (let x = 0; x < recipeWidth; x++) {
                const recipeItem = shape[y][x];
                const gridItem = grid[minY + y][minX + x];

                if (recipeItem !== (gridItem?.id || null)) {
                    return false;
                }
            }
        }

        return true;
    }
}
