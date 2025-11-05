

import { Scene, SceneManager } from './SceneManager';
import { GameState } from '../core/GameState';
import { ChunkSystem } from '../world/ChunkSystem';
import { Player } from '../entities/Player';
import { Camera } from '../entities/Camera';
import { RenderEngine } from '../rendering/RenderEngine';
import { HUD } from '../ui/HUD';
import { AnimationSystem } from '../rendering/AnimationSystem';
import { InventoryUI } from '../ui/InventoryUI';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { ItemEntity } from '../entities/ItemEntity';
import { PhysicsSystem } from '../entities/PhysicsSystem';
import { BLOCK_SIZE, HOTBAR_SLOTS } from '../core/Constants';
import { TitleScene } from './TitleScene';
import { ControlManager } from '../core/Controls';
import { InputState } from '../types';
import { TouchControlsUI } from '../ui/TouchControlsUI';
import { SettingsScene } from './SettingsScene';
import { SettingsManager } from '../core/SettingsManager';

export class GameScene implements Scene {
  private sceneManager: SceneManager;
  private gameState: GameState;
  
  public world: ChunkSystem;
  public player: Player;
  private camera: Camera;
  private renderer: RenderEngine;
  private hud: HUD;
  private animationSystem: AnimationSystem;
  private inventoryUI: InventoryUI;
  private craftingSystem: CraftingSystem;
  private itemEntities: ItemEntity[] = [];
  private physicsSystem: PhysicsSystem;

  private isPaused: boolean = false;
  private isDead: boolean = false;

  private pauseMenuButtons: { label: string; rect: { x: number, y: number, w: number, h: number }; action: () => void }[] = [];
  private hoveredButtonIndex: number = -1;
  
  private controlManager: ControlManager;
  private touchControlsUI: TouchControlsUI;

  constructor(sceneManager: SceneManager, gameState: GameState) {
    this.sceneManager = sceneManager;
    this.gameState = gameState;

    this.controlManager = new ControlManager(sceneManager.inputManager, sceneManager.mouseHandler, sceneManager.touchHandler);
    this.touchControlsUI = new TouchControlsUI(sceneManager.touchHandler);

    this.world = new ChunkSystem(this.gameState.worldSeed);
    this.physicsSystem = new PhysicsSystem(this.world);
    const spawnPoint = this.world.getSpawnPoint();
    
    this.player = new Player(spawnPoint, this.world, this.sceneManager.mouseHandler, this.sceneManager.touchHandler, this.physicsSystem, this.onPlayerAction);

    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    this.camera = new Camera(canvas.width, canvas.height, this.player);

    this.renderer = new RenderEngine(this.camera);
    this.hud = new HUD(this.player, this.touchControlsUI);
    this.animationSystem = new AnimationSystem();
    this.craftingSystem = new CraftingSystem();
    this.inventoryUI = new InventoryUI(this.player, this.craftingSystem, this.sceneManager.mouseHandler, this.sceneManager.touchHandler);

    this.setupPauseMenu(canvas);
  }

  private setupPauseMenu(canvas: HTMLCanvasElement) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    this.pauseMenuButtons = [
        { label: 'Resume', rect: { x: cx - 150, y: cy - 25, w: 300, h: 50 }, action: () => { this.isPaused = false; }},
        { label: 'Settings', rect: { x: cx - 150, y: cy + 45, w: 300, h: 50 }, action: () => {
            this.sceneManager.pushScene(new SettingsScene(this.sceneManager));
        }},
        { label: 'Save & Quit to Title', rect: { x: cx - 150, y: cy + 115, w: 300, h: 50 }, action: () => {
            this.sceneManager.switchScene(new TitleScene(this.sceneManager));
        }},
    ];
  }

  enter(): void {
    console.log("Entering Game Scene");
  }

  exit(): void {
    console.log("Exiting Game Scene");
  }

  private handleInGameTouch() {
    const touches = this.sceneManager.touchHandler.justEndedTouches;
    if (touches.length === 0) return;

    for (const touch of touches) {
        // Hotbar selection
        for (let i = 0; i < HOTBAR_SLOTS; i++) {
            const rect = this.hud.getHotbarSlotRect(i);
            if (touch.x > rect.x && touch.x < rect.x + rect.w && touch.y > rect.y && touch.y < rect.y + rect.h) {
                this.player.activeHotbarSlot = i;
                return; // one action per touch
            }
        }
    }
  }
  
  update(deltaTime: number): void {
    if (this.player.isDead && !this.isDead) {
        this.isDead = true;
    }

    if (this.isDead) {
        if (this.sceneManager.mouseHandler.isLeftClicked || this.sceneManager.touchHandler.justEndedTouches.length > 0) {
            this.isDead = false;
            this.player.respawn();
        }
        return;
    }

    if (this.sceneManager.inputManager.isKeyPressed('escape')) {
        if (this.inventoryUI.isOpen()) {
            this.inventoryUI.close();
        } else {
            this.isPaused = !this.isPaused;
        }
    }
    
    this.inventoryUI.update();

    if (this.isPaused) {
        this.updatePauseMenu();
        return;
    }
    
    if (this.inventoryUI.isOpen()) {
        return;
    }

    this.handleInGameTouch();
    const inputState = this.controlManager.update();
    this.player.update(deltaTime, this.camera, inputState);
    this.world.update(this.player.position);
    this.camera.update(deltaTime);
    this.animationSystem.update(deltaTime, this.player);

    this.itemEntities.forEach((entity, index) => {
        entity.update(deltaTime, this.physicsSystem);
        if (entity.shouldBeRemoved()) {
            this.itemEntities.splice(index, 1);
        } else {
            this.player.tryPickupItem(entity);
        }
    });
  }

  private updatePauseMenu() {
    const mousePos = this.sceneManager.mouseHandler.position;
    this.hoveredButtonIndex = -1;
    this.pauseMenuButtons.forEach((button, index) => {
        if (mousePos.x >= button.rect.x && mousePos.x <= button.rect.x + button.rect.w &&
            mousePos.y >= button.rect.y && mousePos.y <= button.rect.y + button.rect.h) {
            this.hoveredButtonIndex = index;
        }
    });
    
    if(this.sceneManager.mouseHandler.isLeftClicked && this.hoveredButtonIndex !== -1) {
        this.pauseMenuButtons[this.hoveredButtonIndex].action();
    }

    for(const touch of this.sceneManager.touchHandler.justEndedTouches) {
        for(let i = 0; i < this.pauseMenuButtons.length; i++) {
            const button = this.pauseMenuButtons[i];
            if (touch.x >= button.rect.x && touch.x <= button.rect.x + button.rect.w &&
                touch.y >= button.rect.y && touch.y <= button.rect.y + button.rect.h) {
                button.action();
                return;
            }
        }
    }
  }
  
  private onPlayerAction = (action: string, data: any) => {
      if (action === 'openInventory') {
          this.inventoryUI.openPlayerInventory();
      }
      if (action === 'openCraftingTable') {
          this.inventoryUI.openCraftingTable();
      }
      if (action === 'openChest') {
          this.inventoryUI.openChest(data.chestInventory);
      }
      if (action === 'breakBlock') {
          const { x, y, item } = data;
          if (item) {
              const entity = new ItemEntity({ x: (x + 0.5) * BLOCK_SIZE, y: (y + 0.5) * BLOCK_SIZE }, item);
              this.itemEntities.push(entity);
          }
      }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderer.render(ctx, this.world, this.player, this.sceneManager.mouseHandler, this.animationSystem, this.itemEntities);
    
    if (!this.inventoryUI.isOpen()) {
        this.hud.render(ctx);
    }
    
    this.inventoryUI.render(ctx);

    if (this.isPaused && !this.inventoryUI.isOpen()) {
        this.renderPauseScreen(ctx);
    }

    if (this.isDead) {
        this.renderDeathScreen(ctx);
    }
  }

  private renderPauseScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.font = "60px Minecraftia";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText("Game Menu", ctx.canvas.width / 2, ctx.canvas.height / 2 - 100);

    this.pauseMenuButtons.forEach((button, index) => {
        const isHovered = index === this.hoveredButtonIndex;
        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 4;
        ctx.fillRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);
        ctx.strokeRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);

        ctx.font = "30px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.rect.x + button.rect.w / 2, button.rect.y + button.rect.h / 2);
    });
    ctx.textBaseline = 'alphabetic';
  }
  
  private renderDeathScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(100, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.font = "80px Minecraftia";
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.fillText("You Died", ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);
    
    ctx.font = "30px Minecraftia";
    ctx.fillStyle = '#ffffff';
    ctx.fillText("Click or Tap to Respawn", ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
  }
}