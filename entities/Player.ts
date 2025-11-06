import { Vector2, BlockId, Particle, Item, ItemId, GameMode, InputState, BlockType } from '../types';
import { ChunkSystem } from '../world/ChunkSystem';
import { 
    PLAYER_MOVE_SPEED, GRAVITY, PLAYER_JUMP_FORCE, PLAYER_FRICTION,
    PLAYER_WIDTH, PLAYER_HEIGHT, BLOCK_SIZE, HOTBAR_SLOTS, REACH_DISTANCE,
    PARTICLE_COUNT, PARTICLE_LIFESPAN, MAX_HEALTH, MAX_HUNGER, FALL_DAMAGE_START_BLOCKS,
    PLAYER_SPRINT_SPEED, PLAYER_SNEAK_SPEED, PLAYER_SNEAK_HEIGHT,
    TOOL_EFFECTIVENESS_MULTIPLIER, INCORRECT_TOOL_PENALTY, INVENTORY_SLOTS,
    ITEM_PICKUP_RADIUS, TOOL_TIER_SPEED_MAP, HOTBAR_SLOT_SIZE
} from '../core/Constants';
import { PhysicsSystem } from './PhysicsSystem';
import { getBlockType } from '../world/BlockRegistry';
import { Camera } from './Camera';
import { Inventory } from '../world/Inventory';
import { ItemEntity } from './ItemEntity';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { MouseHandler } from '../input/MouseHandler';
import { SettingsManager } from '../core/SettingsManager';
import { TouchHandler } from '../input/TouchHandler';

export class Player {
  public position: Vector2;
  private spawnPoint: Vector2;
  public velocity: Vector2 = { x: 0, y: 0 };
  
  public facingDirection: number = 1; // 1 for right, -1 for left
  
  private mouseHandler: MouseHandler;
  private touchHandler: TouchHandler;
  public world: ChunkSystem;
  private physics: PhysicsSystem;
  public onGround: boolean = false;
  private fallDistance: number = 0;
  public justLanded: boolean = false;
  
  public inventory: Inventory;
  public armorInventory: Inventory; // Not used yet
  
  public activeHotbarSlot: number = 0;
  public particles: Particle[] = [];

  public health: number = MAX_HEALTH;
  public hunger: number = MAX_HUNGER;
  public isDead: boolean = false;
  private timeSinceHungerTick: number = 0;
  private timeSinceHealthRegen: number = 0;

  public animationState: string = 'idle';
  public isSprinting: boolean = false;
  public isSneaking: boolean = false;
  public isMining: boolean = false;
  public breakingBlock: { x: number, y: number, progress: number } | null = null;
  public targetBlock: {x: number, y: number} | null = null;
  
  private actionCallback: (action: string, data: any) => void;

  public skinColor: string = '#c58c6b';
  public shirtColor: string = '#4ca7a7';
  public pantsColor: string = '#3a3a99';
  public hairColor: string = '#46301f';
  
  public gamemode: GameMode = 'survival';
  public isFlying: boolean = false;
  private lastJumpPressTime: number = 0;

  public headRotation: number = 0;
  public eyeOffset: Vector2 = { x: 0, y: 0 };
  
  // Blinking properties
  public isBlinking: boolean = false;
  private blinkCountdown: number = 3 + Math.random() * 4; // Time until next blink
  private blinkDurationTimer: number = 0;
  private readonly BLINK_DURATION = 0.15; // 150ms

  constructor(spawnPoint: Vector2, world: ChunkSystem, mouseHandler: MouseHandler, touchHandler: TouchHandler, physics: PhysicsSystem, actionCallback: (action: string, data: any) => void) {
    this.position = { ...spawnPoint };
    this.spawnPoint = { ...spawnPoint };
    this.mouseHandler = mouseHandler;
    this.touchHandler = touchHandler;
    this.world = world;
    this.physics = physics;
    this.inventory = new Inventory(INVENTORY_SLOTS);
    this.armorInventory = new Inventory(4);
    this.actionCallback = actionCallback;
    this.initializeInventory();
  }

  private initializeInventory() {
    this.inventory.setItem(0, {id: ItemId.WOODEN_AXE, count: 1});
    this.inventory.setItem(1, {id: ItemId.WOODEN_PICKAXE, count: 1});
    this.inventory.setItem(2, {id: ItemId.WOODEN_SHOVEL, count: 1});
  }
  
  public get width(): number { return PLAYER_WIDTH; }
  public get height(): number { return this.isSneaking ? PLAYER_SNEAK_HEIGHT : PLAYER_HEIGHT; }

  update(deltaTime: number, camera: Camera, inputState: InputState): void {
    if (this.isDead) return;

    this.updateTargeting(camera);
    this.handleInput(inputState);
    
    if (this.gamemode === 'creative' && this.isFlying) {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.onGround = false;
    } else {
        this.physics.applyGravity(this);
        this.physics.applyFriction(this);
        this.physics.updatePositionAndCollision(this);
    }
    
    this.handleFallDamage();
    this.handleBlockInteraction(inputState, camera);
    this.updateParticles();
    this.updateVitals(deltaTime);
    this.updateAnimationState(inputState);
    this.updateBlinking(deltaTime);
    this.updateEyeAndHeadDirection();
  }
  
  private updateEyeAndHeadDirection(): void {
    let targetEyeX = 0;
    let targetEyeY = 0;
    
    if (this.targetBlock) {
        const targetWorldX = (this.targetBlock.x + 0.5) * BLOCK_SIZE;
        const playerWorldX = this.position.x + this.width / 2;
        targetEyeX = (targetWorldX - playerWorldX) / REACH_DISTANCE;

        const targetWorldY = (this.targetBlock.y + 0.5) * BLOCK_SIZE;
        const playerWorldY = this.position.y + this.height * 0.2; // eye level
        targetEyeY = (targetWorldY - playerWorldY) / REACH_DISTANCE;
    } else {
        targetEyeX = this.facingDirection * 0.4;
    }

    // Clamp and smooth
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
  }

  public tryPickupItem(entity: ItemEntity): void {
    if (!entity.canBePickedUp()) return;

    const dx = (this.position.x + this.width / 2) - (entity.position.x + entity.width / 2);
    const dy = (this.position.y + this.height / 2) - (entity.position.y + entity.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ITEM_PICKUP_RADIUS) {
        const remainingItem = this.inventory.addItem(entity.item);
        if (remainingItem === null) {
            entity.collect();
        } else {
            entity.item.count = remainingItem.count;
        }
    }
  }

  private updateBlinking(deltaTime: number): void {
    if (this.isBlinking) {
        this.blinkDurationTimer += deltaTime;
        if (this.blinkDurationTimer >= this.BLINK_DURATION) {
            this.isBlinking = false;
            this.blinkDurationTimer = 0;
            this.blinkCountdown = 2 + Math.random() * 5; // Reset countdown for next blink
        }
    } else {
        this.blinkCountdown -= deltaTime;
        if (this.blinkCountdown <= 0) {
            this.isBlinking = true;
        }
    }
  }

  public checkLineOfSight(targetBlock: {x: number, y: number}): boolean {
    const startX = this.position.x + this.width / 2;
    const startY = this.position.y + this.height * 0.2; // Eye level
    const endX = (targetBlock.x + 0.5) * BLOCK_SIZE;
    const endY = (targetBlock.y + 0.5) * BLOCK_SIZE;

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Step roughly every half a block
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

        // Don't check collision with the target block itself
        if (blockX === targetBlock.x && blockY === targetBlock.y) continue;

        const block = this.world.getBlock(blockX, blockY);
        const blockType = getBlockType(block);
        if (blockType && blockType.isSolid) {
            return false; // Obstruction found
        }
    }
    return true;
  }

  private updateTargeting(camera: Camera): void {
      const controlScheme = SettingsManager.instance.getEffectiveControlScheme();
  
      if (controlScheme === 'keyboard') {
          // Continuous targeting for mouse
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
  
          if (distance <= REACH_DISTANCE && this.checkLineOfSight(candidateTarget)) {
              this.targetBlock = candidateTarget;
          } else {
              this.targetBlock = null;
          }
      } else { // 'touch' - Event-based "sticky" targeting
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
              } else { // It's air or non-solid, check for adjacent solid blocks
                  const neighbors = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
                  for (const n of neighbors) {
                      const neighborType = getBlockType(this.world.getBlock(blockX + n.x, blockY + n.y));
                      if (neighborType && neighborType.isSolid) {
                          canTarget = true;
                          break;
                      }
                  }
              }

              if (distance <= REACH_DISTANCE && canTarget && this.checkLineOfSight({ x: blockX, y: blockY })) {
                  this.targetBlock = { x: blockX, y: blockY };
              } else {
                  this.targetBlock = null;
              }
          }
      }
  }

  private handleInput(inputState: InputState): void {
    const speed = this.isSneaking ? PLAYER_SNEAK_SPEED : (this.isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_MOVE_SPEED);
    
    if (this.gamemode === 'creative' && this.isFlying) {
      this.velocity.x = inputState.moveX * speed;
      this.velocity.y = 0;
      if (inputState.jump.pressed) this.velocity.y = -speed;
      if (inputState.sneak) this.velocity.y = speed;
    } else {
      this.velocity.x = inputState.moveX * speed;
    }

    if (inputState.moveX !== 0) {
      this.facingDirection = Math.sign(inputState.moveX);
    }
    
    if (inputState.jump.justPressed) {
      if (this.gamemode === 'creative') {
        const now = Date.now();
        if (now - this.lastJumpPressTime < 300) { // Double tap for flight
          this.isFlying = !this.isFlying;
        }
        this.lastJumpPressTime = now;
      }
      if (this.onGround) {
        this.velocity.y = -PLAYER_JUMP_FORCE;
        this.onGround = false;
        this.justLanded = false;
        this.fallDistance = 0;
      }
    }

    this.isSneaking = inputState.sneak;
    this.isSprinting = inputState.sprint && !this.isSneaking && inputState.moveX !== 0 && this.onGround;

    if (inputState.inventory) {
      this.actionCallback('openInventory', {});
    }
  }

  private handleFallDamage(): void {
    if (this.velocity.y > 0 && !this.onGround) {
      this.fallDistance += this.velocity.y;
    }

    if (this.justLanded) {
      const fallBlocks = this.fallDistance / BLOCK_SIZE;
      if (fallBlocks > FALL_DAMAGE_START_BLOCKS) {
        const damage = Math.floor(fallBlocks - FALL_DAMAGE_START_BLOCKS + 1);
        this.takeDamage(damage);
      }
      this.fallDistance = 0;
      this.justLanded = false;
    }

    if (this.onGround && this.velocity.y === 0) {
      this.fallDistance = 0;
    }
  }
  
  public takeDamage(amount: number): void {
    if (this.gamemode === 'creative') return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }
  
  private die(): void {
    this.isDead = true;
  }
  
  private handleBlockInteraction(inputState: InputState, camera: Camera): void {
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
        let drop = blockType.itemDrop;

        if (blockType.id === BlockId.STONE) {
            const heldItem = this.inventory.getItem(this.activeHotbarSlot);
            const itemInfo = heldItem ? CraftingSystem.getItemInfo(heldItem.id) : null;
            const toolInfo = itemInfo ? itemInfo.toolInfo : null;
            if (toolInfo?.type !== 'pickaxe') {
                drop = undefined; // Drop nothing if not mined with a pickaxe
            }
        }
        
        this.world.setBlock(blockX, blockY, BlockId.AIR);
        if (drop && this.gamemode === 'survival') {
          const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
          this.actionCallback('breakBlock', { x: blockX, y: blockY, item: { id: drop.itemId, count } });
        }
        this.breakingBlock = null;
        this.isMining = false;
      }
    } else {
      this.breakingBlock = null;
      this.isMining = false;
    }

    if (inputState.place) {
      if (blockId === BlockId.CRAFTING_TABLE) {
        this.actionCallback('openCraftingTable', {});
        return;
      }
      if (blockId === BlockId.CHEST) {
        const chestInventory = this.world.getChestInventory(blockX, blockY);
        if (chestInventory) {
          this.actionCallback('openChest', { chestInventory });
        }
        return;
      }

      const heldItem = this.inventory.getItem(this.activeHotbarSlot);
      if (heldItem) {
        const itemInfo = CraftingSystem.getItemInfo(heldItem.id);
        if (itemInfo && itemInfo.blockId) {
          let placeX: number, placeY: number;
          const targetIsSolid = blockType && blockType.isSolid;

          if (!targetIsSolid) {
              // Target is an air block, place directly into it
              placeX = blockX;
              placeY = blockY;
          } else {
              // Target is a solid block, place adjacent to it
              const controlScheme = SettingsManager.instance.getEffectiveControlScheme();
              if (controlScheme === 'keyboard') {
                  const worldPos = camera.screenToWorld(this.mouseHandler.position);
                  const targetBlockCenterX = (blockX + 0.5) * BLOCK_SIZE;
                  const targetBlockCenterY = (blockY + 0.5) * BLOCK_SIZE;
                  const deltaX = worldPos.x - targetBlockCenterX;
                  const deltaY = worldPos.y - targetBlockCenterY;

                  if (Math.abs(deltaX) > Math.abs(deltaY)) {
                      placeX = blockX + (deltaX > 0 ? 1 : -1);
                      placeY = blockY;
                  } else {
                      placeX = blockX;
                      placeY = blockY + (deltaY > 0 ? 1 : -1);
                  }
              } else { // Touch
                  const playerCenter = { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 };
                  const targetCenter = { x: (blockX + 0.5) * BLOCK_SIZE, y: (blockY + 0.5) * BLOCK_SIZE };
                  const dx = playerCenter.x - targetCenter.x;
                  const dy = playerCenter.y - targetCenter.y;
                  
                  if (Math.abs(dx) > Math.abs(dy)) {
                      placeX = blockX + (dx > 0 ? -1 : 1);
                      placeY = blockY;
                  } else {
                      placeX = blockX;
                      placeY = blockY + (dy > 0 ? -1 : 1);
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
              }
          }
        }
      }
    }
  }

  private getMiningSpeed(blockType: BlockType): number {
    if (this.gamemode === 'creative') return Infinity;

    const heldItem = this.inventory.getItem(this.activeHotbarSlot);
    const itemInfo = heldItem ? CraftingSystem.getItemInfo(heldItem.id) : null;
    const toolInfo = itemInfo ? itemInfo.toolInfo : null;
    
    let speed = 1;
    let canMine = true;

    if (blockType.minToolTier) {
      const tiers = ['none', 'wood', 'stone', 'iron', 'diamond'];
      const requiredTierIndex = tiers.indexOf(blockType.minToolTier);
      const currentTierIndex = toolInfo ? tiers.indexOf(toolInfo.tier) : 0;
      if (currentTierIndex < requiredTierIndex) {
        canMine = false;
      }
    }
    
    if (!canMine) return 0.3; // Very slow if wrong tier

    if (toolInfo && toolInfo.type === blockType.toolType) {
        speed *= TOOL_TIER_SPEED_MAP[toolInfo.tier];
    } else if (blockType.toolType) {
        speed *= INCORRECT_TOOL_PENALTY;
    }
    
    return speed * TOOL_EFFECTIVENESS_MULTIPLIER;
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
      }
    }
  }

  private updateVitals(deltaTime: number): void {
    if (this.gamemode === 'creative') return;

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
    }
    
    if (this.hunger <= 0) {
      this.timeSinceHealthRegen += deltaTime;
      if (this.timeSinceHealthRegen > 2) {
        this.timeSinceHealthRegen = 0;
        this.takeDamage(1);
      }
    }
  }

  private updateAnimationState(inputState: InputState): void {
    if (this.isMining) {
      this.animationState = 'mining';
    } else if (!this.onGround && !this.isFlying) {
      // Differentiate between rising and falling
      this.animationState = this.velocity.y < 0 ? 'jumping' : 'falling';
    } else if (this.isSneaking) {
      this.animationState = 'sneaking';
    } else if (inputState.moveX !== 0) {
      this.animationState = this.isSprinting ? 'sprinting' : 'walking';
    } else {
      this.animationState = 'idle';
    }
  }
}