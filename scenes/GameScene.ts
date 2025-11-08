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
import { BLOCK_SIZE, HOTBAR_SLOTS, MAX_HEALTH, MAX_HUNGER, REACH_DISTANCE } from '../core/Constants';
import { TitleScene } from './TitleScene';
import { ControlManager } from '../core/Controls';
import { GameMode, InputState, Vector2, WorldData } from '../types';
import { TouchControlsUI } from '../ui/TouchControlsUI';
import { SettingsScene } from './SettingsScene';
import { SettingsManager } from '../core/SettingsManager';
import { WorldStorage } from '../core/WorldStorage';
import { SoundManager } from '../core/SoundManager';
import { ProfileManager } from '../core/ProfileManager';
import { ChatUI } from '../ui/ChatUI';
import { LivingEntity } from '../entities/LivingEntity';
import { MobSpawner } from '../world/MobSpawner';
import { Zombie } from '../entities/mobs/Zombie';

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
  private chatUI: ChatUI;
  private craftingSystem: CraftingSystem;
  private itemEntities: ItemEntity[] = [];
  private physicsSystem: PhysicsSystem;
  private mobs: LivingEntity[] = [];
  private mobSpawner: MobSpawner;

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
  
  // Gamemode switching
  private isSwitchingGamemode: boolean = false;
  private gamemodeSwitchTimer: number = 0;
  private readonly GAMEMODE_SWITCH_DURATION = 0.5; // seconds
  private nextGamemode: GameMode = 'survival';


  constructor(sceneManager: SceneManager, worldData: WorldData) {
    this.sceneManager = sceneManager;
    this.worldData = worldData;

    this.controlManager = new ControlManager(sceneManager.inputManager, sceneManager.mouseHandler, sceneManager.touchHandler);
    this.touchControlsUI = new TouchControlsUI(sceneManager.touchHandler);

    this.world = new ChunkSystem(this.worldData.metadata.seed);
    this.world.fromData(this.worldData.chunks);

    this.physicsSystem = new PhysicsSystem(this.world);
    this.mobSpawner = new MobSpawner(this.world);
    
    const activeProfile = ProfileManager.instance.getActiveProfile();
    if (!activeProfile) {
        // This should not happen if GameEngine logic is correct, but as a fallback:
        this.sceneManager.switchScene(new TitleScene(this.sceneManager));
        throw new Error("No active profile found when starting game scene.");
    }

    this.player = new Player(activeProfile, this.worldData.metadata.spawnPoint, this.world, this.sceneManager.mouseHandler, this.sceneManager.touchHandler, this.sceneManager.inputManager, this.physicsSystem, this.onPlayerAction);
    this.player.fromData(this.worldData.player);
    this.player.setGameMode(this.worldData.metadata.gameMode);

    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    this.camera = new Camera(canvas.width, canvas.height, this.player);
    this.renderer = new RenderEngine(this.camera);
    this.hud = new HUD(this.player, this.touchControlsUI, this.sceneManager.touchHandler, this.togglePause);
    this.animationSystem = new AnimationSystem();
    this.craftingSystem = new CraftingSystem();
    this.inventoryUI = new InventoryUI(this.player, this.craftingSystem, this.sceneManager.mouseHandler, this.sceneManager.touchHandler, this.world, this.onPlayerAction);
    this.chatUI = new ChatUI();

    this.setupMenus(canvas);
  }
  
  public togglePause = () => {
      this.isPaused = !this.isPaused;
  }
  
  private cycleGamemode() {
    if (this.isSwitchingGamemode) return;
    const modes: GameMode[] = ['survival', 'creative', 'spectator'];
    const currentIndex = modes.indexOf(this.player.gamemode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.nextGamemode = modes[nextIndex];
    this.isSwitchingGamemode = true;
    this.gamemodeSwitchTimer = 0;
  }

  private setupMenus(canvas: HTMLCanvasElement) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    this.pauseMenuButtons = [
        { label: 'Resume', rect: { x: cx - 200, y: cy - 85, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.isPaused = false } },
        { label: 'Settings', rect: { x: cx - 200, y: cy - 15, w: 400, h: 50 }, action: () => {SoundManager.instance.playSound('ui.click'); this.sceneManager.pushScene(new SettingsScene(this.sceneManager))} },
        { label: 'Cycle Gamemode', rect: { x: cx - 200, y: cy + 55, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.cycleGamemode() }},
        { label: 'Save & Quit', rect: { x: cx - 200, y: cy + 125, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.saveAndQuit() }},
    ];
    this.deathMenuButtons = [
        { label: 'Respawn', rect: { x: cx - 200, y: cy, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.player.respawn(); this.deathAnimationTimer = 0; }},
        { label: 'Quit to Title', rect: { x: cx - 200, y: cy + 70, w: 400, h: 50 }, action: () => { SoundManager.instance.playSound('ui.click'); this.sceneManager.switchScene(new TitleScene(this.sceneManager))} },
    ];
  }

  enter(): void {
      window.addEventListener('beforeunload', this.saveOnExit);
      
      const controlScheme = SettingsManager.instance.getEffectiveControlScheme();

      // Register hotbar slots for touch and now mouse input
      for (let i = 0; i < HOTBAR_SLOTS; i++) {
          const rect = this.hud.getHotbarSlotRect(i);
          const callback = () => { this.player.activeHotbarSlot = i; };
          if (controlScheme === 'touch') {
              this.sceneManager.touchHandler.registerTappableRect(`hotbar_${i}`, rect, callback);
          }
          this.sceneManager.mouseHandler['registerClickableRect']?.(`hotbar_${i}`, rect, callback);
      }
  }
  exit(): void {
      window.removeEventListener('beforeunload', this.saveOnExit);
      
      // Unregister hotbar slots
      for (let i = 0; i < HOTBAR_SLOTS; i++) {
          this.sceneManager.touchHandler.unregisterTappableRect(`hotbar_${i}`);
          this.sceneManager.mouseHandler['unregisterClickableRect']?.(`hotbar_${i}`);
      }
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
    this.worldData.metadata.gameMode = this.player.gamemode;
    WorldStorage.saveWorld(this.worldData);
    this.hud.displaySaveIndicator();
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
        this.inventoryUI.open('player_survival');
        break;
      case 'openCraftingTable':
        this.inventoryUI.open('crafting_table');
        break;
      case 'openFurnace':
        this.inventoryUI.open('furnace', { worldX: data.x, worldY: data.y });
        break;
      case 'openChest':
        //this.inventoryUI.openChest(data.chestInventory);
        break;
      case 'dropItem': {
        const itemEntity = new ItemEntity(data.position, data.item);
        itemEntity.velocity.x = data.velocity.x;
        itemEntity.velocity.y = data.velocity.y;
        this.itemEntities.push(itemEntity);
        break;
      }
      case 'showNotification':
          this.hud.showNotification(data.message);
          break;
    }
  };
  
  update(deltaTime: number): void {
    if (this.isSwitchingGamemode) {
        this.gamemodeSwitchTimer += deltaTime;
        const halfDuration = this.GAMEMODE_SWITCH_DURATION / 2;
        if (this.gamemodeSwitchTimer >= halfDuration && this.player.gamemode !== this.nextGamemode) {
            this.player.setGameMode(this.nextGamemode);
            this.worldData.metadata.gameMode = this.nextGamemode;
            const capitalized = this.nextGamemode.charAt(0).toUpperCase() + this.nextGamemode.slice(1);
            this.hud.showNotification(`Game mode set to ${capitalized}`);
        }
        if (this.gamemodeSwitchTimer >= this.GAMEMODE_SWITCH_DURATION) {
            this.isSwitchingGamemode = false;
        }
        this.camera.update(deltaTime); // Keep camera smooth
        return; // Block all other game updates
    }

    const inputState = this.controlManager.update();

    if (this.player.isDead) {
      this.deathAnimationTimer += deltaTime;
      this.animationSystem.update(deltaTime, this.player);
      this.camera.update(deltaTime);
      if (this.deathAnimationTimer >= this.DEATH_ANIMATION_DURATION) {
         this.updateMenu(this.deathMenuButtons);
      }
      return;
    }

    // --- System-level actions from ControlManager ---
    if (inputState.pause) {
        if (this.chatUI.isOpen) this.chatUI.toggle();
        else if (this.inventoryUI.isOpen()) this.inventoryUI.close();
        else this.togglePause();
    }
    if (inputState.openChat) {
        if (!this.inventoryUI.isOpen() && !this.isPaused) this.chatUI.toggle();
    }
    if (inputState.screenshot) this.takeScreenshot();
    if (inputState.toggleDebug) this.hud.toggleDebugOverlay();
    if (inputState.toggleFullscreen) this.toggleFullscreen();
    
    if (inputState.inventory) {
        if (this.inventoryUI.isOpen()) {
            this.inventoryUI.close();
        } else if (!this.chatUI.isOpen && !this.isPaused) {
            this.onPlayerAction('openInventory', {});
        }
    }
    
    // Stop player movement/actions if chat is open
    if (this.chatUI.isOpen) {
        return;
    }

    if (inputState.gamemodeSwitch) {
        this.cycleGamemode();
    }

    if (this.isPaused) {
      this.updateMenu(this.pauseMenuButtons);
      return;
    }

    if (this.inventoryUI.isOpen()) {
        this.inventoryUI.update();
        return;
    }
    
    // FIX: Changed player.update to player.updatePlayer to resolve signature conflict with LivingEntity.
    this.player.updatePlayer(deltaTime, this.camera, inputState);
    this.world.update(this.player.position);
    this.world.updateBlockEntities(deltaTime);
    this.camera.update(deltaTime);
    this.animationSystem.update(deltaTime, this.player);
    this.hud.update(deltaTime);

    this.itemEntities.forEach(entity => {
      entity.update(deltaTime, this.physicsSystem);
      this.player.tryPickupItem(entity);
    });
    this.itemEntities = this.itemEntities.filter(e => !e.shouldBeRemoved());
    
    if (this.player.gamemode === 'survival') {
      this.mobs.forEach(mob => {
        if (mob instanceof Zombie) mob.setTarget(this.player);
        mob.update(deltaTime, this.physicsSystem);

        if (this.player.canAttack() && inputState.destroy) {
          const dx = mob.position.x - this.player.position.x;
          const dy = mob.position.y - this.player.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < REACH_DISTANCE) {
            this.player.attackEntity(mob, this.camera);
          }
        }
      });

      this.mobs = this.mobs.filter(mob => {
        if (mob.shouldBeRemoved()) {
          if (mob instanceof Zombie) {
            const loot = mob.dropLoot();
            loot.forEach(item => {
              this.onPlayerAction('dropItem', {
                item,
                position: { x: mob.position.x + mob.width / 2, y: mob.position.y + mob.height / 2 },
                velocity: { x: (Math.random() - 0.5) * 5, y: -Math.random() * 5 }
              });
            });
            this.player.xpSystem.spawnXP({ x: mob.position.x + mob.width / 2, y: mob.position.y + mob.height / 2 }, 5);
          }
          return false;
        }
        return true;
      });

      this.mobSpawner.update(deltaTime, this.player, this.mobs as Zombie[]);
    }


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
        ctx.save();
        const grayscale = Math.min(1, this.deathAnimationTimer / (this.DEATH_ANIMATION_DURATION - 1.0));
        ctx.filter = `grayscale(${grayscale})`;
    }

    this.renderer.render(ctx, this.world, this.player, this.sceneManager.mouseHandler, this.animationSystem, this.itemEntities);
    
    this.mobs.forEach(mob => mob.render(ctx));

    if (this.isPaused) {
      this.renderPauseMenu(ctx);
    } else {
       if (!isActuallyDead) {
          this.hud.render(ctx);
      }
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

    this.chatUI.render(ctx);

    if (this.isSwitchingGamemode) {
        this.renderGamemodeTransition(ctx);
    }
  }

  private renderGamemodeTransition(ctx: CanvasRenderingContext2D) {
    let alpha = 0;
    const halfDuration = this.GAMEMODE_SWITCH_DURATION / 2;
    if (this.gamemodeSwitchTimer < halfDuration) {
        alpha = this.gamemodeSwitchTimer / halfDuration; // Fade in
    } else {
        alpha = 1 - ((this.gamemodeSwitchTimer - halfDuration) / halfDuration); // Fade out
    }
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  private renderMenu(ctx: CanvasRenderingContext2D, title: string, buttons: any[]) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = "60px Minecraftia";
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(title, ctx.canvas.width / 2, ctx.canvas.height / 2 - 180);

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

  private takeScreenshot() {
    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    const link = document.createElement('a');
    link.download = `minecraft2d_screenshot_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
  }
}
