

import { Player } from '../entities/Player';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { MouseHandler } from '../input/MouseHandler';
import { HOTBAR_SLOTS, INVENTORY_SLOTS, HOTBAR_SLOT_SIZE, HOTBAR_ITEM_SIZE } from '../core/Constants';
import { Item, ItemId, Vector2 } from '../types';
import { Inventory } from '../world/Inventory';
import { getBlockType } from '../world/BlockRegistry';
import { TouchHandler } from '../input/TouchHandler';

type UIView = 'none' | 'player' | 'crafting_table' | 'chest';

export class InventoryUI {
    private player: Player;
    private craftingSystem: CraftingSystem;
    private mouseHandler: MouseHandler;
    private touchHandler: TouchHandler;
    
    private currentView: UIView = 'none';
    private chestInventory: Inventory | null = null;
    
    private draggingItem: { item: Item, fromSlot: number, fromInventory: Inventory } | null = null;

    private playerCraftingGrid = new Inventory(4);
    private tableCraftingGrid = new Inventory(9);
    private craftingResultSlot = new Inventory(1);
    
    // V3.1 Double-click state
    private lastClick = { time: 0, slot: -1, inv: null as Inventory | null };
    private readonly DOUBLE_CLICK_WINDOW = 300; // ms

    constructor(player: Player, craftingSystem: CraftingSystem, mouseHandler: MouseHandler, touchHandler: TouchHandler) {
        this.player = player;
        this.craftingSystem = craftingSystem;
        this.mouseHandler = mouseHandler;
        this.touchHandler = touchHandler;
    }

    public isOpen(): boolean {
        return this.currentView !== 'none';
    }

    public openPlayerInventory() { this.currentView = 'player'; }
    public openCraftingTable() { this.currentView = 'crafting_table'; }
    public openChest(inventory: Inventory) {
        this.chestInventory = inventory;
        this.currentView = 'chest';
    }
    public close() {
        if(this.draggingItem) {
            this.draggingItem.fromInventory.addItem(this.draggingItem.item);
            this.draggingItem = null;
        }
        // Drop crafting grid items
        this.playerCraftingGrid.getItems().forEach(item => item && this.player.inventory.addItem(item));
        this.playerCraftingGrid.clear();
        this.tableCraftingGrid.getItems().forEach(item => item && this.player.inventory.addItem(item));
        this.tableCraftingGrid.clear();
        this.craftingResultSlot.clear();
        
        this.currentView = 'none';
        this.chestInventory = null;
    }

    public update() {
        if (!this.isOpen()) return;

        this.handleCrafting();
        this.handlePointerInput();
    }

    private handleCrafting() {
        const craftingGrid = this.currentView === 'crafting_table' ? this.tableCraftingGrid : this.playerCraftingGrid;
        const gridArray = [];
        const size = Math.sqrt(craftingGrid.getSize());
        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                row.push(craftingGrid.getItem(y * size + x));
            }
            gridArray.push(row);
        }
        
        const result = this.craftingSystem.checkGrid(gridArray);
        this.craftingResultSlot.setItem(0, result);
    }

    private handlePointerInput() {
        const leftClicks: Vector2[] = [];
        if (this.mouseHandler.isLeftClicked) {
            leftClicks.push(this.mouseHandler.position);
        }
        this.touchHandler.justEndedTouches.forEach(t => leftClicks.push(t));

        const rightClicked = this.mouseHandler.isRightClicked;

        if (leftClicks.length === 0 && !rightClicked) return;
        
        const clickLocations: { inv: Inventory, rect: any, isCraftingOutput?: boolean }[] = [];
        
        // Player Inventory
        const yOffset = this.currentView === 'chest' ? 100 : 0;
        clickLocations.push(...this.getInventoryClickLocations(this.player.inventory, 334, 416 + yOffset, 9, 3, 9)); // Main
        clickLocations.push(...this.getInventoryClickLocations(this.player.inventory, 334, 584 + yOffset, 9, 1, 0)); // Hotbar

        // Crafting Grids & Output
        if(this.currentView === 'player') {
            clickLocations.push(...this.getInventoryClickLocations(this.playerCraftingGrid, 334, 280, 2, 2, 0));
            clickLocations.push(...this.getInventoryClickLocations(this.craftingResultSlot, 530, 307, 1, 1, 0, true));
        }
        if(this.currentView === 'crafting_table') {
            clickLocations.push(...this.getInventoryClickLocations(this.tableCraftingGrid, 342, 280, 3, 3, 0));
            clickLocations.push(...this.getInventoryClickLocations(this.craftingResultSlot, 530, 324, 1, 1, 0, true));
        }
        if(this.currentView === 'chest' && this.chestInventory) {
             clickLocations.push(...this.getInventoryClickLocations(this.chestInventory, 334, 280, 9, 3, 0));
        }

        const processClick = (pos: Vector2, isRight: boolean) => {
            for (const loc of clickLocations) {
                if (pos.x > loc.rect.x && pos.x < loc.rect.x + loc.rect.w && pos.y > loc.rect.y && pos.y < loc.rect.y + loc.rect.h) {
                    
                    if (!isRight) { // Handle left clicks (single and double)
                        const now = Date.now();
                        const isDoubleClick = now - this.lastClick.time < this.DOUBLE_CLICK_WINDOW &&
                                              loc.rect.slot === this.lastClick.slot &&
                                              loc.inv === this.lastClick.inv;
                        
                        if (isDoubleClick) {
                            this.handleQuickMove(loc.inv, loc.rect.slot);
                            this.lastClick.time = 0; // Prevent triple-click
                        } else {
                            this.handleSlotClick(loc.inv, loc.rect.slot, loc.isCraftingOutput || false, false);
                            this.lastClick = { time: now, slot: loc.rect.slot, inv: loc.inv };
                        }
                    } else { // Handle right clicks
                         this.handleSlotClick(loc.inv, loc.rect.slot, loc.isCraftingOutput || false, true);
                    }
                    return true;
                }
            }
            return false;
        };

        if (rightClicked) {
            processClick(this.mouseHandler.position, true);
        } else {
            for (const pos of leftClicks) {
                if (processClick(pos, false)) break; // only process one click per frame
            }
        }
    }
    
    private handleQuickMove(sourceInv: Inventory, sourceSlotIndex: number) {
        if (this.draggingItem) return; // Don't quick move while dragging

        const itemToMatch = sourceInv.getItem(sourceSlotIndex);
        if (!itemToMatch) return;

        let destInv: Inventory | null = null;
        if (sourceInv === this.player.inventory) {
            if (this.currentView === 'chest' && this.chestInventory) destInv = this.chestInventory;
            else if (this.currentView === 'crafting_table') destInv = this.tableCraftingGrid;
            else if (this.currentView === 'player') destInv = this.playerCraftingGrid;
        } else {
            destInv = this.player.inventory;
        }

        if (!destInv) return;

        const itemIdToMove = itemToMatch.id;

        // Iterate through the source inventory and move all matching items
        for (let i = 0; i < sourceInv.getSize(); i++) {
            const currentItem = sourceInv.getItem(i);
            if (currentItem && currentItem.id === itemIdToMove) {
                const remaining = destInv.addItem(currentItem);
                sourceInv.setItem(i, remaining);
            }
        }
    }
    
    private handleSlotClick(inventory: Inventory, slotIndex: number, isCraftingOutput: boolean, isRightClick: boolean) {
        const clickedItem = inventory.getItem(slotIndex);

        if (isCraftingOutput) {
            if (this.draggingItem || !clickedItem) return;
            const craftedItem = { ...clickedItem };
            const canPlace = this.player.inventory.addItem({ ...craftedItem });
            if (!canPlace) {
                // Take from crafting slot successfully
                const grid = this.currentView === 'crafting_table' ? this.tableCraftingGrid : this.playerCraftingGrid;
                grid.getItems().forEach((item, index) => {
                    if (item) grid.removeItem(index, 1);
                });
            }
            return;
        }

        if (this.draggingItem) {
            if (clickedItem && clickedItem.id === this.draggingItem.item.id) {
                const info = CraftingSystem.getItemInfo(clickedItem.id);
                const maxStack = info ? info.maxStackSize : 64;
                const count = isRightClick ? 1 : this.draggingItem.item.count;
                const canAdd = maxStack - clickedItem.count;
                const toAdd = Math.min(canAdd, count);
                
                clickedItem.count += toAdd;
                this.draggingItem.item.count -= toAdd;
                if (this.draggingItem.item.count <= 0) this.draggingItem = null;

            } else if (!clickedItem) {
                const count = isRightClick && this.draggingItem.item.count > 1 ? 1 : this.draggingItem.item.count;
                inventory.setItem(slotIndex, { ...this.draggingItem.item, count: count });
                this.draggingItem.item.count -= count;
                if (this.draggingItem.item.count <= 0) this.draggingItem = null;
            } else {
                const tempItem = { ...clickedItem };
                inventory.setItem(slotIndex, this.draggingItem.item);
                this.draggingItem.item = tempItem;
            }
        } else if (clickedItem) {
            if (isRightClick && clickedItem.count > 1) {
                const half = Math.ceil(clickedItem.count / 2);
                this.draggingItem = { item: { ...clickedItem, count: half }, fromSlot: slotIndex, fromInventory: inventory };
                clickedItem.count -= half;
            } else {
                this.draggingItem = { item: { ...clickedItem }, fromSlot: slotIndex, fromInventory: inventory };
                inventory.setItem(slotIndex, null);
            }
        }
    }

    private getInventoryClickLocations(inv: Inventory, startX: number, startY: number, cols: number, rows: number, startIndex: number, isCraftingOutput: boolean = false) {
        const locs = [];
        for (let i = 0; i < rows * cols; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + col * (HOTBAR_SLOT_SIZE + 4);
            const y = startY + row * (HOTBAR_SLOT_SIZE + 4);
            locs.push({ inv, rect: { x, y, w: HOTBAR_SLOT_SIZE, h: HOTBAR_SLOT_SIZE, slot: startIndex + i }, isCraftingOutput });
        }
        return locs;
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.isOpen()) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (this.currentView === 'player' || this.currentView === 'crafting_table' || this.currentView === 'chest') {
            this.renderPlayerInventory(ctx);
        }
        if (this.currentView === 'crafting_table') {
            this.renderCraftingTable(ctx);
        }
        if (this.currentView === 'chest' && this.chestInventory) {
            this.renderChest(ctx, this.chestInventory);
        }

        // Render dragging item
        if (this.draggingItem) {
            const cursor = this.touchHandler.getPrimaryTouchPos() || this.mouseHandler.position;
            this.renderItem(ctx, this.draggingItem.item, cursor.x - HOTBAR_ITEM_SIZE / 2, cursor.y - HOTBAR_ITEM_SIZE / 2, HOTBAR_ITEM_SIZE);
        }
    }

    private renderPlayerInventory(ctx: CanvasRenderingContext2D) {
        const yOffset = this.currentView === 'chest' ? 100 : 0;
        ctx.fillStyle = '#c6c6c6';
        ctx.fillRect(320, 200 + yOffset, 480, 420);
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 4;
        ctx.strokeRect(320, 200 + yOffset, 480, 420);

        ctx.font = "20px Minecraftia";
        ctx.fillStyle = '#373737';
        
        // Main inventory
        this.renderInventoryGrid(ctx, this.player.inventory, 334, 416 + yOffset, 9, 3, 9);
        // Hotbar
        this.renderInventoryGrid(ctx, this.player.inventory, 334, 584 + yOffset, 9, 1, 0);

        if(this.currentView !== 'chest') {
            ctx.fillText("Inventory", 334, 225);
            // Player Crafting
            ctx.fillText("Crafting", 334, 265);
            this.renderInventoryGrid(ctx, this.playerCraftingGrid, 334, 280, 2, 2, 0);
            ctx.fillText("->", 460, 320);
            this.renderInventoryGrid(ctx, this.craftingResultSlot, 530, 307, 1, 1, 0);
        }
    }
    
    private renderChest(ctx: CanvasRenderingContext2D, inventory: Inventory) {
        ctx.font = "20px Minecraftia";
        ctx.fillStyle = '#373737';
        ctx.fillText("Chest", 334, 265);
        this.renderInventoryGrid(ctx, inventory, 334, 280, 9, 3, 0);
    }

    private renderCraftingTable(ctx: CanvasRenderingContext2D) {
        this.renderInventoryGrid(ctx, this.tableCraftingGrid, 342, 280, 3, 3, 0);
        ctx.fillText("->", 490, 340);
        this.renderInventoryGrid(ctx, this.craftingResultSlot, 530, 324, 1, 1, 0);
    }
    
    private renderInventoryGrid(ctx: CanvasRenderingContext2D, inventory: Inventory, startX: number, startY: number, cols: number, rows: number, startIndex: number) {
        for (let i = 0; i < rows * cols; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + col * (HOTBAR_SLOT_SIZE + 4);
            const y = startY + row * (HOTBAR_SLOT_SIZE + 4);

            ctx.fillStyle = '#8b8b8b';
            ctx.fillRect(x, y, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE);
            ctx.strokeStyle = '#373737';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE);
            
            const item = inventory.getItem(startIndex + i);
            if (item) {
                this.renderItem(ctx, item, x + (HOTBAR_SLOT_SIZE - HOTBAR_ITEM_SIZE) / 2, y + (HOTBAR_SLOT_SIZE - HOTBAR_ITEM_SIZE) / 2, HOTBAR_ITEM_SIZE);
            }
        }
    }
    
    private renderItem(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, size: number) {
        const itemInfo = CraftingSystem.getItemInfo(item.id);
        if(!itemInfo) return;
        
        const blockId = itemInfo.blockId;
        if(blockId) {
            const blockType = getBlockType(blockId);
            if(blockType) {
                if(blockType.texture) {
                    blockType.texture(ctx, x, y, size);
                } else {
                    ctx.fillStyle = blockType.color;
                    ctx.fillRect(x,y,size,size);
                }
            }
        }

        if (item.count > 1) {
            ctx.font = "18px Minecraftia";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(item.count.toString(), x + size - 2, y + size - 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.count.toString(), x + size - 3, y + size - 3);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        }
    }
}