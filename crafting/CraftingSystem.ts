import { Item, ItemId, Recipe } from '../types';

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

    // Furnace
    { result: { id: ItemId.FURNACE, count: 1 }, shape: [
        [ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE],
        [ItemId.COBBLESTONE, null, ItemId.COBBLESTONE],
        [ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE],
    ]},

    // Chest
    { result: { id: ItemId.CHEST, count: 1 }, shape: [
        [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS],
        [ItemId.OAK_PLANKS, null, ItemId.OAK_PLANKS],
        [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS],
    ]},

    // Torch
    { result: { id: ItemId.TORCH, count: 4 }, shape: [[ItemId.COAL], [ItemId.STICK]] },

    // Stone Bricks
    { result: { id: ItemId.STONE_BRICKS, count: 4 }, shape: [[ItemId.STONE, ItemId.STONE], [ItemId.STONE, ItemId.STONE]] },

    // Shield
    { result: { id: ItemId.SHIELD, count: 1 }, shape: [
        [ItemId.OAK_PLANKS, ItemId.IRON_INGOT, ItemId.OAK_PLANKS],
        [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS],
        [null, ItemId.OAK_PLANKS, null]
    ]},
    
    // --- TOOLS (WOOD) ---
    { result: { id: ItemId.WOODEN_PICKAXE, count: 1 }, shape: [ [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, ItemId.OAK_PLANKS], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.WOODEN_AXE, count: 1 }, shape: [ [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, null], [ItemId.OAK_PLANKS, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.WOODEN_SHOVEL, count: 1 }, shape: [ [ItemId.OAK_PLANKS], [ItemId.STICK], [ItemId.STICK] ]},
    { result: { id: ItemId.WOODEN_SWORD, count: 1 }, shape: [ [ItemId.OAK_PLANKS], [ItemId.OAK_PLANKS], [ItemId.STICK] ]},
    { result: { id: ItemId.WOODEN_HOE, count: 1 }, shape: [ [ItemId.OAK_PLANKS, ItemId.OAK_PLANKS, null], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},

    // --- TOOLS (STONE) ---
    { result: { id: ItemId.STONE_PICKAXE, count: 1 }, shape: [ [ItemId.COBBLESTONE, ItemId.COBBLESTONE, ItemId.COBBLESTONE], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.STONE_AXE, count: 1 }, shape: [ [ItemId.COBBLESTONE, ItemId.COBBLESTONE, null], [ItemId.COBBLESTONE, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.STONE_SHOVEL, count: 1 }, shape: [ [ItemId.COBBLESTONE], [ItemId.STICK], [ItemId.STICK] ]},
    { result: { id: ItemId.STONE_SWORD, count: 1 }, shape: [ [ItemId.COBBLESTONE], [ItemId.COBBLESTONE], [ItemId.STICK] ]},
    { result: { id: ItemId.STONE_HOE, count: 1 }, shape: [ [ItemId.COBBLESTONE, ItemId.COBBLESTONE, null], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    
    // --- TOOLS (IRON) ---
    { result: { id: ItemId.IRON_PICKAXE, count: 1 }, shape: [ [ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.IRON_AXE, count: 1 }, shape: [ [ItemId.IRON_INGOT, ItemId.IRON_INGOT, null], [ItemId.IRON_INGOT, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.IRON_SHOVEL, count: 1 }, shape: [ [ItemId.IRON_INGOT], [ItemId.STICK], [ItemId.STICK] ]},
    { result: { id: ItemId.IRON_SWORD, count: 1 }, shape: [ [ItemId.IRON_INGOT], [ItemId.IRON_INGOT], [ItemId.STICK] ]},
    { result: { id: ItemId.IRON_HOE, count: 1 }, shape: [ [ItemId.IRON_INGOT, ItemId.IRON_INGOT, null], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},

    // --- TOOLS (DIAMOND) ---
    { result: { id: ItemId.DIAMOND_PICKAXE, count: 1 }, shape: [ [ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.DIAMOND_AXE, count: 1 }, shape: [ [ItemId.DIAMOND, ItemId.DIAMOND, null], [ItemId.DIAMOND, ItemId.STICK, null], [null, ItemId.STICK, null] ]},
    { result: { id: ItemId.DIAMOND_SHOVEL, count: 1 }, shape: [ [ItemId.DIAMOND], [ItemId.STICK], [ItemId.STICK] ]},
    { result: { id: ItemId.DIAMOND_SWORD, count: 1 }, shape: [ [ItemId.DIAMOND], [ItemId.DIAMOND], [ItemId.STICK] ]},
    { result: { id: ItemId.DIAMOND_HOE, count: 1 }, shape: [ [ItemId.DIAMOND, ItemId.DIAMOND, null], [null, ItemId.STICK, null], [null, ItemId.STICK, null] ]},

    // --- ARMOR (LEATHER) ---
    { result: { id: ItemId.LEATHER_HELMET, count: 1 }, shape: [ [ItemId.LEATHER, ItemId.LEATHER, ItemId.LEATHER], [ItemId.LEATHER, null, ItemId.LEATHER], [null, null, null] ]},
    { result: { id: ItemId.LEATHER_CHESTPLATE, count: 1 }, shape: [ [ItemId.LEATHER, null, ItemId.LEATHER], [ItemId.LEATHER, ItemId.LEATHER, ItemId.LEATHER], [ItemId.LEATHER, ItemId.LEATHER, ItemId.LEATHER] ]},
    { result: { id: ItemId.LEATHER_LEGGINGS, count: 1 }, shape: [ [ItemId.LEATHER, ItemId.LEATHER, ItemId.LEATHER], [ItemId.LEATHER, null, ItemId.LEATHER], [ItemId.LEATHER, null, ItemId.LEATHER] ]},
    { result: { id: ItemId.LEATHER_BOOTS, count: 1 }, shape: [ [null, null, null], [ItemId.LEATHER, null, ItemId.LEATHER], [ItemId.LEATHER, null, ItemId.LEATHER] ]},

    // --- ARMOR (IRON) ---
    { result: { id: ItemId.IRON_HELMET, count: 1 }, shape: [ [ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT], [ItemId.IRON_INGOT, null, ItemId.IRON_INGOT], [null, null, null] ]},
    { result: { id: ItemId.IRON_CHESTPLATE, count: 1 }, shape: [ [ItemId.IRON_INGOT, null, ItemId.IRON_INGOT], [ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT], [ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT] ]},
    { result: { id: ItemId.IRON_LEGGINGS, count: 1 }, shape: [ [ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT], [ItemId.IRON_INGOT, null, ItemId.IRON_INGOT], [ItemId.IRON_INGOT, null, ItemId.IRON_INGOT] ]},
    { result: { id: ItemId.IRON_BOOTS, count: 1 }, shape: [ [null, null, null], [ItemId.IRON_INGOT, null, ItemId.IRON_INGOT], [ItemId.IRON_INGOT, null, ItemId.IRON_INGOT] ]},

    // --- ARMOR (DIAMOND) ---
    { result: { id: ItemId.DIAMOND_HELMET, count: 1 }, shape: [ [ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND], [ItemId.DIAMOND, null, ItemId.DIAMOND], [null, null, null] ]},
    { result: { id: ItemId.DIAMOND_CHESTPLATE, count: 1 }, shape: [ [ItemId.DIAMOND, null, ItemId.DIAMOND], [ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND], [ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND] ]},
    { result: { id: ItemId.DIAMOND_LEGGINGS, count: 1 }, shape: [ [ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND], [ItemId.DIAMOND, null, ItemId.DIAMOND], [ItemId.DIAMOND, null, ItemId.DIAMOND] ]},
    { result: { id: ItemId.DIAMOND_BOOTS, count: 1 }, shape: [ [null, null, null], [ItemId.DIAMOND, null, ItemId.DIAMOND], [ItemId.DIAMOND, null, ItemId.DIAMOND] ]},
];

export class CraftingSystem {
    
    public getAllRecipes(): Recipe[] {
        return RECIPES;
    }

    public findRecipeByResult(itemId: ItemId): Recipe | null {
        return RECIPES.find(r => r.result.id === itemId) || null;
    }

    public checkGrid(grid: (Item | null)[][]): Item | null {
        const gridHeight = grid.length;
        if (gridHeight === 0) return null;
        const gridWidth = grid[0].length;

        for (const recipe of RECIPES) {
            if (this.matchRecipe(grid, recipe)) {
                return { ...recipe.result };
            }
        }
        return null;
    }

    private matchRecipe(grid: (Item | null)[][], recipe: Recipe): boolean {
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;

        if (recipe.isShapeless) {
            const recipeItems = recipe.shape.flat().filter(Boolean);
            const gridItems = grid.flat().filter(Boolean).map(i => i!.id);
            if (recipeItems.length !== gridItems.length) return false;
            
            const sortedRecipe = [...recipeItems].sort();
            const sortedGrid = [...gridItems].sort();
            
            for(let i=0; i<sortedRecipe.length; i++) {
                if(sortedRecipe[i] !== sortedGrid[i]) return false;
            }
            return true;
        }

        const shape = recipe.shape;
        const recipeHeight = shape.length;
        const recipeWidth = shape[0].length;
        
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
                // Allow any plank type if recipe calls for OAK_PLANKS
                const gridItem = grid[minY + y][minX + x];
                const gridItemId = gridItem?.id || null;

                if (recipeItem === ItemId.OAK_PLANKS) {
                    if (gridItemId !== ItemId.OAK_PLANKS && gridItemId !== ItemId.SPRUCE_PLANKS && gridItemId !== ItemId.BIRCH_PLANKS) {
                        return false;
                    }
                } else if (recipeItem !== gridItemId) {
                    return false;
                }
            }
        }

        // Check that there are no other items outside the recipe shape
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (grid[y][x]) {
                    if (y < minY || y > maxY || x < minX || x > maxX) {
                        return false;
                    }
                }
            }
        }


        return true;
    }
}