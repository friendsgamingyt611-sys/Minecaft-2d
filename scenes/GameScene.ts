

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
import { InputState, Vector2 } from '../types';
import { TouchControlsUI } from '../ui/TouchControlsUI';
import { SettingsScene } from './SettingsScene';
import { SettingsManager } from '../core/SettingsManager';
import { getBlockType } from '../world/BlockRegistry';

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
        { label: 'Resume', rect: { x: cx - 200, y: cy - 50, w: 400, h: 50 }, action: () => this.isPaused = false },
        { label: 'Settings', rect: { x: cx - 200, y: cy + 20, w: 400, h: 50 }, action: () => this.sceneManager.pushScene(new SettingsScene(this.sceneManager)) },
        { label: 'Quit to Title', rect: { x: cx - 200, y: cy + 90, w: 400, h: 50 }, action: () => this.sceneManager.switchScene(new TitleScene(this.sceneManager)) },
    ];
  }

  enter(): void {}
  exit(): void {}

  private onPlayerAction = (action: string, data: any) => {
    switch (action) {
      case 'breakBlock': {
        const itemEntity = new ItemEntity(
          { x: (data.x + 0.5) * BLOCK_SIZE, y: (data.y + 0.5) * BLOCK_SIZE },
          data.item
        );
        // Random pop-out direction
        itemEntity.velocity.x = (Math.random() - 0.5) * 5;
        itemEntity.velocity.y = -Math.random() * 5 - 3; // Upward
        this.itemEntities.push(itemEntity);

        if (data.blockType.xpDrop) {
            const xp = data.blockType.xpDrop.min + Math.random() * (data.blockType.xpDrop.max - data.blockType.xpDrop.min);
            this.player.xpSystem.spawnXP({ x: (data.x + 0.5) * BLOCK_SIZE, y: (data.y + 0.5) * BLOCK_SIZE }, xp);
        }
        break;
      }
      case 'openInventory':
        this.inventoryUI.openPlayerInventory();
        break;
      case 'openCraftingTable':
        this.inventoryUI.openCraftingTable();
        break;
      case 'openChest':
        this.inventoryUI.openChest(data.chestInventory);
        break;
    }
  };

  private handleKeyboardHotbar() {
      const scroll = this.sceneManager.mouseHandler.consumeScroll();
      if (scroll !== 0) {
          this.player.activeHotbarSlot = (this.player.activeHotbarSlot + scroll + HOTBAR_SLOTS) % HOTBAR_SLOTS;
      }

      for (let i = 1; i <= 9; i++) {
          if (this.sceneManager.inputManager.isKeyDown(i.toString())) {
              this.player.activeHotbarSlot = i - 1;
          }
      }
  }
  
  private handleInGamePointer(positions: Vector2[]) {
    if (positions.length === 0) return;

    for (const pos of positions) {
        for (let i = 0; i < HOTBAR_SLOTS; i++) {
            const rect = this.hud.getHotbarSlotRect(i);
            if (pos.x >= rect.x && pos.x <= rect.x + rect.w &&
                pos.y >= rect.y && pos.y <= rect.y + rect.h) {
                this.player.activeHotbarSlot = i;
                return; // Consume click
            }
        }
    }
  }

  update(deltaTime: number): void {
    if (this.isDead) {
      // Handle death screen logic
      return;
    }
    
    if (this.sceneManager.inputManager.isKeyPressed('escape')) {
        if(this.inventoryUI.isOpen()){
            this.inventoryUI.close();
        } else {
            this.isPaused = !this.isPaused;
        }
    }
    
    if (this.isPaused) {
      this.updatePauseMenu();
      return;
    }

    if (this.inventoryUI.isOpen()) {
        this.inventoryUI.update();
        return;
    }
    
    const controlScheme = SettingsManager.instance.getEffectiveControlScheme();
    if (controlScheme === 'keyboard') {
        this.handleKeyboardHotbar();
    }

    const endedTouches = this.sceneManager.touchHandler.justEndedTouches;
    const mouseClick = this.sceneManager.mouseHandler.isLeftClicked ? [this.sceneManager.mouseHandler.position] : [];
    this.handleInGamePointer([...endedTouches, ...mouseClick]);

    const inputState = this.controlManager.update();
    this.player.update(deltaTime, this.camera, inputState);
    this.world.update(this.player.position);
    this.camera.update(deltaTime);
    this.animationSystem.update(deltaTime, this.player);

    this.itemEntities.forEach(entity => {
      entity.update(deltaTime, this.physicsSystem);
      this.player.tryPickupItem(entity);
    });
    this.itemEntities = this.itemEntities.filter(e => !e.shouldBeRemoved());
  }

  private updatePauseMenu() {
      const mousePos = this.sceneManager.mouseHandler.position;
      const justClicked = this.sceneManager.mouseHandler.isLeftClicked;
      const endedTouches = this.sceneManager.touchHandler.justEndedTouches;
      
      this.hoveredButtonIndex = -1;
      this.pauseMenuButtons.forEach((button, index) => {
          if (mousePos.x >= button.rect.x && mousePos.x <= button.rect.x + button.rect.w &&
              mousePos.y >= button.rect.y && mousePos.y <= button.rect.y + button.rect.h) {
              this.hoveredButtonIndex = index;
          }
      });
      
      const checkClick = (pos: Vector2) => {
          for(const button of this.pauseMenuButtons) {
              if (pos.x >= button.rect.x && pos.x <= button.rect.x + button.rect.w &&
                  pos.y >= button.rect.y && pos.y <= button.rect.y + button.rect.h) {
                  button.action();
                  return true;
              }
          }
          return false;
      }
      
      if(justClicked) {
          checkClick(mousePos);
      }
      for(const touch of endedTouches) {
          if(checkClick(touch)) break;
      }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderer.render(ctx, this.world, this.player, this.sceneManager.mouseHandler, this.animationSystem, this.itemEntities);
    this.hud.render(ctx);

    if (this.inventoryUI.isOpen()) {
      this.inventoryUI.render(ctx);
    }
    
    if (this.isPaused) {
      this.renderPauseMenu(ctx);
    }

    if (this.player.isDead) {
      this.renderDeathScreen(ctx);
    }
  }

  private renderPauseMenu(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = "60px Minecraftia";
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText("Game Paused", ctx.canvas.width / 2, ctx.canvas.height / 2 - 120);

      this.pauseMenuButtons.forEach((button, index) => {
          ctx.fillStyle = this.hoveredButtonIndex === index ? '#b0b0b0' : '#7f7f7f';
          ctx.fillRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);
          ctx.font = "30px Minecraftia";
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(button.label, button.rect.x + button.rect.w / 2, button.rect.y + button.rect.h / 2);
      });
  }

  private renderDeathScreen(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'rgba(120, 0, 0, 0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = "80px Minecraftia";
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText("You Died!", ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);

      // Simple respawn button for now
      const btn = {x: ctx.canvas.width/2 - 100, y: ctx.canvas.height/2 + 20, w: 200, h: 50};
      ctx.fillStyle = '#7f7f7f';
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.font = "30px Minecraftia";
      ctx.fillStyle = '#ffffff';
      ctx.fillText("Respawn", ctx.canvas.width / 2, btn.y + btn.h/2);
      
      if(this.sceneManager.mouseHandler.isLeftClicked) {
          const pos = this.sceneManager.mouseHandler.position;
          if(pos.x > btn.x && pos.x < btn.x+btn.w && pos.y > btn.y && pos.y < btn.y+btn.h) {
              this.player.respawn();
          }
      }
  }
}