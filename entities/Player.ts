import { Vector2, BlockId, Item, ItemId, GameMode, InputState, BlockType, PlayerData, PlayerProfile } from '../types';
import { ChunkSystem } from '../world/ChunkSystem';
import { 
    PLAYER_MOVE_SPEED, GRAVITY, PLAYER_JUMP_FORCE, PLAYER_FRICTION,
    PLAYER_WIDTH, PLAYER_HEIGHT, BLOCK_SIZE, HOTBAR_SLOTS, REACH_DISTANCE,
    PARTICLE_COUNT, PARTICLE_LIFESPAN, MAX_HEALTH, MAX_HUNGER, FALL_DAMAGE_START_BLOCKS,
    PLAYER_SPRINT_SPEED, PLAYER_SNEAK_SPEED, PLAYER_SNEAK_HEIGHT,
    INCORRECT_TOOL_PENALTY, INVENTORY_SLOTS,
    ITEM_PICKUP_RADIUS, TOOL_TIER_SPEED_MAP, ARMOR_SLOTS
} from '../core/Constants';
import { PhysicsSystem } from './PhysicsSystem';
import { getBlockType } from '../world/BlockRegistry';
import { Camera } from './Camera';
import { Inventory } from '../world/Inventory';
import { MouseHandler } from '../input/MouseHandler';
import { SettingsManager } from '../core/SettingsManager';
import { TouchHandler } from '../input/TouchHandler';
import { XPSystem } from '../world/XPSystem';
import { SoundManager } from '../core/SoundManager';
import { InputManager } from '../input/InputManager';
import { ItemRegistry } from '../inventory/ItemRegistry';
import { ItemEntity } from './ItemEntity';
import { GAME_MODE_CONFIGS } from '../core/GameModes';
import { LivingEntity } from './LivingEntity';

export class Player extends LivingEntity {
  public profile: PlayerProfile;
  private spawnPoint: Vector2;
  
  public facingDirection: number = 1; // 1 for right, -1 for left
  
  private mouseHandler: MouseHandler;
  private touchHandler: TouchHandler;
  private inputManager: InputManager;
  public world: ChunkSystem;
  private physics: PhysicsSystem;
  private fallDistance: number = 0;
  public justLanded: boolean = false;
  
  public inventory: Inventory;
  public armorInventory: Inventory;
  public offhandInventory: Inventory;
  private survivalInventory: Inventory;
  private survivalArmorInventory: Inventory;
  
  public activeHotbarSlot: number = 0;

  public hunger: number = MAX_HUNGER;
  public isDead: boolean = false;
  public causeOfDeath: string = "Player died";
  public justTookDamage: boolean = false;
  private timeSinceHungerTick: number = 0;
  private timeSinceHealthRegen: number = 0;
  private timeSinceStarveDamage: number = 0;

  public animationState: string = 'idle';
  public isSprinting: boolean = false;
  public isSneaking: boolean = false;
  public isMining: boolean = false;
  public breakingBlock: { x: number, y: number, progress: number } | null = null;
  public targetBlock: {x: number, y: number} | null = null;
  public placementAnimTimer: number = 0;
  
  private actionCallback: (action: string, data: any) => void;

  public skinColor: string;
  public shirtColor: string;
  public pantsColor: string;
  public hairColor: string;
  
  public gamemode: GameMode = 'survival';
  public isFlying: boolean = false;
  private lastJumpPressTime: number = 0;

  // Game Mode properties
  public takesDamage: boolean = true;
  public hasHunger: boolean = true;
  public interactionRange: number = REACH_DISTANCE;

  public eyeOffset: Vector2 = { x: 0, y: 0 };
  public isBlinking: boolean = false;
  private blinkCountdown: number = 3 + Math.random() * 4;
  private blinkDurationTimer: number = 0;
  private readonly BLINK_DURATION = 0.15;

  public experience: number = 0;
  public level: number = 0;
  public xpSystem: XPSystem;

  constructor(profile: PlayerProfile, spawnPoint: Vector2, world: ChunkSystem, mouseHandler: MouseHandler, touchHandler: TouchHandler, inputManager: InputManager, physics: PhysicsSystem, actionCallback: (action: string, data: any) => void) {
    super(spawnPoint, PLAYER_WIDTH, PLAYER_HEIGHT, MAX_HEALTH);
    this.maxHealth = MAX_HEALTH;

    this.profile = profile;
    this.skinColor = profile.skin.skinColor;
    this.shirtColor = profile.skin.shirtColor;
    this.pantsColor = profile.skin.pantsColor;
    this.hairColor = profile.skin.hairColor;
    
    this.spawnPoint = { ...spawnPoint };
    this.mouseHandler = mouseHandler;
    this.touchHandler = touchHandler;
    this.inputManager = inputManager;
    this.world = world;
    this.physics = physics;
    this.inventory = new Inventory(INVENTORY_SLOTS);
    this.armorInventory = new Inventory(ARMOR_SLOTS);
    this.offhandInventory = new Inventory(1);
    this.survivalInventory = new Inventory(INVENTORY_SLOTS);
    this.survivalArmorInventory = new Inventory(ARMOR_SLOTS);
    this.actionCallback = actionCallback;
    this.xpSystem = new XPSystem();
    this.initializeInventory();
  }

  // FIX: Implement the abstract render method from LivingEntity. Player rendering is handled by PlayerRenderer.
  public render(_ctx: CanvasRenderingContext2D): void {}

  protected updateAI(deltaTime: number): void {}

  public setGameMode(newMode: GameMode) {
      if (this.gamemode === newMode) return;
      
      const oldConfig = GAME_MODE_CONFIGS[this.gamemode];
      const newConfig = GAME_MODE_CONFIGS[newMode];

      // Handle Inventory Transitions
      if (this.gamemode === 'survival' && newMode !== 'survival') {
          this.survivalInventory.fromData(this.inventory.toData());
          this.survivalArmorInventory.fromData(this.armorInventory.toData());
      }
      
      if (!newConfig.keepInventoryOnSwitch) {
          this.inventory.clear();
          this.armorInventory.clear();
      }

      if (newMode === 'survival' && this.gamemode !== 'survival') {
          this.inventory.fromData(this.survivalInventory.toData());
          this.armorInventory.fromData(this.survivalArmorInventory.toData());
      }
      
      this.gamemode = newMode;
      
      // Apply new properties
      this.takesDamage = newConfig.takesDamage;
      this.hasHunger = newConfig.hasHunger;
      this.interactionRange = newConfig.interactionRange;

      if (newConfig.canFly) {
          if(this.gamemode === 'spectator') this.isFlying = true;
      } else {
          this.isFlying = false;
      }

      if (!newConfig.takesDamage) {
          this.health = MAX_HEALTH;
      }
      if (!newConfig.hasHunger) {
          this.hunger = MAX_HUNGER;
      }
  }

  private initializeInventory() {
    // this.inventory.setItem(0, {id: ItemId.WOODEN_AXE, count: 1});
    // this.inventory.setItem(1, {id: ItemId.WOODEN_PICKAXE, count: 1});
    // this.inventory.setItem(2, {id: ItemId.WOODEN_SHOVEL, count: 1});
  }
  
  // FIX: Satisfy inheritance from LivingEntity. Player-specific update is handled by updatePlayer.
  public update(_deltaTime: number, _physics: PhysicsSystem): void {
      // This method is required by LivingEntity, but player logic is handled in `updatePlayer`
      // which is called directly by the GameScene.
  }

  public updatePlayer(deltaTime: number, camera: Camera, inputState: InputState): void {
    if (this.isDead) {
        this.animationState = 'dying';
        return;
    };

    if (this.attackCooldown > 0) {
        this.attackCooldown -= deltaTime;
    }
    
    // Spectator has very simple update loop
    if (this.gamemode === 'spectator') {
        this.handleInput(inputState);
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.updateAnimationState(inputState);
        this.updateBlinking(deltaTime);
        return;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= 60 * deltaTime;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // A bit of gravity
        if (p.life <= 0) {
            this.particles.splice(i, 1);
        }
    }

    if (this.placementAnimTimer > 0) this.placementAnimTimer -= deltaTime;
    this.updateTargeting(camera);
    this.handleInput(inputState);
    if (this.isFlying) {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.onGround = false;
    } else {
        this.physics.applyGravity(this as any);
        this.physics.applyFriction(this as any);
        this.physics.updatePositionAndCollision(this as any);
    }
    this.handleFallDamage(camera);
    this.handleBlockInteraction(inputState, camera);
    this.updateVitals(deltaTime, camera);
    this.updateAnimationState(inputState);
    this.updateBlinking(deltaTime);
    this.updateEyeAndHeadDirection();

    const collectedXP = this.xpSystem.update(deltaTime, {x: this.position.x + this.width / 2, y: this.position.y + this.height / 2});
    if(collectedXP > 0) this.addXP(collectedXP);
  }

  public getAttackCooldownPercent(): number {
      if (this.attackCooldown <= 0) return 1;
      return 1 - (this.attackCooldown / this.maxAttackCooldown);
  }
  
  public addXP(amount: number): void {
    if (this.gamemode !== 'survival') return;
    this.experience += amount;
    let requiredXP = this.getRequiredXPForLevel(this.level);
    while (this.experience >= requiredXP) {
      this.level++;
      this.experience -= requiredXP;
      requiredXP = this.getRequiredXPForLevel(this.level);
    }
  }

  public getRequiredXPForLevel(level: number): number {
    if (level < 16) return 2 * level + 7;
    if (level < 31) return 5 * level - 38;
    return 9 * level - 158;
  }

  private updateEyeAndHeadDirection(): void {
    let targetEyeX = 0;
    let targetEyeY = 0;
    if (this.targetBlock) {
        const targetWorldX = (this.targetBlock.x + 0.5) * BLOCK_SIZE;
        const playerWorldX = this.position.x + this.width / 2;
        targetEyeX = (targetWorldX - playerWorldX) / this.interactionRange;

        const targetWorldY = (this.targetBlock.y + 0.5) * BLOCK_SIZE;
        const playerWorldY = this.position.y + this.height * 0.2; // eye level
        targetEyeY = (targetWorldY - playerWorldY) / this.interactionRange;
    } else {
        targetEyeX = this.facingDirection * 0.4;
    }
    targetEyeX = Math.max(-0.5, Math.min(0.5, targetEyeX));
    targetEyeY = Math.max(-0.4, Math.min(0.4, targetEyeY));
    this.eyeOffset.x += (targetEyeX - this.eyeOffset.x) * 0.15;
    this.eyeOffset.y += (targetEyeY - this.eyeOffset.y) * 0.15;
  }

  public respawn(): void {
    this.position = { ...this.spawnPoint };
    this.health = MAX_HEALTH;
    this.hunger = MAX_HUNGER;
    this.isDead = false;
    this.velocity = { x: 0, y: 0 };
    this.fallDistance = 0;
    this.inventory.clear();
    this.initializeInventory();
  }

  public tryPickupItem(entity: ItemEntity): void {
    if (this.gamemode === 'spectator') return;
    if (!entity.canBePickedUp()) return;
    const dx = (this.position.x + this.width / 2) - (entity.position.x + entity.width / 2);
    const dy = (this.position.y + this.height / 2) - (entity.position.y + entity.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < ITEM_PICKUP_RADIUS) {
        const remainingItem = this.inventory.addItem(entity.item);
        if (remainingItem === null) entity.collect();
        else entity.item.count = remainingItem.count;
    }
  }

  private updateBlinking(deltaTime: number): void {
    if (this.isBlinking) {
        this.blinkDurationTimer += deltaTime;
        if (this.blinkDurationTimer >= this.BLINK_DURATION) {
            this.isBlinking = false;
            this.blinkDurationTimer = 0;
            this.blinkCountdown = 2 + Math.random() * 5;
        }
    } else {
        this.blinkCountdown -= deltaTime;
        if (this.blinkCountdown <= 0) this.isBlinking = true;
    }
  }

  public checkLineOfSight(targetBlock: {x: number, y: number}): boolean {
    const startX = this.position.x + this.width / 2;
    const startY = this.position.y + this.height * 0.2;
    const endX = (targetBlock.x + 0.5) * BLOCK_SIZE;
    const endY = (targetBlock.y + 0.5) * BLOCK_SIZE;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / (BLOCK_SIZE / 2)); 
    if (steps <= 1) return true;
    const xInc = dx / steps;
    const yInc = dy / steps;
    let currentX = startX;
    let currentY = startY;
    for (let i = 1; i < steps; i++) {
        currentX += xInc;
        currentY += yInc;
        const blockX = Math.floor(currentX / BLOCK_SIZE);
        const blockY = Math.floor(currentY / BLOCK_SIZE);
        if (blockX === targetBlock.x && blockY === targetBlock.y) continue;
        const blockType = getBlockType(this.world.getBlock(blockX, blockY));
        if (blockType && blockType.isSolid) return false;
    }
    return true;
  }

  private updateTargeting(camera: Camera): void {
      const controlScheme = SettingsManager.instance.getEffectiveControlScheme();
      if (controlScheme === 'keyboard') {
          const worldPos = camera.screenToWorld(this.mouseHandler.position);
          const blockX = Math.floor(worldPos.x / BLOCK_SIZE);
          const blockY = Math.floor(worldPos.y / BLOCK_SIZE);
          const playerCenterX = this.position.x + this.width / 2;
          const playerCenterY = this.position.y + this.height / 2;
          const blockCenterX = (blockX + 0.5) * BLOCK_SIZE;
          const blockCenterY = (blockY + 0.5) * BLOCK_SIZE;
          const dx = playerCenterX - blockCenterX;
          const dy = playerCenterY - blockCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const candidateTarget = { x: blockX, y: blockY };
          if (distance <= this.interactionRange && this.checkLineOfSight(candidateTarget)) this.targetBlock = candidateTarget;
          else this.targetBlock = null;
      } else {
          const interactionTapPos = this.touchHandler.getInteractionTap();
          if (interactionTapPos) {
              const worldPos = camera.screenToWorld(interactionTapPos);
              const blockX = Math.floor(worldPos.x / BLOCK_SIZE);
              const blockY = Math.floor(worldPos.y / BLOCK_SIZE);
              const playerCenterX = this.position.x + this.width / 2;
              const playerCenterY = this.position.y + this.height / 2;
              const blockCenterX = (blockX + 0.5) * BLOCK_SIZE;
              const blockCenterY = (blockY + 0.5) * BLOCK_SIZE;
              const dx = playerCenterX - blockCenterX;
              const dy = playerCenterY - blockCenterY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const tappedBlockType = getBlockType(this.world.getBlock(blockX, blockY));
              let canTarget = false;
              if (tappedBlockType && tappedBlockType.isSolid) {
                  canTarget = true;
              } else {
                  const neighbors = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
                  for (const n of neighbors) {
                      const neighborType = getBlockType(this.world.getBlock(blockX + n.x, blockY + n.y));
                      if (neighborType && neighborType.isSolid) {
                          canTarget = true;
                          break;
                      }
                  }
              }
              if (distance <= this.interactionRange && canTarget && this.checkLineOfSight({ x: blockX, y: blockY })) this.targetBlock = { x: blockX, y: blockY };
              else this.targetBlock = null;
          }
      }
  }

  private handleInput(inputState: InputState): void {
    const speed = this.isSneaking ? PLAYER_SNEAK_SPEED : (this.isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_MOVE_SPEED);
    if (this.isFlying) {
      this.velocity.x = inputState.moveX * speed;
      this.velocity.y = 0;
      if (inputState.jump.pressed) this.velocity.y = -speed;
      if (inputState.sneak.pressed) this.velocity.y = speed;
    } else {
      this.velocity.x = inputState.moveX * speed;
    }

    if (inputState.moveX !== 0) this.facingDirection = Math.sign(inputState.moveX);
    
    const scrollDelta = this.mouseHandler.consumeScroll();
    if (scrollDelta !== 0) {
        this.activeHotbarSlot = (this.activeHotbarSlot + scrollDelta + HOTBAR_SLOTS) % HOTBAR_SLOTS;
    }

    for (let i = 1; i <= 9; i++) {
        if (this.inputManager.isKeyReleased(i.toString())) {
            this.activeHotbarSlot = i - 1;
        }
    }

    if (inputState.jump.justPressed) {
      if (GAME_MODE_CONFIGS[this.gamemode].canFly) {
        const now = Date.now();
        if (now - this.lastJumpPressTime < 300) this.isFlying = !this.isFlying;
        this.lastJumpPressTime = now;
      }
      if (this.onGround) {
        this.velocity.y = -PLAYER_JUMP_FORCE;
        this.onGround = false;
        this.justLanded = false;
        this.fallDistance = 0;
      }
    }

    this.isSneaking = inputState.sneak.pressed;
    // FIX: Update player height dynamically when sneak state changes, instead of using an accessor.
    this.height = this.isSneaking ? PLAYER_SNEAK_HEIGHT : PLAYER_HEIGHT;
    this.isSprinting = inputState.sprint.pressed && !this.isSneaking && inputState.moveX !== 0 && this.onGround;

    if (inputState.drop) {
        this.dropSelectedItem();
    }
    
    if (inputState.pickBlock) {
        this.pickBlock();
    }

    if (inputState.swapHands) {
        this.swapHands();
    }
  }
  
  private swapHands() {
      const hotbarItem = this.inventory.getItem(this.activeHotbarSlot);
      const offhandItem = this.offhandInventory.getItem(0);
      this.inventory.setItem(this.activeHotbarSlot, offhandItem);
      this.offhandInventory.setItem(0, hotbarItem);
  }

  private pickBlock(): void {
      if (this.gamemode !== 'creative' || !this.targetBlock) return;
      
      const blockId = this.world.getBlock(this.targetBlock.x, this.targetBlock.y);
      if (blockId === BlockId.AIR) return;

      const blockType = getBlockType(blockId);
      if (!blockType) return;
      
      const itemId = blockType.itemDrop?.itemId || (blockId as unknown as ItemId);
      const itemInfo = ItemRegistry.getItemInfo(itemId);
      if (!itemInfo) return;
      
      // Try to find if we already have this item in the hotbar
      for (let i = 0; i < HOTBAR_SLOTS; i++) {
          const item = this.inventory.getItem(i);
          if (item && item.id === itemId) {
              this.activeHotbarSlot = i;
              return;
          }
      }
      
      // Try to replace the currently selected empty slot
      if (!this.inventory.getItem(this.activeHotbarSlot)) {
          this.inventory.setItem(this.activeHotbarSlot, { id: itemId, count: itemInfo.maxStackSize });
          return;
      }

      // Find the first empty slot in the hotbar
      for (let i = 0; i < HOTBAR_SLOTS; i++) {
          if (!this.inventory.getItem(i)) {
              this.inventory.setItem(i, { id: itemId, count: itemInfo.maxStackSize });
              this.activeHotbarSlot = i;
              return;
          }
      }

      // If all else fails, replace the currently selected item
      this.inventory.setItem(this.activeHotbarSlot, { id: itemId, count: itemInfo.maxStackSize });
  }

  private dropSelectedItem(): void {
    const heldItem = this.inventory.getItem(this.activeHotbarSlot);
    if (!heldItem) return;

    const droppedItem: Item = { id: heldItem.id, count: 1 };
    
    if (this.gamemode !== 'creative') {
        this.inventory.removeItem(this.activeHotbarSlot, 1);
    }

    this.actionCallback('dropItem', { 
        item: droppedItem,
        position: {
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height * 0.4
        },
        velocity: {
            x: this.facingDirection * 6,
            y: -6
        }
    });
  }

  private handleFallDamage(camera: Camera): void {
    if (!this.takesDamage) return;

    if (this.velocity.y > 0 && !this.onGround) {
        this.fallDistance += this.velocity.y;
    }

    if (this.justLanded) {
      const fallBlocks = this.fallDistance / BLOCK_SIZE;
      
      if (fallBlocks >= FALL_DAMAGE_START_BLOCKS) {
        const damage = Math.floor(fallBlocks - (FALL_DAMAGE_START_BLOCKS - 1));
        if (damage > 0) {
            this.takeDamage(damage, "Player fell from a high place", camera);
        }
      }
      
      this.fallDistance = 0;
      this.justLanded = false;
    }
    
    if (this.onGround && this.velocity.y === 0) {
        this.fallDistance = 0;
    }
  }
  
  public override takeDamage(amount: number, cause: string, camera?: Camera): void {
    if (!this.takesDamage || this.isDead) return;

    const armorProtection = this.calculateArmorProtection();
    const damageReduction = armorProtection * 0.04; // 4% per point
    const reducedDamage = Math.round(amount * (1 - damageReduction));
    
    this.health -= reducedDamage;
    this.justTookDamage = true;
    this.damageFlashTimer = 0.2; // From LivingEntity

    if (this.gamemode === 'survival') {
        this.damageArmor(Math.max(1, Math.floor(reducedDamage / 4)));
    }

    if (camera) camera.triggerShake(5, 0.3);
    SoundManager.instance.playSound('player.hurt');
    if (this.health <= 0) {
      this.health = 0;
      this.causeOfDeath = cause;
      this.die();
    }
  }
  
  protected override die(): void {
    super.die(); // Handle particles and isAlive flag
    this.isDead = true;
    SoundManager.instance.playSound('player.death');
  }
  
  private handleBlockInteraction(inputState: InputState, camera: Camera): void {
    const config = GAME_MODE_CONFIGS[this.gamemode];
    if (!config.canInteract) {
        this.breakingBlock = null;
        this.isMining = false;
        return;
    }

    if (!this.targetBlock || !this.checkLineOfSight(this.targetBlock)) {
      this.breakingBlock = null;
      this.isMining = false;
      return;
    }
    const { x: blockX, y: blockY } = this.targetBlock;
    const blockId = this.world.getBlock(blockX, blockY);
    const blockType = getBlockType(blockId);

    if (inputState.destroy && blockType && !blockType.isIndestructible) {
      this.isMining = true;
      if (this.breakingBlock && this.breakingBlock.x === blockX && this.breakingBlock.y === blockY) {
        this.breakingBlock.progress += this.getMiningSpeed(blockType);
      } else {
        this.breakingBlock = { x: blockX, y: blockY, progress: this.getMiningSpeed(blockType) };
      }
      if (this.breakingBlock.progress >= blockType.hardness) {
        if (blockType.id !== BlockId.AIR) {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            this.particles.push({
              x: (blockX + 0.5) * BLOCK_SIZE,
              y: (blockY + 0.5) * BLOCK_SIZE,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5 - 3,
              life: PARTICLE_LIFESPAN,
              color: blockType.color,
              size: Math.random() * 4 + 2,
            });
          }
        }

        let drop = blockType.itemDrop;
        if (blockType.minToolTier && this.gamemode === 'survival') {
            const heldItem = this.inventory.getItem(this.activeHotbarSlot);
            const itemInfo = heldItem ? ItemRegistry.getItemInfo(heldItem.id) : null;
            const toolInfo = itemInfo ? itemInfo.toolInfo : null;
            const tiers = ['none', 'wood', 'stone', 'iron', 'diamond'];
            const requiredTierIndex = tiers.indexOf(blockType.minToolTier);
            const currentTierIndex = (toolInfo && toolInfo.type === blockType.toolType) ? tiers.indexOf(toolInfo.tier) : 0;
            if (currentTierIndex < requiredTierIndex) {
                drop = undefined;
            }
        }

        this.world.setBlock(blockX, blockY, BlockId.AIR);

        if (this.gamemode === 'survival') {
            const heldItem = this.inventory.getItem(this.activeHotbarSlot);
            if (heldItem) {
                const itemInfo = ItemRegistry.getItemInfo(heldItem.id);
                if (itemInfo?.toolInfo) {
                    this.consumeDurability(heldItem, 1);
                }
            }
        }

        if (drop && this.gamemode === 'survival') {
          // Special drop logic
          if (blockType.id === BlockId.GRAVEL && Math.random() < 0.1) {
              drop = { itemId: ItemId.FLINT, min: 1, max: 1 };
          }

          const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
          if (count > 0) {
            this.actionCallback('breakBlock', { x: blockX, y: blockY, item: { id: drop.itemId, count }, blockType });
          }
        }
        
        // Sapling Drop Logic
        if (this.gamemode === 'survival' && blockType.id !== BlockId.AIR) {
            let saplingId: ItemId | null = null;
            if (blockType.id === BlockId.OAK_LEAVES) saplingId = ItemId.OAK_SAPLING;
            if (blockType.id === BlockId.SPRUCE_LEAVES) saplingId = ItemId.SPRUCE_SAPLING;
            if (blockType.id === BlockId.BIRCH_LEAVES) saplingId = ItemId.BIRCH_SAPLING;
            if (saplingId && Math.random() < 0.1) { // 10% chance
                this.actionCallback('breakBlock', { x: blockX, y: blockY, item: { id: saplingId, count: 1 }, blockType });
            }
        }
        
        this.breakingBlock = null;
        this.isMining = false;
      }
    } else {
      this.breakingBlock = null;
      this.isMining = false;
    }

    if (inputState.place) {
      const heldItem = this.inventory.getItem(this.activeHotbarSlot);

      // Hoe Logic
      if (heldItem) {
        const itemInfo = ItemRegistry.getItemInfo(heldItem.id);
        if (itemInfo?.toolInfo?.type === 'hoe' && (blockId === BlockId.DIRT || blockId === BlockId.GRASS)) {
            this.world.setBlock(blockX, blockY, BlockId.FARMLAND);
            if(this.gamemode === 'survival') this.consumeDurability(heldItem, 1);
            return;
        }
      }
      
      // Block Interaction Logic
      switch(blockId) {
        case BlockId.CRAFTING_TABLE:
            this.actionCallback('openCraftingTable', {});
            return;
        case BlockId.FURNACE:
        case BlockId.FURNACE_LIT:
            this.actionCallback('openFurnace', { x: blockX, y: blockY });
            return;
        case BlockId.CHEST:
            const chestInventory = this.world.getChestInventory(blockX, blockY);
            if (chestInventory) this.actionCallback('openChest', { chestInventory });
            return;
      }

      // Block Placement Logic
      if (heldItem) {
        const itemInfo = ItemRegistry.getItemInfo(heldItem.id);
        if (itemInfo && itemInfo.blockId) {
          let placeX: number, placeY: number;
          if (!(blockType && blockType.isSolid)) {
              placeX = blockX;
              placeY = blockY;
          } else {
              if (SettingsManager.instance.getEffectiveControlScheme() === 'keyboard') {
                  const worldPos = camera.screenToWorld(this.mouseHandler.position);
                  const dX = worldPos.x - (blockX + 0.5) * BLOCK_SIZE;
                  const dY = worldPos.y - (blockY + 0.5) * BLOCK_SIZE;
                  if (Math.abs(dX) > Math.abs(dY)) {
                      placeX = blockX + (dX > 0 ? 1 : -1); placeY = blockY;
                  } else {
                      placeX = blockX; placeY = blockY + (dY > 0 ? 1 : -1);
                  }
              } else {
                  const dX = (this.position.x + this.width / 2) - (blockX + 0.5) * BLOCK_SIZE;
                  const dY = (this.position.y + this.height / 2) - (blockY + 0.5) * BLOCK_SIZE;
                  if (Math.abs(dX) > Math.abs(dY)) {
                      placeX = blockX + (dX > 0 ? -1 : 1); placeY = blockY;
                  } else {
                      placeX = blockX; placeY = blockY + (dY > 0 ? -1 : 1);
                  }
              }
          }
          const blockAtPlacePos = getBlockType(this.world.getBlock(placeX, placeY));
          if(blockAtPlacePos && !blockAtPlacePos.isSolid) {
              const playerRect = {x: this.position.x, y: this.position.y, width: this.width, height: this.height};
              const newBlockRect = {x: placeX * BLOCK_SIZE, y: placeY * BLOCK_SIZE, width: BLOCK_SIZE, height: BLOCK_SIZE};
              if(!this.physics.checkAABBCollision(playerRect, newBlockRect)) {
                this.world.setBlock(placeX, placeY, itemInfo.blockId);
                if (this.gamemode === 'survival') this.inventory.removeItem(this.activeHotbarSlot, 1);
                this.placementAnimTimer = 0.3;
                this.actionCallback('placeBlock', { blockType: getBlockType(itemInfo.blockId) });
              }
          }
        }
      }
    }
  }

  private getMiningSpeed(blockType: BlockType): number {
    if (GAME_MODE_CONFIGS[this.gamemode].instantBreak) return blockType.hardness;
    
    const heldItem = this.inventory.getItem(this.activeHotbarSlot);
    const itemInfo = heldItem ? ItemRegistry.getItemInfo(heldItem.id) : null;
    const toolInfo = itemInfo ? itemInfo.toolInfo : null;
    
    // Calculate speed multiplier
    let speedMultiplier = 1; // Base speed for hand
    if (toolInfo && toolInfo.type === blockType.toolType) {
        speedMultiplier = TOOL_TIER_SPEED_MAP[toolInfo.tier];
    }

    // Calculate penalty for incorrect tool type
    let penalty = 1;
    if (blockType.toolType && (!toolInfo || toolInfo.type !== blockType.toolType)) {
        penalty = INCORRECT_TOOL_PENALTY;
    }
    
    // Check if tool tier is sufficient
    if (blockType.minToolTier && this.gamemode === 'survival') {
        const tiers = ['none', 'wood', 'stone', 'iron', 'diamond'];
        const requiredTierIndex = tiers.indexOf(blockType.minToolTier);
        const currentTierIndex = (toolInfo && toolInfo.type === blockType.toolType) ? tiers.indexOf(toolInfo.tier) : 0;
        if (currentTierIndex < requiredTierIndex) {
            // If the tool is of the right type but wrong tier, it breaks, but doesn't drop anything (handled in break logic)
            // It mines very slowly
            penalty = 0.2;
        }
    }

    return 1 * speedMultiplier * penalty;
  }

  private updateVitals(deltaTime: number, camera: Camera): void {
    if (!this.hasHunger) {
        this.hunger = MAX_HUNGER;
        this.health = MAX_HEALTH;
        return;
    }

    this.timeSinceHungerTick += deltaTime;
    if (this.timeSinceHungerTick > 20) {
      this.timeSinceHungerTick = 0;
      if (this.hunger > 0) this.hunger--;
    }
    
    if (this.health < MAX_HEALTH && this.hunger >= 18) {
      this.timeSinceHealthRegen += deltaTime;
      if (this.timeSinceHealthRegen > 4) {
        this.timeSinceHealthRegen = 0;
        this.health++;
      }
    } else {
        this.timeSinceHealthRegen = 0;
    }
    
    if (this.hunger <= 0) {
      this.timeSinceStarveDamage += deltaTime;
      if (this.timeSinceStarveDamage > 4) {
        this.timeSinceStarveDamage = 0;
        this.takeDamage(1, "Player starved to death", camera);
      }
    } else {
        this.timeSinceStarveDamage = 0;
    }
  }

  private updateAnimationState(inputState: InputState): void {
    if (this.gamemode === 'spectator') {
        this.animationState = 'idle';
        return;
    }
    if(this.justTookDamage) {
        this.animationState = 'hurt';
    } else if (this.isMining) {
      this.animationState = 'mining';
    } else if (!this.onGround && !this.isFlying) {
      this.animationState = this.velocity.y < 0 ? 'jumping' : 'falling';
    } else if (this.isSneaking) {
      this.animationState = 'sneaking';
    } else if (inputState.moveX !== 0) {
      this.animationState = this.isSprinting ? 'sprinting' : 'walking';
    } else {
      this.animationState = 'idle';
    }
  }

  // --- COMBAT & DURABILITY ---

  public attackEntity(target: LivingEntity, camera: Camera): void {
      if (!this.canAttack()) return;

      const heldItem = this.inventory.getItem(this.activeHotbarSlot);
      const itemInfo = heldItem ? ItemRegistry.getItemInfo(heldItem.id) : null;
      
      let baseDamage = 1; // Fist damage
      if (itemInfo?.toolInfo?.type === 'sword') {
          baseDamage = itemInfo.toolInfo.damage || 4;
      } else if (itemInfo?.toolInfo) {
          baseDamage = 2; // Tools do reduced damage
      }
      
      const sprintMultiplier = this.isSprinting ? 1.5 : 1.0;
      const isCritical = !this.onGround && this.velocity.y > 0 && Math.random() < 0.2;
      const criticalMultiplier = isCritical ? 1.5 : 1.0;
      
      const finalDamage = Math.round(baseDamage * sprintMultiplier * criticalMultiplier);
      
      target.takeDamage(finalDamage, "Player", camera);
      
      if (heldItem && itemInfo?.toolInfo) {
          this.consumeDurability(heldItem, 1);
      }
      
      const knockbackDirection = Math.sign(target.position.x - this.position.x);
      const knockbackForce = this.isSprinting ? 8 : 5;
      target.velocity.x = knockbackDirection * knockbackForce;
      target.velocity.y = -4;
      
      if (isCritical) {
          for (let i = 0; i < 15; i++) { this.particles.push({ x: target.position.x + Math.random() * target.width, y: target.position.y + Math.random() * target.height, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 2, life: 20, color: '#f5d63d', size: Math.random() * 5 + 3 }); }
      }
      
      this.attackCooldown = 0.6;
  }

 private consumeDurability(item: Item, amount: number): void {
    if (this.gamemode === 'creative' || !item.durability) return;
    
    const itemInfo = ItemRegistry.getItemInfo(item.id);
    if (!itemInfo?.toolInfo) return;

    if (item.durability === undefined) {
      item.durability = itemInfo.toolInfo.durability;
    }
    
    item.durability -= amount;

    const maxDurability = itemInfo.toolInfo.durability;
    if (item.durability <= maxDurability * 0.1 && item.durability > 0) {
      this.actionCallback('showNotification', { message: `${itemInfo.name} is about to break!` });
      SoundManager.instance.playSound('item.break.warning');
    }
    
    if (item.durability <= 0) {
      this.inventory.setItem(this.activeHotbarSlot, null);
      SoundManager.instance.playSound('item.break');
      this.actionCallback('showNotification', { message: `${itemInfo.name} broke!` });
      
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: this.position.x + this.width / 2,
          y: this.position.y + this.height / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 3,
          life: 30,
          color: '#8B4513',
          size: 4
        });
      }
    }
  }

  public calculateArmorProtection(): number {
      let totalProtection = 0;
      for (let i = 0; i < ARMOR_SLOTS; i++) {
          const armorPiece = this.armorInventory.getItem(i);
          if (armorPiece) {
              const itemInfo = ItemRegistry.getItemInfo(armorPiece.id);
              if (itemInfo?.armorInfo) {
                  totalProtection += itemInfo.armorInfo.protection;
              }
          }
      }
      return Math.min(totalProtection, 20);
  }

  private damageArmor(amount: number): void {
      for (let i = 0; i < ARMOR_SLOTS; i++) {
          const armorPiece = this.armorInventory.getItem(i);
          if (armorPiece) {
              this.consumeArmorDurability(armorPiece, amount, i);
          }
      }
  }

  private consumeArmorDurability(item: Item, amount: number, slot: number): void {
    if (this.gamemode === 'creative') return;
      
    const itemInfo = ItemRegistry.getItemInfo(item.id);
     if (!itemInfo?.armorInfo) return;

    if (item.durability === undefined) {
        item.durability = itemInfo.armorInfo.durability;
    }
    
    item.durability -= amount;
    
    if (item.durability <= 0) {
        this.armorInventory.setItem(slot, null);
        SoundManager.instance.playSound('item.break');
        this.actionCallback('showNotification', { message: `${itemInfo.name} broke!` });
    }
  }

  public toData(): PlayerData {
      return {
          position: this.position,
          health: this.health,
          hunger: this.hunger,
          level: this.level,
          experience: this.experience,
          inventory: this.inventory.toData(),
          armorInventory: this.armorInventory.toData(),
          offhandInventory: this.offhandInventory.toData(),
      };
  }

  public fromData(data: PlayerData) {
      this.position = data.position;
      this.health = data.health;
      this.hunger = data.hunger;
      this.level = data.level;
      this.experience = data.experience;
      this.inventory.fromData(data.inventory);
      this.armorInventory.fromData(data.armorInventory);
      if (data.offhandInventory) {
        this.offhandInventory.fromData(data.offhandInventory);
      }
  }
}
