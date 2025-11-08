
import { Item, ItemId } from '../types';

interface SmeltingRecipe {
    input: ItemId;
    result: Item;
    cookTime: number; // in seconds
}

interface Fuel {
    id: ItemId;
    burnTime: number; // in seconds
}

const SMELTING_RECIPES: SmeltingRecipe[] = [
    { input: ItemId.RAW_IRON, result: { id: ItemId.IRON_INGOT, count: 1 }, cookTime: 10 },
    { input: ItemId.RAW_GOLD, result: { id: ItemId.GOLD_INGOT, count: 1 }, cookTime: 10 },
    { input: ItemId.SAND, result: { id: ItemId.GLASS, count: 1 }, cookTime: 5 },
    { input: ItemId.COBBLESTONE, result: { id: ItemId.STONE, count: 1 }, cookTime: 5 },
    { input: ItemId.STONE, result: { id: ItemId.SMOOTH_STONE, count: 1 }, cookTime: 5 },
    { input: ItemId.OAK_LOG, result: { id: ItemId.COAL, count: 1 }, cookTime: 10 },
    { input: ItemId.SPRUCE_LOG, result: { id: ItemId.COAL, count: 1 }, cookTime: 10 },
    { input: ItemId.BIRCH_LOG, result: { id: ItemId.COAL, count: 1 }, cookTime: 10 },
];

const FUELS: Fuel[] = [
    { id: ItemId.COAL, burnTime: 80 },
    { id: ItemId.OAK_LOG, burnTime: 15 },
    { id: ItemId.SPRUCE_LOG, burnTime: 15 },
    { id: ItemId.BIRCH_LOG, burnTime: 15 },
    { id: ItemId.OAK_PLANKS, burnTime: 1.5 },
    { id: ItemId.SPRUCE_PLANKS, burnTime: 1.5 },
    { id: ItemId.BIRCH_PLANKS, burnTime: 1.5 },
    { id: ItemId.CRAFTING_TABLE, burnTime: 15 },
    { id: ItemId.STICK, burnTime: 0.5 },
];

export class SmeltingSystem {
    private static recipeMap: Map<ItemId, SmeltingRecipe> = new Map(SMELTING_RECIPES.map(r => [r.input, r]));
    private static fuelMap: Map<ItemId, Fuel> = new Map(FUELS.map(f => [f.id, f]));

    public static getSmeltingResult(input: ItemId): SmeltingRecipe | undefined {
        return this.recipeMap.get(input);
    }

    public static getFuelBurnTime(fuel: ItemId): number {
        return this.fuelMap.get(fuel)?.burnTime || 0;
    }
}
