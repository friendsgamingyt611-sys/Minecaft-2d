import { Player } from './Player';
import { ChunkSystem } from '../world/ChunkSystem';
import { GRAVITY, PLAYER_FRICTION, BLOCK_SIZE, TERMINAL_VELOCITY, PLAYER_STEP_UP_FORCE } from '../core/Constants';
import { BlockId, Vector2 } from '../types';
import { getBlockType } from '../world/BlockRegistry';
import { ItemEntity } from './ItemEntity';

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

type PhysicsEntity = Player | ItemEntity;

export class PhysicsSystem {
  private world: ChunkSystem;

  constructor(world: ChunkSystem) {
    this.world = world;
  }

  applyGravity(entity: PhysicsEntity): void {
    if (entity instanceof Player && entity.isFlying) return;
    entity.velocity.y += GRAVITY;
    if (entity.velocity.y > TERMINAL_VELOCITY) {
        entity.velocity.y = TERMINAL_VELOCITY;
    }
  }

  applyFriction(entity: PhysicsEntity): void {
    entity.velocity.x *= PLAYER_FRICTION;
  }

  updatePositionAndCollision(entity: Player | ItemEntity) {
      const isPlayer = entity instanceof Player;
      
      entity.position.x += entity.velocity.x;
      this.resolveHorizontalCollisions(entity, isPlayer);

      entity.position.y += entity.velocity.y;
      const onGround = this.resolveVerticalCollisions(entity);
      
      if(isPlayer) {
        (entity as Player).justLanded = !(entity as Player).onGround && onGround;
        (entity as Player).onGround = onGround;
      } else {
        // FIX: Also set onGround status for ItemEntity.
        (entity as ItemEntity).onGround = onGround;
      }
  }

  public checkAABBCollision(rect1: Rect, rect2: Rect): boolean {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
  }

  private resolveVerticalCollisions(entity: PhysicsEntity): boolean {
    let onGround = false;
    const entityBounds = { x: entity.position.x, y: entity.position.y, width: entity.width, height: entity.height };
    
    const startX = Math.floor(entityBounds.x / BLOCK_SIZE);
    const endX = Math.floor((entityBounds.x + entityBounds.width) / BLOCK_SIZE);
    const startY = Math.floor(entityBounds.y / BLOCK_SIZE);
    const endY = Math.floor((entityBounds.y + entityBounds.height) / BLOCK_SIZE);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const blockType = getBlockType(this.world.getBlock(x, y));
            if (!blockType || !blockType.isSolid) continue;

            const blockRect = { x: x * BLOCK_SIZE, y: y * BLOCK_SIZE, width: BLOCK_SIZE, height: BLOCK_SIZE };
            if (!this.checkAABBCollision(entityBounds, blockRect)) continue;

            if (entity.velocity.y > 0) { // Moving down
                entity.position.y = blockRect.y - entity.height;
                entity.velocity.y = 0;
                onGround = true;
            } else if (entity.velocity.y < 0) { // Moving up
                entity.position.y = blockRect.y + blockRect.height;
                entity.velocity.y = 0;
            }
        }
    }
    return onGround;
  }

  private resolveHorizontalCollisions(entity: PhysicsEntity, isPlayer: boolean) {
    const entityBounds = { x: entity.position.x, y: entity.position.y, width: entity.width, height: entity.height };
    
    const startX = Math.floor(entityBounds.x / BLOCK_SIZE);
    const endX = Math.floor((entityBounds.x + entityBounds.width) / BLOCK_SIZE);
    const startY = Math.floor(entityBounds.y / BLOCK_SIZE);
    const endY = Math.floor((entityBounds.y + entityBounds.height) / BLOCK_SIZE);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const blockType = getBlockType(this.world.getBlock(x, y));
            if (!blockType || !blockType.isSolid) continue;

            const blockRect = { x: x * BLOCK_SIZE, y: y * BLOCK_SIZE, width: BLOCK_SIZE, height: BLOCK_SIZE };
            if (!this.checkAABBCollision(entityBounds, blockRect)) continue;

            // Try to step up if it's a player
            if (isPlayer && entity.velocity.y >= 0 && this.tryStepUp(entity as Player, x, y)) {
                return; // Stepped up, no need to resolve collision
            }

            if (entity.velocity.x > 0) { // Moving right
                entity.position.x = blockRect.x - entity.width;
                entity.velocity.x = 0;
            } else if (entity.velocity.x < 0) { // Moving left
                entity.position.x = blockRect.x + blockRect.width;
                entity.velocity.x = 0;
            }
        }
    }
  }

  private tryStepUp(player: Player, collisionX: number, collisionY: number): boolean {
    // Check if the collision is near the player's feet
    const playerBottom = player.position.y + player.height;
    const isFootCollision = collisionY * BLOCK_SIZE > playerBottom - BLOCK_SIZE - 1;

    if (!isFootCollision) return false;

    // Check if there's space above the block to step onto
    const blockAbove = this.world.getBlock(collisionX, collisionY - 1);
    const blockTypeAbove = getBlockType(blockAbove);
    if (blockTypeAbove && blockTypeAbove.isSolid) return false;

    // Check for headroom
    const blockHeadroom = this.world.getBlock(collisionX, collisionY - 2);
    const blockTypeHeadroom = getBlockType(blockHeadroom);
    if (blockTypeHeadroom && blockTypeHeadroom.isSolid) return false;
    
    // Perform step up with a small hop instead of teleporting
    player.velocity.y = -PLAYER_STEP_UP_FORCE;
    // Give a tiny horizontal nudge to clear the block corner
    player.position.x += Math.sign(player.velocity.x || player.facingDirection) * 2;
    
    return true;
  }
}