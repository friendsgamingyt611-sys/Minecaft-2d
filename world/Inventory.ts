

import { Item, ItemId, InventoryData } from '../types';
import { ItemRegistry } from '../inventory/ItemRegistry';

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
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        const maxStackSize = itemInfo ? itemInfo.maxStackSize : 64;

        for (let i = 0; i < this.size; i++) {
            const existingItem = this.items[i];
            if (existingItem && existingItem.id === item.id && existingItem.count < maxStackSize) {
                const canAdd = maxStackSize - existingItem.count;
                const toAdd = Math.min(canAdd, item.count);
                existingItem.count += toAdd;
                item.count -= toAdd;
                if (item.count <= 0) return null;
            }
        }

        for (let i = 0; i < this.size; i++) {
            if (!this.items[i]) {
                this.items[i] = { ...item };
                return null;
            }
        }

        return item;
    }
    
    public addItemToSlot(item: Item, slot: number): Item | null {
        if (slot < 0 || slot >= this.size) return item;
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        if (!itemInfo) return item;
        
        const existingItem = this.items[slot];
        if (existingItem && existingItem.id === item.id) {
            const canAdd = itemInfo.maxStackSize - existingItem.count;
            const toAdd = Math.min(canAdd, item.count);
            existingItem.count += toAdd;
            item.count -= toAdd;
        } else if (!existingItem) {
            this.items[slot] = item;
            return null;
        }
        
        return item.count > 0 ? item : null;
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

    public hasItem(itemId: ItemId): boolean {
        return this.items.some(item => item?.id === itemId);
    }
    
    public getAllItemIds(): Set<ItemId> {
        const idSet = new Set<ItemId>();
        for (const item of this.items) {
            if (item) {
                idSet.add(item.id);
            }
        }
        return idSet;
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