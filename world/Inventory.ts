

import { Item, ItemId, InventoryData } from '../types';
import { CraftingSystem } from '../crafting/CraftingSystem';

export class Inventory {
    private items: (Item | null)[];
    private size: number;

    constructor(size: number) {
        this.size = size;
        this.items = new Array(size).fill(null);
    }

    public getSize(): number {
        return this.size;
    }

    public getItems(): (Item | null)[] {
        return this.items;
    }

    public getItem(slot: number): Item | null {
        if (slot < 0 || slot >= this.size) return null;
        return this.items[slot];
    }

    public setItem(slot: number, item: Item | null): void {
        if (slot < 0 || slot >= this.size) return;
        this.items[slot] = item;
    }

    public clear(): void {
        this.items.fill(null);
    }

    public addItem(item: Item): Item | null {
        const itemInfo = CraftingSystem.getItemInfo(item.id);
        const maxStackSize = itemInfo ? itemInfo.maxStackSize : 64;

        // First pass: try to stack with existing items
        for (let i = 0; i < this.size; i++) {
            const existingItem = this.items[i];
            if (existingItem && existingItem.id === item.id && existingItem.count < maxStackSize) {
                const canAdd = maxStackSize - existingItem.count;
                const toAdd = Math.min(canAdd, item.count);
                existingItem.count += toAdd;
                item.count -= toAdd;
                if (item.count <= 0) return null; // All items added
            }
        }

        // Second pass: find an empty slot
        for (let i = 0; i < this.size; i++) {
            if (!this.items[i]) {
                this.items[i] = { ...item };
                return null; // All items added
            }
        }

        return item; // Return remaining items
    }

    public removeItem(slot: number, count: number): boolean {
        const item = this.getItem(slot);
        if (!item) return false;
        
        item.count -= count;
        if (item.count <= 0) {
            this.items[slot] = null;
        }
        return true;
    }
    
    public toData(): InventoryData {
        return {
            items: this.items
        };
    }

    public fromData(data: InventoryData) {
        this.items = data.items;
    }
}
