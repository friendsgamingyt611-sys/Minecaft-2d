import { Scene, SceneManager } from './SceneManager';
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
import { Vector2, WorldData } from '../types';
import { TouchControlsUI } from '../ui/TouchControlsUI';
import { SettingsScene } from './SettingsScene';
import { SettingsManager } from '../core/SettingsManager';
import { WorldStorage } from '../core/WorldStorage';
import { SoundManager } from '../core/SoundManager';

export class GameScene implements Scene {
  private sceneManager: SceneManager;
  private worldData: WorldData;
  
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
  
  private deathAnimationTimer: number = 0;
  private readonly DEATH_ANIMATION_DURATION = 3.0; // seconds

  private pauseMenuButtons: { label: string; rect: { x: number, y: number, w: number, h: number }; action: () => void }[] = [];
  private deathMenuButtons: { label: string; rect: { x: number, y: number, w: number, h: number }; action: () => void }[] = [];
  private hoveredButton: any | null = null;
  
  private controlManager: ControlManager;
  private touchControlsUI: TouchControlsUI;

  // Auto-save
  private timeSinceLastSave: number = 0;
  private readonly AUTO_SAVE_INTERVAL = 30; // seconds

  constructor(sceneManager: SceneManager, worldData: WorldData) {
    this.sceneManager = sceneManager;
    this.worldData = worldData;

    this.controlManager = new ControlManager(sceneManager.inputManager, sceneManager.mouseHandler, sceneManager.touchHandler);
    this.touchControlsUI = new TouchControlsUI(sceneManager.touchHandler);

    this.world = new ChunkSystem(this.worldData.metadata.seed);
    this.world.fromData(this.worldData.chunks);

    this.physicsSystem = new PhysicsSystem(this.world);
    
    this.player = new Player(this.worldData.metadata.spawnPoint, this.world, this.sceneManager.mouseHandler, this.sceneManager.touchHandler, this.sceneManager.inputManager, this.physicsSystem, this.onPlayerAction);
    this.player.fromData(this.worldData.player);
    this.player.gamemode = this.worldData.metadata.gameMode;

    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    this.camera = new Camera(canvas.width, canvas.height, this.player);
    this.renderer = new RenderEngine(this.camera);
    this.hud = new HUD(this.player, this.touchControlsUI);
    this.animationSystem = new AnimationSystem();
    this.craftingSystem = new CraftingSystem();
    this.inventoryUI = new InventoryUI(this.player, this.craftingSystem, this.sceneManager.mouseHandler, this.sceneManager.touchHandler);

    this.setupMenus(canvas);
  }

  private setupMenus(canvas: HTMLCanvasElement) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    this.pauseMenuButtons = [
        { label: 'Resume', rect: { x: cx - 200, y: cy - 50, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.isPaused = false } },
        { label: 'Settings', rect: { x: cx - 200, y: cy + 20, w: 400, h: 50 }, action: () => {SoundManager.instance.playSound('ui.click'); this.sceneManager.pushScene(new SettingsScene(this.sceneManager))} },
        { label: 'Save & Quit', rect: { x: cx - 200, y: cy + 90, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.saveAndQuit() }},
    ];
    this.deathMenuButtons = [
        { label: 'Respawn', rect: { x: cx - 200, y: cy, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.player.respawn(); this.deathAnimationTimer = 0; }},
        { label: 'Quit to Title', rect: { x: cx - 200, y: cy + 70, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.sceneManager.switchScene(new TitleScene(this.sceneManager))} },
    ];
  }

  enter(): void {
      window.addEventListener('beforeunload', this.saveOnExit);
  }
  exit(): void {
      window.removeEventListener('beforeunload', this.saveOnExit);
  }

  private saveOnExit = () => {
    this.saveGame();
  }
  
  private saveAndQuit() {
      this.saveGame();
      this.sceneManager.switchScene(new TitleScene(this.sceneManager));
  }
  
  private saveGame() {
    this.worldData.player = this.player.toData();
    this.worldData.chunks = this.world.toData();
    this.worldData.metadata.lastPlayed = Date.now();
    WorldStorage.saveWorld(this.worldData);
    console.log(`World "${this.worldData.metadata.name}" saved.`);
  }

  private onPlayerAction = (action: string, data: any) => {
    switch (action) {
      case 'breakBlock': {
        const itemEntity = new ItemEntity(
          { x: (data.x + 0.5) * BLOCK_SIZE, y: (data.y + 0.5) * BLOCK_SIZE },
          data.item
        );
        itemEntity.velocity.x = (Math.random() - 0.5) * 5;
        itemEntity.velocity.y = -Math.random() * 5 - 3; // Upward
        this.itemEntities.push(itemEntity);

        const soundType = data.blockType.soundType || 'stone';
        SoundManager.instance.playSound(`block.break.${soundType}`);
        
        if (data.blockType.xpDrop) {
            const xp = data.blockType.xpDrop.min + Math.random() * (data.blockType.xpDrop.max - data.blockType.xpDrop.min);
            this.player.xpSystem.spawnXP({ x: (data.x + 0.5) * BLOCK_SIZE, y: (data.y + 0.5) * BLOCK_SIZE }, xp);
        }
        break;
      }
      case 'placeBlock':
        const soundType = data.blockType.soundType || 'stone';
        SoundManager.instance.playSound(`block.place`);
        break;
      case 'openInventory':
        this.inventoryUI.openPlayerInventory();
        break;
      case 'openCraftingTable':
        this.inventoryUI.openCraftingTable();
        break;
      case 'openChest':
        this.inventoryUI.openChest(data.chestInventory);
        break;
      case 'dropItem': {
        const itemEntity = new ItemEntity(data.position, data.item);
        itemEntity.velocity.x = data.velocity.x;
        itemEntity.velocity.y = data.velocity.y;
        this.itemEntities.push(itemEntity);
        break;
      }
    }
  };
  
  update(deltaTime: number): void {
    if (this.player.isDead) {
      this.deathAnimationTimer += deltaTime;
      this.animationSystem.update(deltaTime, this.player);
      if (this.deathAnimationTimer >= this.DEATH_ANIMATION_DURATION) {
         this.updateMenu(this.deathMenuButtons);
      }
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
      this.updateMenu(this.pauseMenuButtons);
      return;
    }

    if (this.inventoryUI.isOpen()) {
        this.inventoryUI.update();
        return;
    }
    
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
    
    this.timeSinceLastSave += deltaTime;
    if (this.timeSinceLastSave > this.AUTO_SAVE_INTERVAL) {
        this.saveGame();
        this.timeSinceLastSave = 0;
    }
  }

  private updateMenu(buttons: any[]) {
      const mousePos = this.sceneManager.mouseHandler.position;
      const justClicked = this.sceneManager.mouseHandler.isLeftClicked;
      const endedTouches = this.sceneManager.touchHandler.justEndedTouches;
      
      this.hoveredButton = null;
      buttons.forEach((button) => {
          if (mousePos.x >= button.rect.x && mousePos.x <= button.rect.x + button.rect.w &&
              mousePos.y >= button.rect.y && mousePos.y <= button.rect.y + button.rect.h) {
              this.hoveredButton = button;
          }
      });
      
      const checkClick = (pos: Vector2) => {
          for(const button of buttons) {
              if (pos.x >= button.rect.x && pos.x <= button.rect.x + button.rect.w &&
                  pos.y >= button.rect.y && pos.y <= button.rect.y + button.rect.h) {
                  button.action();
                  return true;
              }
          }
          return false;
      }
      
      if(justClicked) checkClick(mousePos);
      for(const touch of endedTouches) if(checkClick(touch)) break;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const isActuallyDead = this.player.isDead && this.deathAnimationTimer >= this.DEATH_ANIMATION_DURATION;
    
    if (this.player.isDead) {
        // Grayscale effect
        ctx.save();
        const grayscale = Math.min(1, this.deathAnimationTimer / (this.DEATH_ANIMATION_DURATION - 1.0));
        ctx.filter = `grayscale(${grayscale})`;
    }

    this.renderer.render(ctx, this.world, this.player, this.sceneManager.mouseHandler, this.animationSystem, this.itemEntities);
    
    if (!isActuallyDead) {
        this.hud.render(ctx);
    }

    if (this.player.justTookDamage) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this.player.justTookDamage = false; // Consume damage flash
    }

    if (this.player.isDead) {
        ctx.restore(); // Restore from grayscale
        this.renderDeathScreen(ctx);
    }
    
    if (this.inventoryUI.isOpen()) {
      this.inventoryUI.render(ctx);
    }
    
    if (this.isPaused) {
      this.renderPauseMenu(ctx);
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D, title: string, buttons: any[]) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = "60px Minecraftia";
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(title, ctx.canvas.width / 2, ctx.canvas.height / 2 - 120);

      buttons.forEach((button) => {
          ctx.fillStyle = this.hoveredButton === button ? '#b0b0b0' : '#7f7f7f';
          ctx.fillRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);
          ctx.font = "30px Minecraftia";
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(button.label, button.rect.x + button.rect.w / 2, button.rect.y + button.rect.h / 2);
      });
  }

  private renderPauseMenu(ctx: CanvasRenderingContext2D) {
      this.renderMenu(ctx, "Game Paused", this.pauseMenuButtons);
  }

  private renderDeathScreen(ctx: CanvasRenderingContext2D) {
      if (this.deathAnimationTimer < this.DEATH_ANIMATION_DURATION - 1.0) return;

      const alpha = Math.min(1, (this.deathAnimationTimer - (this.DEATH_ANIMATION_DURATION - 1.0)) / 1.0);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
      
      ctx.font = "80px Minecraftia";
      ctx.fillStyle = '#ff5555';
      ctx.textAlign = 'center';
      ctx.fillText("You Died!", ctx.canvas.width / 2, ctx.canvas.height / 2 - 100);

      ctx.font = "24px Minecraftia";
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.player.causeOfDeath, ctx.canvas.width / 2, ctx.canvas.height/2 - 50);

      if (this.deathAnimationTimer >= this.DEATH_ANIMATION_DURATION) {
         this.deathMenuButtons.forEach((button) => {
            ctx.fillStyle = this.hoveredButton === button ? '#b0b0b0' : '#7f7f7f';
            ctx.fillRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);
            ctx.font = "30px Minecraftia";
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(button.label, button.rect.x + button.rect.w / 2, button.rect.y + button.rect.h / 2);
        });
      }
      ctx.globalAlpha = 1.0;
  }
}