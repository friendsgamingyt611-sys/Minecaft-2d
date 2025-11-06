
import { Player } from './Player';
import { ChunkSystem } from '../world/ChunkSystem';
import { GRAVITY, PLAYER_FRICTION, BLOCK_SIZE, TERMINAL_VELOCITY } from '../core/Constants';
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

            // Player-specific step-up logic
            if (isPlayer) {
                const player = entity as Player;
                const playerBottom = player.position.y + player.height;
                const blockTop = blockRect.y;

                // Check if it's a short obstacle at the player's feet while they are on the ground.
                if (player.onGround && (playerBottom > blockTop) && (playerBottom < blockTop + BLOCK_SIZE + 1)) {
                    // Check for clearance above the step.
                    const blockAbove = getBlockType(this.world.getBlock(x, y - 1));
                    const blockHeadroom = getBlockType(this.world.getBlock(x, y - 2));

                    if ((!blockAbove || !blockAbove.isSolid) && (!blockHeadroom || !blockHeadroom.isSolid)) {
                        // Perform step-up by teleporting.
                        player.position.y = blockRect.y - player.height;
                        // Nudge player slightly forward to prevent re-collision
                        player.position.x += player.velocity.x > 0 ? 1 : -1; 
                        // Update bounds for subsequent checks and skip normal resolution for this block
                        entityBounds.x = player.position.x;
                        entityBounds.y = player.position.y;
                        continue; 
                    }
                }
            }

            // Standard collision resolution if not stepping up.
            // This is now position-based to prevent getting stuck when velocity.x is 0.
            const entityCenterX = entityBounds.x + entityBounds.width / 2;
            const blockCenterX = blockRect.x + blockRect.width / 2;
            
            if (entityCenterX < blockCenterX) { // Player is left of block center, push left.
                entity.position.x = blockRect.x - entity.width;
            } else { // Player is right of block center, push right.
                entity.position.x = blockRect.x + blockRect.width;
            }
            entity.velocity.x = 0;
            // Update bounds for next iteration in this frame's collision checks.
            entityBounds.x = entity.position.x;
        }
    }
  }
}
