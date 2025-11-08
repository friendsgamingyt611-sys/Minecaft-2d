import { Player } from '../entities/Player';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { MouseHandler } from '../input/MouseHandler';
import { ARMOR_SLOTS, CRAFTING_GRID_SLOTS } from '../core/Constants';
// FIX: Add missing import for SlotType.
import { Item, ItemId, Vector2, ItemCategory, PlayerPose, BodyPart, SlotType, Recipe } from '../types';
import { Inventory } from '../world/Inventory';
import { getBlockType } from '../world/BlockRegistry';
import { TouchHandler } from '../input/TouchHandler';
import { ItemRegistry } from '../inventory/ItemRegistry';
import { ITEM_CATEGORIES } from '../inventory/ItemClassification';
import { ChunkSystem } from '../world/ChunkSystem';
import { PlayerRenderer } from '../rendering/PlayerRenderer';
import { SmeltingSystem } from '../systems/SmeltingSystem';

type UIView = 'none' | 'player_survival' | 'player_creative' | 'crafting_table' | 'furnace' | 'chest';
type UIContext = {
    worldX?: number;
    worldY?: number;
    chestInventory?: Inventory;
};

interface Slot {
    rect: { x: number, y: number, w: number, h: number };
    inventory: Inventory;
    slotIndex: number;
    // FIX: Replaced custom SlotUIType with the correctly imported SlotType.
    type: SlotType;
    armorType?: 'helmet' | 'chestplate' | 'leggings' | 'boots';
}

export class InventoryUI {
    private player: Player;
    private craftingSystem: CraftingSystem;
    private mouseHandler: MouseHandler;
    private touchHandler: TouchHandler;
    private world: ChunkSystem;
    private playerRenderer: PlayerRenderer;
    private actionCallback: (action: string, data: any) => void;
    private canvas: HTMLCanvasElement;
    
    private currentView: UIView = 'none';
    private uiContext: UIContext | null = null;
    
    private draggingItem: { item: Item, fromSlot: Slot | null, originalPosition: Vector2 } | null = null;
    private hoverItem: { item: Item, info: any } | null = null;

    private creativeSearchTerm: string = '';
    private creativeVisibleItems: ItemId[] = [];
    private creativeScrollY: number = 0;
    private creativeActiveTab: ItemCategory = 'Building Blocks';
    private creativeGridRect = { x: 0, y: 0, w: 0, h: 0 };
    private creativeTabsRects: Map<ItemCategory, {x: number, y: number, w: number, h: number}> = new Map();

    private craftingGrid: Inventory;
    private craftResult: Item | null = null;
    private recipeViewItem: Recipe | null = null;

    private slotRects: Slot[] = [];
    
    private categoryIcons: Map<ItemCategory, ItemId> = new Map([
        ['Building Blocks', ItemId.GRASS],
        ['Decorations', ItemId.OAK_SAPLING],
        ['Redstone', ItemId.REDSTONE_DUST],
        ['Tools & Combat', ItemId.IRON_SWORD],
        ['Materials', ItemId.IRON_INGOT],
    ]);


    constructor(player: Player, craftingSystem: CraftingSystem, mouseHandler: MouseHandler, touchHandler: TouchHandler, world: ChunkSystem, actionCallback: (action: string, data: any) => void) {
        this.player = player;
        this.craftingSystem = craftingSystem;
        this.mouseHandler = mouseHandler;
        this.touchHandler = touchHandler;
        this.world = world;
        this.playerRenderer = new PlayerRenderer();
        this.craftingGrid = new Inventory(CRAFTING_GRID_SLOTS);
        this.actionCallback = actionCallback;
        this.canvas = document.querySelector('canvas')!;
        this.updateCreativeItems();
    }

    public isOpen(): boolean {
        return this.currentView !== 'none';
    }

    public open(view: UIView, context?: UIContext) {
        this.currentView = view;
        this.uiContext = context || null;
        this.craftingGrid.clear();
        this.creativeActiveTab = 'Building Blocks';
        this.updateCreativeItems();
        if (this.player.gamemode === 'creative' && view !== 'furnace') {
            this.currentView = 'player_creative';
        }
        this.buildSlotRects();
    }
    
    public close() {
        if (!this.isOpen()) return;
        
        if (this.draggingItem && this.draggingItem.fromSlot?.type !== 'creative_display') {
            const remaining = this.player.inventory.addItem(this.draggingItem.item);
            if (remaining) {
                 this.actionCallback('dropItem', { 
                    item: remaining,
                    position: { x: this.player.position.x + this.player.width / 2, y: this.player.position.y + this.player.height * 0.4 },
                    velocity: { x: 0, y: 0 }
                });
            }
        }
        
        this.draggingItem = null;
        this.currentView = 'none';
        this.uiContext = null;
        this.slotRects = [];
        this.recipeViewItem = null;
    }

    public update() {
        if (!this.isOpen()) return;

        this.handlePointerInput();
        this.updateCrafting();
        
        const pos = this.mouseHandler.position;
        this.hoverItem = null;
        if(this.recipeViewItem) return; // Don't show tooltips over recipe view

        const slot = this.getSlotAt(pos.x, pos.y);
        if (slot && slot.inventory.getItem(slot.slotIndex)) {
            const item = slot.inventory.getItem(slot.slotIndex)!;
            this.hoverItem = { item, info: ItemRegistry.getItemInfo(item.id) };
        }
    }
    
    private updateCrafting() {
        const grid: (Item | null)[][] = [];
        const gridSize = (this.currentView === 'crafting_table' || this.player.gamemode === 'creative') ? 3 : 2;
        for (let y = 0; y < gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < gridSize; x++) {
                grid[y][x] = this.craftingGrid.getItem(y * gridSize + x);
            }
        }
        this.craftResult = this.craftingSystem.checkGrid(grid);
    }


    private updateCreativeItems() {
        const allItems = ItemRegistry.getItemsByCategory(this.creativeActiveTab);
        if (this.creativeSearchTerm) {
            this.creativeVisibleItems = allItems.filter(id => 
                ItemRegistry.getItemInfo(id)?.name.toLowerCase().includes(this.creativeSearchTerm.toLowerCase())
            );
        } else {
            this.creativeVisibleItems = allItems;
        }
    }
    
    private getSlotAt(mouseX: number, mouseY: number): Slot | null {
        for (const slot of this.slotRects) {
            if (mouseX >= slot.rect.x && mouseX <= slot.rect.x + slot.rect.w &&
                mouseY >= slot.rect.y && mouseY <= slot.rect.y + slot.rect.h) {
                return slot;
            }
        }
        return null;
    }

    private handlePointerInput() {
        const pos = this.mouseHandler.position;

        if (this.recipeViewItem && this.mouseHandler.isLeftClicked) {
            const panelW = 300, panelH = 200;
            const panelX = (this.canvas.width - panelW) / 2;
            const panelY = (this.canvas.height - panelH) / 2;
            if (!(pos.x > panelX && pos.x < panelX + panelW && pos.y > panelY && pos.y < panelY + panelH)) {
                this.recipeViewItem = null;
                return;
            }
        }

        if (this.mouseHandler.isLeftClicked) {
             const clickedSlot = this.getSlotAt(pos.x, pos.y);
             if (clickedSlot) {
                 this.handleSlotClick(clickedSlot, false);
                 return;
             }
             
            for (const [category, rect] of this.creativeTabsRects.entries()) {
                if (pos.x > rect.x && pos.x < rect.x + rect.w && pos.y > rect.y && pos.y < rect.y + rect.h) {
                    this.creativeActiveTab = category;
                    this.creativeScrollY = 0;
                    this.updateCreativeItems();
                    return;
                }
            }

            const grid = this.creativeGridRect;
            if(pos.x > grid.x && pos.x < grid.x + grid.w && pos.y > grid.y && pos.y < grid.y + grid.h) {
                const col = Math.floor((pos.x - grid.x) / 54);
                const row = Math.floor((pos.y - grid.y + this.creativeScrollY) / 54);
                const index = row * 10 + col;
                
                if (index >= 0 && index < this.creativeVisibleItems.length) {
                    const itemId = this.creativeVisibleItems[index];
                    const itemInfo = ItemRegistry.getItemInfo(itemId);

                    if (this.player.gamemode === 'survival') {
                        const hasItems = this.player.inventory.getAllItemIds();
                        if (!hasItems.has(itemId)) {
                            this.recipeViewItem = this.craftingSystem.findRecipeByResult(itemId);
                            return; 
                        }
                    }

                    if (itemInfo) {
                        this.draggingItem = {
                            item: { id: itemId, count: this.mouseHandler.isMiddleDown ? 1 : itemInfo.maxStackSize },
                            fromSlot: { inventory: new Inventory(1), slotIndex: -1, type: 'creative_display', rect: {x:0,y:0,w:0,h:0} },
                            originalPosition: pos
                        };
                    }
                }
                return;
            }
             
            if (this.draggingItem) {
                 this.actionCallback('dropItem', { 
                    item: this.draggingItem.item,
                    position: { x: this.player.position.x + this.player.width / 2, y: this.player.position.y + this.player.height * 0.4 },
                    velocity: { x: this.player.facingDirection * 6, y: -6 }
                });
                this.draggingItem = null;
            }

        } else if (this.mouseHandler.isRightClicked) {
            const clickedSlot = this.getSlotAt(pos.x, pos.y);
            if (clickedSlot) this.handleSlotClick(clickedSlot, true);
        }
    }

    private handleSlotClick(slot: Slot, isRightClick: boolean) {
        if (slot.type === 'creative_display') return; // Cannot interact with recipe book slots

        const itemInSlot = slot.inventory.getItem(slot.slotIndex);
        const heldItemInfo = this.draggingItem ? ItemRegistry.getItemInfo(this.draggingItem.item.id) : null;

        // Armor slot validation
        if (slot.type === 'armor' && heldItemInfo && (!heldItemInfo.armorInfo || heldItemInfo.armorInfo.type !== slot.armorType)) {
            return; // Wrong armor type for this slot
        }

        if (this.draggingItem) {
            if (isRightClick) { // Place one item
                if (!itemInSlot || itemInSlot.id === this.draggingItem.item.id) {
                    if ((itemInSlot ? itemInSlot.count : 0) < ItemRegistry.getItemInfo(this.draggingItem.item.id)!.maxStackSize) {
                        slot.inventory.addItemToSlot({ ...this.draggingItem.item, count: 1}, slot.slotIndex);
                        this.draggingItem.item.count--;
                        if (this.draggingItem.item.count <= 0) this.draggingItem = null;
                    }
                }
            } else { // Place whole stack
                if (itemInSlot && itemInSlot.id === this.draggingItem.item.id) { // Merge
                    const canAdd = ItemRegistry.getItemInfo(itemInSlot.id)!.maxStackSize - itemInSlot.count;
                    const toAdd = Math.min(canAdd, this.draggingItem.item.count);
                    itemInSlot.count += toAdd;
                    this.draggingItem.item.count -= toAdd;
                    if (this.draggingItem.item.count <= 0) this.draggingItem = null;
                } else { // Swap
                    slot.inventory.setItem(slot.slotIndex, this.draggingItem.item);
                    if (this.draggingItem.fromSlot && this.draggingItem.fromSlot.type !== 'creative_display') {
                        this.draggingItem.fromSlot.inventory.setItem(this.draggingItem.fromSlot.slotIndex, itemInSlot);
                    }
                    this.draggingItem = itemInSlot ? { ...this.draggingItem, item: itemInSlot } : null;
                }
            }
        } else { // Not dragging, picking up
            if (itemInSlot) {
                if (isRightClick) { // Pick up half
                    const half = Math.ceil(itemInSlot.count / 2);
                    this.draggingItem = { item: { ...itemInSlot, count: half }, fromSlot: slot, originalPosition: this.mouseHandler.position };
                    itemInSlot.count -= half;
                    if(itemInSlot.count <= 0) slot.inventory.setItem(slot.slotIndex, null);
                } else { // Pick up whole stack
                    this.draggingItem = { item: itemInSlot, fromSlot: slot, originalPosition: this.mouseHandler.position };
                    slot.inventory.setItem(slot.slotIndex, null);
                }
            }
        }

        if (slot.type === 'crafting_output' && this.craftResult && this.draggingItem === null) {
            this.draggingItem = { item: this.craftResult, fromSlot: null, originalPosition: this.mouseHandler.position };
            const gridSize = (this.currentView === 'crafting_table' || this.player.gamemode === 'creative') ? 3 : 2;
            for(let i=0; i<gridSize*gridSize; i++) this.craftingGrid.removeItem(i, 1);
        }
    }


    public render(ctx: CanvasRenderingContext2D) {
        if (!this.isOpen()) return;

        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;

        switch(this.currentView) {
            case 'player_survival':
            case 'player_creative':
            case 'crafting_table': // Crafting table uses the same layout
                this.renderMainInventoryLayout(ctx);
                break;
            case 'furnace':
                this.renderFurnace(ctx);
                break;
        }
        
        if (this.recipeViewItem) {
            this.renderRecipeView(ctx);
        }
        
        if (this.draggingItem) {
            const pos = this.mouseHandler.position;
            this.renderItem(ctx, this.draggingItem.item, pos.x - 24, pos.y - 24, 48, false);
        } else if (this.hoverItem) {
            const pos = this.mouseHandler.position;
            this.renderTooltip(ctx, this.hoverItem.item, pos.x, pos.y);
        }
    }
    
    private buildSlotRects() {
        this.slotRects = [];
        const invStartX = 700, invStartY = 350;

        // Player inventory
        for (let i = 0; i < 27; i++) {
            const row = Math.floor(i / 9); const col = i % 9;
            this.slotRects.push({ rect: { x: invStartX + col*54, y: invStartY + row*54, w: 52, h: 52}, inventory: this.player.inventory, slotIndex: i + 9, type: 'player'});
        }
        // Player hotbar
        for (let i = 0; i < 9; i++) {
            this.slotRects.push({ rect: { x: invStartX + i*54, y: invStartY + 54*3 + 10, w: 52, h: 52}, inventory: this.player.inventory, slotIndex: i, type: 'hotbar'});
        }

        switch(this.currentView) {
            case 'player_survival':
            case 'player_creative':
            case 'crafting_table': {
                const is3x3 = this.currentView === 'crafting_table' || this.player.gamemode === 'creative';
                const craftGridSize = is3x3 ? 3 : 2;
                const craftStartX = 790, craftStartY = 140;

                // Crafting grid
                for (let i = 0; i < craftGridSize * craftGridSize; i++) {
                    const row = Math.floor(i / craftGridSize); const col = i % craftGridSize;
                    this.slotRects.push({ rect: { x: craftStartX + col*54, y: craftStartY + row*54, w: 52, h: 52}, inventory: this.craftingGrid, slotIndex: i, type: 'crafting_input' });
                }
                const outX = is3x3 ? 990 : 920;
                const outY = craftStartY + (is3x3 ? 54 : 0);
                this.slotRects.push({ rect: { x: outX, y: outY, w: 52, h: 52 }, inventory: new Inventory(1), slotIndex: 0, type: 'crafting_output' });

                // Armor slots
                const armorX = 700, armorY = 140;
                this.slotRects.push({ rect: { x: armorX, y: armorY, w: 52, h: 52}, inventory: this.player.armorInventory, slotIndex: 0, type: 'armor', armorType: 'helmet'});
                this.slotRects.push({ rect: { x: armorX, y: armorY + 54, w: 52, h: 52}, inventory: this.player.armorInventory, slotIndex: 1, type: 'armor', armorType: 'chestplate'});
                this.slotRects.push({ rect: { x: armorX, y: armorY + 108, w: 52, h: 52}, inventory: this.player.armorInventory, slotIndex: 2, type: 'armor', armorType: 'leggings'});
                this.slotRects.push({ rect: { x: armorX, y: armorY + 162, w: 52, h: 52}, inventory: this.player.armorInventory, slotIndex: 3, type: 'armor', armorType: 'boots'});
                
                // Offhand slot
                this.slotRects.push({ rect: { x: armorX + 220, y: armorY + 162, w: 52, h: 52}, inventory: this.player.offhandInventory, slotIndex: 0, type: 'offhand' });
                break;
            }
            case 'furnace': {
                const blockEntity = this.world.getBlockEntity(this.uiContext!.worldX!, this.uiContext!.worldY!);
                if (!blockEntity) break;
                this.slotRects.push({ rect: { x: 200, y: 140, w: 52, h: 52}, inventory: blockEntity.inventory!, slotIndex: 0, type: 'furnace_input'});
                this.slotRects.push({ rect: { x: 200, y: 140 + 54 * 2, w: 52, h: 52}, inventory: blockEntity.inventory!, slotIndex: 1, type: 'furnace_fuel'});
                this.slotRects.push({ rect: { x: 350, y: 220, w: 64, h: 64}, inventory: blockEntity.inventory!, slotIndex: 2, type: 'furnace_output'});
                break;
            }
        }
    }

    private renderMainInventoryLayout(ctx: CanvasRenderingContext2D) {
        this.renderCreativePanel(ctx, 40, 40, 580, 640);
        this.renderPlayerPanel(ctx, 640, 40, 600, 640);
    }
    
    private renderPlayerPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        this.renderPanel(ctx, x, y, w, h);
        ctx.fillStyle = '#373737';
        ctx.font = "24px Minecraftia";
        ctx.textAlign = 'left';
        
        const is3x3 = this.currentView === 'crafting_table' || this.player.gamemode === 'creative';
        const title = is3x3 ? "Crafting" : "Inventory";
        ctx.fillText(title, x + 60, y + 40);

        // Player Preview
        this.renderPlayerPreview(ctx, x + 130, y + 250, 80);

        // Armor & Off-hand Slots
        this.slotRects.filter(s => s.type === 'armor' || s.type === 'offhand').forEach(slot => {
             this.renderSlot(ctx, slot.rect.x, slot.rect.y, slot.inventory.getItem(slot.slotIndex), false, slot);
        });
        
        // Crafting Grid
        this.slotRects.filter(s => s.type === 'crafting_input').forEach(slot => {
            this.renderSlot(ctx, slot.rect.x, slot.rect.y, slot.inventory.getItem(slot.slotIndex));
        });
        
        // Crafting Arrow and Output
        const outSlot = this.slotRects.find(s => s.type === 'crafting_output')!;
        this.renderCraftingArrow(ctx, outSlot.rect.x - 60, outSlot.rect.y + 26);
        this.renderSlot(ctx, outSlot.rect.x, outSlot.rect.y, this.craftResult);

        // Player Inventory & Hotbar
        this.renderInventoryGrid(ctx, this.player.inventory, x + 60, y + 310, 9, 3, 9);
        this.renderInventoryGrid(ctx, this.player.inventory, x + 60, y + 310 + 54*3 + 10, 9, 1, 0);
    }
    
    private renderFurnace(ctx: CanvasRenderingContext2D) {
        this.renderPanel(ctx, 640, 40, 600, 640);
        ctx.fillStyle = '#373737';
        ctx.font = "24px Minecraftia";
        ctx.fillText("Inventory", 700, 80);
        this.renderInventoryGrid(ctx, this.player.inventory, 700, 120, 9, 3, 9);
        this.renderInventoryGrid(ctx, this.player.inventory, 700, 120 + 54*3 + 10, 9, 1, 0);

        this.renderPanel(ctx, 40, 40, 580, 640);
        ctx.fillStyle = '#373737';
        ctx.font = "24px Minecraftia";
        ctx.fillText("Furnace", 80, 80);
        
        const blockEntity = this.world.getBlockEntity(this.uiContext!.worldX!, this.uiContext!.worldY!);
        if (!blockEntity || !blockEntity.inventory) { this.close(); return; }

        this.slotRects.filter(s => s.type.startsWith('furnace')).forEach(slot => {
             this.renderSlot(ctx, slot.rect.x, slot.rect.y, slot.inventory.getItem(slot.slotIndex), slot.type === 'furnace_output');
        });
        
        const fireProgress = blockEntity.maxFuelTime! > 0 ? (blockEntity.fuelTime! / blockEntity.maxFuelTime!) : 0;
        this.renderFurnaceFire(ctx, 200, 220, fireProgress);
        const recipe = SmeltingSystem.getSmeltingResult(blockEntity.inventory.getItem(0)?.id!);
        const smeltProgress = recipe ? (blockEntity.smeltTime! / recipe.cookTime) : 0;
        this.renderSmeltingArrow(ctx, 260, 220, smeltProgress);
    }
    
    private renderPanel(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number) {
        ctx.fillStyle = '#c6c6c6';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);
    }
    
    private renderCreativePanel(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number) {
        this.renderPanel(ctx, x, y, w, h);
        this.renderCreativeTabs(ctx, x, y);
        ctx.fillStyle = '#373737';
        ctx.font = "24px Minecraftia";
        ctx.textAlign = 'left';
        ctx.fillText(this.creativeActiveTab, x + 50, y + 30);
        this.renderCreativeGrid(ctx, x + 10, y + 50, w - 20, h - 60);
    }

    private renderCreativeTabs(ctx: CanvasRenderingContext2D, panelX: number, panelY: number) {
        const tabWidth = 50;
        const tabHeight = 50;
        this.creativeTabsRects.clear();

        ITEM_CATEGORIES.forEach((category, i) => {
            const icon = this.categoryIcons.get(category);
            if (!icon) return;

            const x = panelX - tabWidth + 4;
            const y = panelY + 10 + i * (tabHeight + 2);
            if (y + tabHeight > panelY + 640) return;
            const rect = { x, y, w: tabWidth, h: tabHeight };
            this.creativeTabsRects.set(category, rect);
            
            const isActive = category === this.creativeActiveTab;
            ctx.fillStyle = isActive ? '#c6c6c6' : '#8b8b8b';
            ctx.fillRect(x, y, tabWidth, tabHeight);

            this.renderItem(ctx, {id: icon, count: 1}, x + 9, y + 9, 32, false);
        });
    }

    private renderCreativeGrid(ctx: CanvasRenderingContext2D, startX: number, startY: number, gridW: number, gridH: number) {
        this.creativeGridRect = { x: startX, y: startY, w: gridW, h: gridH };
        ctx.fillStyle = '#8b8b8b';
        ctx.fillRect(startX - 2, startY - 2, gridW + 4, gridH + 4);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, startY, gridW, gridH);
        ctx.clip();
        
        const hasItems = this.player.inventory.getAllItemIds();
        
        for (let i = 0; i < this.creativeVisibleItems.length; i++) {
            const itemId = this.creativeVisibleItems[i];
            const row = Math.floor(i / 10);
            const col = i % 10;
            const x = startX + col * 56;
            const y = startY + row * 56 - this.creativeScrollY;

            if (y > startY - 56 && y < startY + gridH) {
                const isOwned = this.player.gamemode === 'creative' || hasItems.has(itemId);
                this.renderItem(ctx, { id: itemId, count: 1 }, x + 4, y + 4, 48, !isOwned);
            }
        }
        ctx.restore();
    }
    
    private renderInventoryGrid(ctx: CanvasRenderingContext2D, inventory: Inventory, startX: number, startY: number, cols: number, rows: number, startIndex: number) {
        for (let i = 0; i < rows * cols; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + col * 54;
            const y = startY + row * 54;
            const item = inventory.getItem(startIndex + i);
            const slot = this.getSlotAt(x + 1, y + 1);
            this.renderSlot(ctx, x, y, item, false, slot);
        }
    }

    private renderSlot(ctx: CanvasRenderingContext2D, x: number, y: number, item: Item | null, large: boolean = false, slotInfo?: Slot | null) {
        const size = large ? 64 : 52;
        ctx.fillStyle = '#8b8b8b';
        ctx.fillRect(x, y, size, size);

        // Draw placeholder icons
        if (!item && slotInfo?.type === 'armor') {
            this.drawArmorPlaceholder(ctx, x, y, size, slotInfo.armorType!);
        }

        ctx.strokeStyle = '#373737';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);
        if (item) {
            this.renderItem(ctx, item, x + (size-48)/2, y + (size-48)/2, 48, false);
        }
    }
    
    private renderDurabilityBar(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, width: number): void {
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        const maxDurability = itemInfo?.toolInfo?.durability || itemInfo?.armorInfo?.durability;
        
        if (item.durability === undefined || !maxDurability || item.durability >= maxDurability) return;

        const durabilityPercent = item.durability / maxDurability;
        const barHeight = 4;
        const barY = y + width - barHeight - 2;
        
        let barColor = '#00FF00'; // Green
        if (durabilityPercent < 0.5) barColor = '#FFFF00'; // Yellow
        if (durabilityPercent < 0.25) barColor = '#FF0000'; // Red

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x + 2, barY, width - 4, barHeight);
        
        ctx.fillStyle = barColor;
        ctx.fillRect(x + 2, barY, (width - 4) * durabilityPercent, barHeight);
    }

    private renderItem(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, size: number, isUnowned: boolean) {
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        if(!itemInfo) return;
        
        ctx.save();
        if(isUnowned && this.player.gamemode !== 'creative') {
            ctx.globalAlpha = 0.5;
            ctx.filter = 'grayscale(1)';
        }
        
        const blockId = itemInfo.blockId;
        if(blockId) {
            const blockType = getBlockType(blockId);
            if(blockType && blockType.texture) {
                blockType.texture(ctx, x, y, size);
            }
        }

        if (item.count > 1) {
            ctx.font = "18px Minecraftia";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(item.count.toString(), x + size, y + size);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.count.toString(), x + size - 1, y + size - 1);
        }

        this.renderDurabilityBar(ctx, item, x, y, size);

        ctx.restore();

        if (isUnowned && this.player.gamemode !== 'creative') {
            ctx.strokeStyle = '#c53030';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
        }
    }

    private renderCraftingArrow(ctx: CanvasRenderingContext2D, x:number, y:number) {
        ctx.fillStyle = '#8b8b8b';
        ctx.beginPath();
        ctx.moveTo(x, y-15); ctx.lineTo(x + 20, y-15); ctx.lineTo(x + 20, y-25); ctx.lineTo(x + 40, y);
        ctx.lineTo(x + 20, y+25); ctx.lineTo(x + 20, y+15); ctx.lineTo(x, y+15);
        ctx.closePath();
        ctx.fill();
    }
    
    private renderSmeltingArrow(ctx: CanvasRenderingContext2D, x:number, y:number, progress: number) {
        this.renderCraftingArrow(ctx, x, y);
        if(progress > 0) {
            ctx.fillStyle = '#4CAF50';
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y-25, 40 * Math.min(1, progress), 50);
            ctx.clip();
            this.renderCraftingArrow(ctx,x,y);
            ctx.restore();
        }
    }
    
    private renderFurnaceFire(ctx: CanvasRenderingContext2D, x:number, y:number, progress: number) {
        ctx.fillStyle = '#8b8b8b';
        ctx.fillRect(x+1, y, 50, 50);
        if(progress > 0) {
            const fireHeight = 50 * progress;
            ctx.fillStyle = '#FFC107';
            ctx.fillRect(x+1, y + 50 - fireHeight, 50, fireHeight);
        }
    }

    private renderTooltip(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number) {
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        if (!itemInfo) return;
        const text = itemInfo.name;
        ctx.font = "20px Minecraftia";
        const metrics = ctx.measureText(text);
        const width = metrics.width + 20;
        const height = 30;
        const tooltipX = x + 15;
        const tooltipY = y - 35;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(tooltipX, tooltipY, width, height);
        ctx.strokeStyle = '#5A2E8B';
        ctx.lineWidth = 2;
        ctx.strokeRect(tooltipX, tooltipY, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tooltipX + 10, tooltipY + height / 2);
    }

    private drawArmorPlaceholder(ctx: CanvasRenderingContext2D, x:number, y:number, size:number, type: string) {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const p = (n: number) => n * size; // percentage of size
        const sx = (n: number) => x + p(n);
        const sy = (n: number) => y + p(n);

        switch(type) {
            case 'helmet':
                ctx.arc(sx(0.5), sy(0.6), p(0.3), Math.PI * 1.1, Math.PI * 1.9);
                break;
            case 'chestplate':
                ctx.moveTo(sx(0.2), sy(0.2)); ctx.lineTo(sx(0.2), sy(0.8)); ctx.lineTo(sx(0.8), sy(0.8));
                ctx.lineTo(sx(0.8), sy(0.2)); ctx.lineTo(sx(0.6), sy(0.4)); ctx.lineTo(sx(0.4), sy(0.4));
                ctx.closePath();
                break;
            case 'leggings':
                ctx.moveTo(sx(0.2), sy(0.2)); ctx.lineTo(sx(0.2), sy(0.8)); ctx.lineTo(sx(0.45), sy(0.8));
                ctx.lineTo(sx(0.45), sy(0.5)); ctx.lineTo(sx(0.55), sy(0.5)); ctx.lineTo(sx(0.55), sy(0.8));
                ctx.lineTo(sx(0.8), sy(0.8)); ctx.lineTo(sx(0.8), sy(0.2));
                break;
            case 'boots':
                ctx.moveTo(sx(0.2), sy(0.4)); ctx.lineTo(sx(0.2), sy(0.8)); ctx.lineTo(sx(0.8), sy(0.8));
                ctx.lineTo(sx(0.8), sy(0.6));
                break;
        }
        ctx.stroke();
    }
    
    private getPlayerPreviewPose(): PlayerPose {
        const { position, width, height, facingDirection, skinColor, shirtColor, pantsColor, eyeOffset } = this.player;
        const pose: PlayerPose = {
            head: { x: 0, y: 0, width: 32, height: 32, rotation: 0, color: skinColor, z: 2 },
            torso: { x: 0, y: 0, width: 32, height: 48, rotation: 0, color: shirtColor, z: 1 },
            leftArm: { x: 0, y: 0, width: 16, height: 48, rotation: 0.1, color: skinColor, z: facingDirection === 1 ? 0 : 2 },
            rightArm: { x: 0, y: 0, width: 16, height: 48, rotation: -0.1, color: skinColor, z: facingDirection === 1 ? 2 : 0 },
            leftLeg: { x: 0, y: 0, width: 16, height: 48, rotation: 0, color: pantsColor, z: facingDirection === 1 ? 0 : 2 },
            rightLeg: { x: 0, y: 0, width: 16, height: 48, rotation: 0, color: pantsColor, z: facingDirection === 1 ? 2 : 0 },
            eyeOffset: eyeOffset,
        };
        pose.torso.y = 24;
        pose.head.y = pose.torso.y - 40;
        pose.leftArm.x = -24;
        pose.leftArm.y = 24;
        pose.rightArm.x = 24;
        pose.rightArm.y = 24;
        pose.leftLeg.x = -8;
        pose.leftLeg.y = 72;
        pose.rightLeg.x = 8;
        pose.rightLeg.y = 72;
        return pose;
    }
    
    private renderPlayerPreview(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size/128, size/128);
        this.playerRenderer.render(ctx, this.player, this.getPlayerPreviewPose());
        ctx.restore();
    }
    
    private renderRecipeView(ctx: CanvasRenderingContext2D) {
        if (!this.recipeViewItem) return;

        const panelW = 300, panelH = 200;
        const panelX = (ctx.canvas.width - panelW) / 2;
        const panelY = (ctx.canvas.height - panelH) / 2;

        this.renderPanel(ctx, panelX, panelY, panelW, panelH);
        
        const resultInfo = ItemRegistry.getItemInfo(this.recipeViewItem.result.id)!;
        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#373737';
        ctx.textAlign = 'center';
        ctx.fillText(resultInfo.name, panelX + panelW/2, panelY + 30);
        
        const shape = this.recipeViewItem.shape;
        const recipeH = shape.length;
        const recipeW = shape[0].length;
        const slotSize = 40;
        const gridW = recipeW * slotSize;
        const gridX = panelX + (panelW/2 - gridW - 30);
        const gridY = panelY + 60;

        for(let r=0; r < recipeH; r++) {
            for (let c=0; c < recipeW; c++) {
                const itemId = shape[r][c];
                this.renderSlot(ctx, gridX + c*slotSize, gridY + r*slotSize, itemId ? {id: itemId, count: 1} : null);
            }
        }
        
        this.renderCraftingArrow(ctx, gridX + gridW + 10, gridY + (recipeH * slotSize)/2);
        this.renderSlot(ctx, gridX + gridW + 60, gridY + (recipeH*slotSize - 52)/2, this.recipeViewItem.result, true);
    }
}