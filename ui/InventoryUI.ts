import { Player } from '../entities/Player';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { MouseHandler } from '../input/MouseHandler';
import { ARMOR_SLOTS, CRAFTING_GRID_SLOTS, HOTBAR_SLOTS } from '../core/Constants';
import { Item, ItemId, Vector2, ItemCategory, PlayerPose, BodyPart, SlotType, Recipe } from '../types';
import { Inventory } from '../world/Inventory';
import { getBlockType } from '../world/BlockRegistry';
import { TouchHandler } from '../input/TouchHandler';
import { ItemRegistry } from '../inventory/ItemRegistry';
import { ITEM_CATEGORIES } from '../inventory/ItemClassification';
import { ChunkSystem } from '../world/ChunkSystem';
import { PlayerRenderer } from '../rendering/PlayerRenderer';
import { SmeltingSystem } from '../systems/SmeltingSystem';
import { InputManager } from '../input/InputManager';
import { AnimationSystem } from '../rendering/AnimationSystem';
import { ItemRenderer } from '../rendering/ItemRenderer';
import { VirtualKeyboard } from '../input/VirtualKeyboard';

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
    private inputManager: InputManager;
    private animationSystem: AnimationSystem;
    
    private currentView: UIView = 'none';
    private uiContext: UIContext | null = null;
    
    private draggingItem: { item: Item, fromSlot: Slot | null, originalPosition: Vector2 } | null = null;
    private hoverItem: { item: Item, info: any } | null = null;

    private creativeSearchTerm: string = '';
    private creativeVisibleItems: ItemId[] = [];
    private creativeScrollY: number = 0;
    private creativeMaxScrollY: number = 0;
    private creativeActiveTab: ItemCategory = 'Building Blocks';
    private creativeGridRect = { x: 0, y: 0, w: 0, h: 0 };
    private creativeTabsRects: Map<ItemCategory, {x: number, y: number, w: number, h: number}> = new Map();
    private creativeSearchRect = { x: 0, y: 0, w: 0, h: 0 };

    private craftingGrid: Inventory;
    private craftResult: Item | null = null;

    private slotRects: Slot[] = [];
    
    private categoryIcons: Map<ItemCategory, ItemId> = new Map([
        ['Building Blocks', ItemId.GRASS],
        ['Decorations', ItemId.OAK_SAPLING],
        ['Redstone', ItemId.REDSTONE_DUST],
        ['Tools & Combat', ItemId.IRON_SWORD],
        ['Materials', ItemId.IRON_INGOT],
        ['Foodstuffs', ItemId.ROTTEN_FLESH],
        ['Miscellaneous', ItemId.ZOMBIE_SPAWN_EGG],
    ]);


    constructor(player: Player, craftingSystem: CraftingSystem, mouseHandler: MouseHandler, touchHandler: TouchHandler, world: ChunkSystem, actionCallback: (action: string, data: any) => void, inputManager: InputManager, animationSystem: AnimationSystem) {
        this.player = player;
        this.craftingSystem = craftingSystem;
        this.mouseHandler = mouseHandler;
        this.touchHandler = touchHandler;
        this.world = world;
        this.playerRenderer = new PlayerRenderer();
        this.craftingGrid = new Inventory(CRAFTING_GRID_SLOTS);
        this.actionCallback = actionCallback;
        this.canvas = document.querySelector('canvas')!;
        this.inputManager = inputManager;
        this.animationSystem = animationSystem;
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
        this.creativeScrollY = 0;
        if (this.player.gamemode === 'creative' && view !== 'furnace') {
            this.currentView = 'player_creative';
        }
        this.updateCreativeItems();
        this.buildSlotRects();
    }
    
    public close() {
        if (!this.isOpen()) return;
        
        // Return dragged item to inventory or drop it if inventory is full
        if (this.draggingItem) {
            let itemToReturn = this.draggingItem.item;
            if (this.draggingItem.fromSlot && this.draggingItem.fromSlot.type !== 'creative_display') {
                const existing = this.draggingItem.fromSlot.inventory.getItem(this.draggingItem.fromSlot.slotIndex);
                if (!existing) {
                    this.draggingItem.fromSlot.inventory.setItem(this.draggingItem.fromSlot.slotIndex, itemToReturn);
                    itemToReturn = null;
                }
            }
            if (itemToReturn) {
                 const remaining = this.player.inventory.addItem(itemToReturn);
                 if (remaining) {
                     this.actionCallback('dropItem', { 
                        item: remaining,
                        position: { x: this.player.position.x + this.player.width / 2, y: this.player.position.y + this.player.height * 0.4 },
                        velocity: { x: 0, y: 0 }
                    });
                 }
            }
        }
        
        // Return crafting grid items to inventory
        for(const item of this.craftingGrid.getItems()) {
            if (item) this.player.inventory.addItem(item);
        }
        
        this.draggingItem = null;
        this.currentView = 'none';
        this.uiContext = null;
        this.slotRects = [];
        VirtualKeyboard.instance.hide();
    }

    public dispose() {
        this.close();
    }

    public update() {
        if (!this.isOpen()) return;

        this.handlePointerInput();
        this.updateCrafting();
        
        const pos = this.mouseHandler.position;
        this.hoverItem = null;

        const slot = this.getSlotAt(pos.x, pos.y);
        if (slot && slot.inventory.getItem(slot.slotIndex) && !this.draggingItem) {
            const item = slot.inventory.getItem(slot.slotIndex)!;
            this.hoverItem = { item, info: ItemRegistry.getItemInfo(item.id) };
        } else if (this.currentView === 'player_creative' && this.isPosInRect(pos, this.creativeGridRect)) {
             const col = Math.floor((pos.x - this.creativeGridRect.x) / 54);
             const row = Math.floor((pos.y - this.creativeGridRect.y + this.creativeScrollY) / 54);
             const index = row * 9 + col;
             if (index >= 0 && index < this.creativeVisibleItems.length) {
                 const item = { id: this.creativeVisibleItems[index], count: 1 };
                 this.hoverItem = { item, info: ItemRegistry.getItemInfo(item.id) };
             }
        }
    }
    
    private updateCrafting() {
        const grid: (Item | null)[][] = [];
        const gridSize = (this.currentView === 'crafting_table' || this.currentView === 'player_creative') ? 3 : 2;
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
        const gridHeight = this.creativeGridRect.h || 500;
        const totalRows = Math.ceil(this.creativeVisibleItems.length / 9);
        this.creativeMaxScrollY = Math.max(0, totalRows * 54 - gridHeight);
        this.creativeScrollY = Math.min(this.creativeScrollY, this.creativeMaxScrollY);
    }
    
    private getSlotAt(mouseX: number, mouseY: number): Slot | null {
        for (const slot of this.slotRects) {
            if (this.isPosInRect({x: mouseX, y: mouseY}, slot.rect)) {
                return slot;
            }
        }
        return null;
    }

    private handlePointerInput() {
        const pos = this.mouseHandler.position;
        const scroll = this.mouseHandler.consumeScroll();
        const isShiftDown = this.inputManager.isKeyDown('shift');

        if (this.currentView === 'player_creative' && this.isPosInRect(pos, this.creativeGridRect) && scroll !== 0) {
            this.creativeScrollY += scroll * 20; // Scroll speed
            this.creativeScrollY = Math.max(0, Math.min(this.creativeMaxScrollY, this.creativeScrollY));
        }
        
        const handleSingleClick = (isRight: boolean) => {
            const clickedSlot = this.getSlotAt(pos.x, pos.y);
            if (clickedSlot) {
                if(isShiftDown) this.handleShiftClick(clickedSlot);
                else this.handleSlotClick(clickedSlot, isRight, false);
                return;
            }
            if (this.handleCreativeGridClick(pos, isRight)) return;
            if (this.handleTabClick(pos)) return;
            if (this.handleSearchClick(pos)) return;
             
            // Clicked outside any UI element with an item, drop it
            if (this.draggingItem && !isRight) {
                 this.actionCallback('dropItem', { 
                    item: this.draggingItem.item,
                    position: { x: this.player.position.x + this.player.width / 2, y: this.player.position.y + this.player.height * 0.4 },
                    velocity: { x: this.player.facingDirection * 6, y: -6 }
                });
                this.draggingItem = null;
            }
        };

        if (this.mouseHandler.isRightDoubleClicked) {
            const clickedSlot = this.getSlotAt(pos.x, pos.y);
            if (clickedSlot) this.handleDoubleClick(clickedSlot);
        } else if (this.mouseHandler.isLeftClicked) {
            handleSingleClick(false);
        } else if (this.mouseHandler.isRightClicked) {
            handleSingleClick(true);
        }
    }
    
    private handleCreativeGridClick(pos: Vector2, isRight: boolean): boolean {
        if (this.currentView !== 'player_creative' || !this.isPosInRect(pos, this.creativeGridRect)) return false;
        
        const col = Math.floor((pos.x - this.creativeGridRect.x) / 54);
        const row = Math.floor((pos.y - this.creativeGridRect.y + this.creativeScrollY) / 54);
        const index = row * 9 + col;
        
        if (index >= 0 && index < this.creativeVisibleItems.length) {
            const itemId = this.creativeVisibleItems[index];
            const itemInfo = ItemRegistry.getItemInfo(itemId);
            if (itemInfo) {
                const stackSize = isRight ? 1 : (this.inputManager.isKeyDown('shift') ? itemInfo.maxStackSize : 1);
                const newItem = { id: itemId, count: stackSize };
                const remaining = this.player.inventory.addItem(newItem);
                if (remaining) {
                    this.draggingItem = {
                        item: remaining,
                        fromSlot: { inventory: new Inventory(1), slotIndex: -1, type: 'creative_display', rect: {x:0,y:0,w:0,h:0} },
                        originalPosition: pos
                    };
                }
            }
        }
        return true;
    }

    private handleTabClick(pos: Vector2): boolean {
        if (this.currentView !== 'player_creative') return false;
        for (const [category, rect] of this.creativeTabsRects.entries()) {
            if (this.isPosInRect(pos, rect)) {
                this.creativeActiveTab = category;
                this.creativeScrollY = 0;
                this.updateCreativeItems();
                return true;
            }
        }
        return false;
    }
    
    private handleSearchClick(pos: Vector2): boolean {
        if (this.currentView !== 'player_creative' || !this.isPosInRect(pos, this.creativeSearchRect)) return false;
        VirtualKeyboard.instance.show({
            text: this.creativeSearchTerm,
            onInput: (text) => {
                this.creativeSearchTerm = text;
                this.updateCreativeItems();
            },
            onEnter: () => VirtualKeyboard.instance.hide(),
            onBlur: () => {}
        });
        return true;
    }
    
    private handleDoubleClick(slot: Slot) {
        if (this.draggingItem) return;
        const itemToGather = slot.inventory.getItem(slot.slotIndex);
        if (!itemToGather) return;

        this.draggingItem = { item: itemToGather, fromSlot: slot, originalPosition: this.mouseHandler.position };
        slot.inventory.setItem(slot.slotIndex, null);

        [this.player.inventory, this.craftingGrid].forEach(inv => {
            for (let i = 0; i < inv.getSize(); i++) {
                const currentSlot = inv.getItem(i);
                if (currentSlot && currentSlot.id === this.draggingItem!.item.id) {
                    this.draggingItem!.item.count += currentSlot.count;
                    inv.setItem(i, null);
                }
            }
        });
    }

    private handleShiftClick(slot: Slot) {
        const item = slot.inventory.getItem(slot.slotIndex);
        if (!item) return;

        let moved = false;
        if (slot.type === 'armor' || slot.type === 'crafting_input' || slot.type === 'crafting_output' || slot.type.startsWith('furnace')) {
            // Move to player inventory
            const remaining = this.player.inventory.addItem(item);
            slot.inventory.setItem(slot.slotIndex, remaining);
            moved = true;
        } else if (slot.type === 'player' || slot.type === 'hotbar') {
            // Try to move to armor slots first
            const itemInfo = ItemRegistry.getItemInfo(item.id);
            if (itemInfo?.armorInfo) {
                const armorSlotIndex = ['helmet','chestplate','leggings','boots'].indexOf(itemInfo.armorInfo.type);
                if (armorSlotIndex !== -1 && !this.player.armorInventory.getItem(armorSlotIndex)) {
                    this.player.armorInventory.setItem(armorSlotIndex, item);
                    slot.inventory.setItem(slot.slotIndex, null);
                    moved = true;
                }
            }
            // Then try to move to an open container
            if (!moved) {
                // TODO: Add logic for open containers like Furnace/Chest
            }
        }
        
        if (moved && slot.type === 'crafting_output' && this.craftResult) {
            const gridSize = (this.currentView === 'crafting_table' || this.currentView === 'player_creative') ? 3 : 2;
            for(let i=0; i<gridSize*gridSize; i++) this.craftingGrid.removeItem(i, 1);
        }
    }


    private handleSlotClick(slot: Slot, isRightClick: boolean, isDoubleClick: boolean) {
        if (slot.type === 'creative_display') return;

        const itemInSlot = slot.inventory.getItem(slot.slotIndex);
        
        if (slot.type === 'crafting_output' && this.craftResult && !this.draggingItem) {
            const canTakeCount = itemInSlot ? ItemRegistry.getItemInfo(itemInSlot.id)!.maxStackSize - itemInSlot.count : ItemRegistry.getItemInfo(this.craftResult.id)!.maxStackSize;
            const takeCount = Math.min(this.craftResult.count, canTakeCount);
            
            this.draggingItem = { item: {...this.craftResult, count: takeCount}, fromSlot: null, originalPosition: this.mouseHandler.position };
            
            const gridSize = (this.currentView === 'crafting_table' || this.currentView === 'player_creative') ? 3 : 2;
            for(let i=0; i<gridSize*gridSize; i++) this.craftingGrid.removeItem(i, 1);
            return;
        }

        const heldItemInfo = this.draggingItem ? ItemRegistry.getItemInfo(this.draggingItem.item.id) : null;
        if (slot.type === 'armor' && heldItemInfo && (!heldItemInfo.armorInfo || heldItemInfo.armorInfo.type !== slot.armorType)) {
            return;
        }

        if (this.draggingItem) {
            if (itemInSlot && itemInSlot.id === this.draggingItem.item.id) { // Merge stacks
                const canAdd = ItemRegistry.getItemInfo(itemInSlot.id)!.maxStackSize - itemInSlot.count;
                const toAdd = isRightClick ? 1 : Math.min(canAdd, this.draggingItem.item.count);
                if(toAdd > 0) {
                    itemInSlot.count += toAdd;
                    this.draggingItem.item.count -= toAdd;
                    if (this.draggingItem.item.count <= 0) this.draggingItem = null;
                }
            } else if (!itemInSlot) { // Place item in empty slot
                if (isRightClick) {
                    slot.inventory.setItem(slot.slotIndex, { ...this.draggingItem.item, count: 1 });
                    this.draggingItem.item.count--;
                    if (this.draggingItem.item.count <= 0) this.draggingItem = null;
                } else {
                    slot.inventory.setItem(slot.slotIndex, this.draggingItem.item);
                    this.draggingItem = null;
                }
            } else { // Swap items
                const oldDraggingItem = this.draggingItem;
                this.draggingItem = { item: itemInSlot, fromSlot: slot, originalPosition: this.mouseHandler.position };
                slot.inventory.setItem(slot.slotIndex, oldDraggingItem.item);
            }
        } else if (itemInSlot) { // Pick up item from slot
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

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.isOpen()) return;

        // Main background overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        switch(this.currentView) {
            case 'player_survival':
            case 'crafting_table':
                this.renderSurvivalInventory(ctx);
                break;
            case 'player_creative':
                this.renderCreativeInventory(ctx);
                break;
            case 'furnace':
                this.renderFurnace(ctx);
                break;
        }
        
        if (this.draggingItem) {
            const pos = this.mouseHandler.position;
            this.renderItem(ctx, this.draggingItem.item, pos.x - 24, pos.y - 24, 48);
        } else if (this.hoverItem) {
            const pos = this.mouseHandler.position;
            this.renderTooltip(ctx, this.hoverItem.info.name, pos.x, pos.y);
        }
    }
    
    // ... Layout and Rendering methods ...
    private renderSurvivalInventory(ctx: CanvasRenderingContext2D) {
        const w = 352, h = 332;
        const x = (ctx.canvas.width - w) / 2;
        const y = (ctx.canvas.height - h) / 2;
        this.renderPanel(ctx, x, y, w, h, this.currentView === 'crafting_table' ? 'Crafting' : 'Inventory');
        
        // Player & Armor
        this.renderPlayerPreview(ctx, x + 51, y + 150, 100);
        this.slotRects.filter(s => s.type === 'armor' || s.type === 'offhand').forEach(slot => {
             this.renderSlot(ctx, slot.rect.x, slot.rect.y, slot.inventory.getItem(slot.slotIndex), false, slot);
        });

        // Crafting
        const is2x2 = this.currentView === 'player_survival';
        this.slotRects.filter(s => s.type === 'crafting_input').forEach(slot => {
            if(is2x2) {
                const idx = slot.slotIndex;
                if (idx > 4 || idx === 2) return;
            }
            this.renderSlot(ctx, slot.rect.x, slot.rect.y, slot.inventory.getItem(slot.slotIndex));
        });
        const outSlot = this.slotRects.find(s => s.type === 'crafting_output')!;
        this.renderCraftingArrow(ctx, outSlot.rect.x - 30, outSlot.rect.y + 18);
        this.renderSlot(ctx, outSlot.rect.x, outSlot.rect.y, this.craftResult);
        
        // Main Inventory
        this.renderInventoryGrid(ctx, this.player.inventory, x + 8, y + 168, 9, 3, 9);
        this.renderInventoryGrid(ctx, this.player.inventory, x + 8, y + 226, 9, 1, 0);
    }
    
    private renderCreativeInventory(ctx: CanvasRenderingContext2D) {
        const w = 384, h = 272;
        const x = (ctx.canvas.width - w) / 2;
        const y = (ctx.canvas.height - h) / 2;
        
        // Main creative panel
        this.renderPanel(ctx, x, y, w, h, 'Creative');
        this.renderCreativeTabs(ctx, x, y);
        this.renderCreativeGrid(ctx, x + 8, y + 74, w - 16, h - 82);
        this.renderSearchBar(ctx, x + 8, y + 36, w - 16, 30);

        // Player inventory panel
        const invY = y + h + 10;
        this.renderPanel(ctx, x, invY, w, 82, 'Inventory');
        this.renderInventoryGrid(ctx, this.player.inventory, x + 8, invY + 24, 9, 1, 0); // Hotbar only
    }

    private renderFurnace(ctx: CanvasRenderingContext2D) {
        const w = 352, h = 332;
        const x = (ctx.canvas.width - w) / 2;
        const y = (ctx.canvas.height - h) / 2;
        this.renderPanel(ctx, x, y, w, h, 'Furnace');

        const blockEntity = this.world.getBlockEntity(this.uiContext!.worldX!, this.uiContext!.worldY!);
        if (!blockEntity || !blockEntity.inventory) { this.close(); return; }

        this.slotRects.filter(s => s.type.startsWith('furnace')).forEach(slot => {
             this.renderSlot(ctx, slot.rect.x, slot.rect.y, slot.inventory.getItem(slot.slotIndex), slot.type === 'furnace_output', slot);
        });
        
        const fireProgress = blockEntity.maxFuelTime! > 0 ? (blockEntity.fuelTime! / blockEntity.maxFuelTime!) : 0;
        this.renderFurnaceFire(ctx, x + 112, y + 72, fireProgress);
        
        const recipe = SmeltingSystem.getSmeltingResult(blockEntity.inventory.getItem(0)?.id!);
        const smeltProgress = recipe ? (blockEntity.smeltTime! / recipe.cookTime) : 0;
        this.renderSmeltingArrow(ctx, x + 154, y + 70, smeltProgress);
        
        // Player Inventory
        this.renderInventoryGrid(ctx, this.player.inventory, x + 8, y + 168, 9, 3, 9);
        this.renderInventoryGrid(ctx, this.player.inventory, x + 8, y + 226, 9, 1, 0);
    }
    
    private renderPanel(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, title: string) {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#5a5a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = '#c6c6c6';
        ctx.font = "16px Minecraftia";
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 8, y + 18);
    }
    
    private buildSlotRects() {
        this.slotRects = [];
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const panelW = 352, panelH = 332;
        const panelX = (canvasW - panelW) / 2;
        const panelY = (canvasH - panelH) / 2;

        const addGrid = (inv: Inventory, type: SlotType, startX: number, startY: number, cols: number, rows: number, startIndex: number) => {
            for (let i = 0; i < rows * cols; i++) {
                const row = Math.floor(i / cols); const col = i % cols;
                this.slotRects.push({ rect: { x: startX + col*36, y: startY + row*36, w: 36, h: 36}, inventory: inv, slotIndex: startIndex + i, type});
            }
        }

        switch(this.currentView) {
            case 'player_survival':
            case 'crafting_table': {
                const is3x3 = this.currentView === 'crafting_table';
                addGrid(this.player.inventory, 'player', panelX + 8, panelY + 168, 9, 3, 9);
                addGrid(this.player.inventory, 'hotbar', panelX + 8, panelY + 226, 9, 1, 0);

                const craftGridSize = is3x3 ? 3 : 2;
                const craftStartX = panelX + (is3x3 ? 190 : 172);
                const craftStartY = panelY + (is3x3 ? 50 : 70);
                addGrid(this.craftingGrid, 'crafting_input', craftStartX, craftStartY, craftGridSize, craftGridSize, 0);

                const outX = craftStartX + craftGridSize*36 + 26;
                const outY = craftStartY + (craftGridSize-1)*36 / 2;
                this.slotRects.push({ rect: { x: outX, y: outY, w: 36, h: 36 }, inventory: new Inventory(1), slotIndex: 0, type: 'crafting_output' });

                const armorX = panelX + 8;
                this.slotRects.push({ rect: { x: armorX, y: panelY + 36, w: 36, h: 36}, inventory: this.player.armorInventory, slotIndex: 0, type: 'armor', armorType: 'helmet'});
                this.slotRects.push({ rect: { x: armorX, y: panelY + 72, w: 36, h: 36}, inventory: this.player.armorInventory, slotIndex: 1, type: 'armor', armorType: 'chestplate'});
                this.slotRects.push({ rect: { x: armorX, y: panelY + 108, w: 36, h: 36}, inventory: this.player.armorInventory, slotIndex: 2, type: 'armor', armorType: 'leggings'});
                this.slotRects.push({ rect: { x: armorX, y: panelY + 144, w: 36, h: 36}, inventory: this.player.armorInventory, slotIndex: 3, type: 'armor', armorType: 'boots'});
                this.slotRects.push({ rect: { x: armorX, y: panelY + 144-54, w: 36, h: 36}, inventory: this.player.offhandInventory, slotIndex: 0, type: 'offhand' });
                break;
            }
            case 'player_creative': {
                const w = 384, h = 272;
                const x = (canvasW - w) / 2;
                const y = (canvasH - h) / 2;
                const invY = y + h + 10;
                addGrid(this.player.inventory, 'hotbar', x + 8, invY + 24, 9, 1, 0);
                break;
            }
            case 'furnace': {
                addGrid(this.player.inventory, 'player', panelX + 8, panelY + 168, 9, 3, 9);
                addGrid(this.player.inventory, 'hotbar', panelX + 8, panelY + 226, 9, 1, 0);
                const blockEntity = this.world.getBlockEntity(this.uiContext!.worldX!, this.uiContext!.worldY!);
                if (!blockEntity) break;
                this.slotRects.push({ rect: { x: panelX + 112, y: panelY + 34, w: 36, h: 36}, inventory: blockEntity.inventory!, slotIndex: 0, type: 'furnace_input'});
                this.slotRects.push({ rect: { x: panelX + 112, y: panelY + 106, w: 36, h: 36}, inventory: blockEntity.inventory!, slotIndex: 1, type: 'furnace_fuel'});
                this.slotRects.push({ rect: { x: panelX + 226, y: panelY + 68, w: 40, h: 40}, inventory: blockEntity.inventory!, slotIndex: 2, type: 'furnace_output'});
                break;
            }
        }
    }
    
    private renderSlot(ctx: CanvasRenderingContext2D, x: number, y: number, item: Item | null, large: boolean = false, slotInfo?: Slot | null) {
        const size = slotInfo?.rect.w || 36;
        ctx.fillStyle = '#373737'; // Dark slot background
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#1e1e1e'; // Even darker inset border
        ctx.strokeRect(x, y, size, size);

        if (!item && slotInfo?.type === 'armor') {
            this.drawArmorPlaceholder(ctx, x, y, size, slotInfo.armorType!);
        }
        if (item) {
            this.renderItem(ctx, item, x + (size-32)/2, y + (size-32)/2, 32);
        }
    }
    
    private renderItem(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, size: number) {
        const itemInfo = ItemRegistry.getItemInfo(item.id);
        if(!itemInfo) return;
        
        const blockId = itemInfo.blockId;
        if(blockId) {
            const blockType = getBlockType(blockId);
            if(blockType?.texture) blockType.texture(ctx, x, y, size);
        } else {
            ItemRenderer.drawItem(ctx, item.id, x, y, size);
        }

        if (item.count > 1) {
            ctx.font = "16px Minecraftia";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(item.count.toString(), x + size, y + size);
            ctx.fillStyle = '#ffffff'; ctx.fillText(item.count.toString(), x + size - 1, y + size - 1);
        }
        this.renderDurabilityBar(ctx, item, x, y, size);
    }
    
    private renderPlayerPreview(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size/128, size/128);
        const pose = this.animationSystem.getPose(this.player);
        this.playerRenderer.render(ctx, this.player, pose);
        ctx.restore();
    }
    
    private renderTooltip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
        ctx.font = "16px Minecraftia";
        const metrics = ctx.measureText(text);
        const width = metrics.width + 10;
        const height = 24;
        const tooltipX = x + 15;
        const tooltipY = y - 30;
        ctx.fillStyle = 'rgba(16, 1, 28, 0.9)'; ctx.fillRect(tooltipX, tooltipY, width, height);
        ctx.strokeStyle = '#5A2E8B'; ctx.lineWidth = 2; ctx.strokeRect(tooltipX, tooltipY, width, height);
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, tooltipX + 5, tooltipY + height / 2);
    }

    private renderCraftingArrow(ctx: CanvasRenderingContext2D, x:number, y:number) {
        ctx.fillStyle = '#c6c6c6';
        ctx.font = "32px Minecraftia";
        ctx.fillText("->", x, y);
    }

    private renderSmeltingArrow(ctx: CanvasRenderingContext2D, x:number, y:number, progress: number) {
        ctx.fillStyle = '#8b8b8b';
        ctx.fillRect(x,y, 48, 34);
        if(progress > 0) {
            ctx.fillStyle = '#FFC107';
            ctx.fillRect(x, y, 48 * progress, 34);
        }
    }
    
    private renderFurnaceFire(ctx: CanvasRenderingContext2D, x:number, y:number, progress: number) {
        ctx.fillStyle = '#8b8b8b';
        ctx.fillRect(x, y, 28, 28);
        if(progress > 0) {
            const fireHeight = 28 * progress;
            ctx.fillStyle = '#FFC107';
            ctx.fillRect(x, y + 28 - fireHeight, 28, fireHeight);
        }
    }

    private isPosInRect = (pos: Vector2, rect: {x:number, y:number, w:number, h:number}): boolean => (pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h);
    
    private drawArmorPlaceholder(ctx: CanvasRenderingContext2D, x:number, y:number, size:number, type: string) {} // Simplified
    private renderCreativeTabs(ctx: CanvasRenderingContext2D, x:number, y:number){}
    private renderSearchBar(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number){}
    private renderCreativeGrid(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number){}
    private renderInventoryGrid(ctx: CanvasRenderingContext2D, inv: Inventory, x:number, y:number, c:number, r:number, s:number){}
    private renderDurabilityBar(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, w: number){}
}