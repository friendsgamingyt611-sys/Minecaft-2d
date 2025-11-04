
import { Player } from './Player';
import { ChunkSystem } from '../world/ChunkSystem';
import { GRAVITY, PLAYER_FRICTION, BLOCK_SIZE } from '../core/Constants';
import { BlockId } from '../types';
import { getBlockType } from '../world/BlockRegistry';

export class PhysicsSystem {
  private world: ChunkSystem;

  constructor(world: ChunkSystem) {
    this.world = world;
  }

  applyGravity(player: Player): void {
    player.velocity.y += GRAVITY;
  }

  applyFriction(player: Player): void {
    player.velocity.x *= PLAYER_FRICTION;
  }

  updatePosition(player: Player, deltaTime: number): void {
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
  }

  checkCollision(player: Player): boolean {
    let onGround = false;
    const playerLeft = Math.floor(player.position.x / BLOCK_SIZE);
    const playerRight = Math.floor((player.position.x + player.width) / BLOCK_SIZE);
    const playerTop = Math.floor(player.position.y / BLOCK_SIZE);
    const playerBottom = Math.floor((player.position.y + player.height) / BLOCK_SIZE);

    for (let y = playerTop; y <= playerBottom; y++) {
      for (let x = playerLeft; x <= playerRight; x++) {
        const blockId = this.world.getBlock(x, y);
        const blockType = getBlockType(blockId);
        
        if (blockType && blockType.isSolid) {
          const blockTop = y * BLOCK_SIZE;
          const blockBottom = blockTop + BLOCK_SIZE;
          const blockLeft = x * BLOCK_SIZE;
          const blockRight = blockLeft + BLOCK_SIZE;

          // Resolve collision
          const playerPrevBottom = (player.position.y + player.height) - player.velocity.y;
          if (player.velocity.y >= 0 && playerPrevBottom <= blockTop) { // Downward collision
            player.position.y = blockTop - player.height;
            player.velocity.y = 0;
            onGround = true;
          }
          
          const playerPrevTop = player.position.y - player.velocity.y;
          if(player.velocity.y < 0 && playerPrevTop >= blockBottom) { // Upward collision
            player.position.y = blockBottom;
            player.velocity.y = 0;
          }

          const playerPrevRight = (player.position.x + player.width) - player.velocity.x;
          if(player.velocity.x > 0 && playerPrevRight <= blockLeft) { // Rightward collision
            player.position.x = blockLeft - player.width;
            player.velocity.x = 0;
          }

          const playerPrevLeft = player.position.x - player.velocity.x;
          if(player.velocity.x < 0 && playerPrevLeft >= blockRight) { // Leftward collision
            player.position.x = blockRight;
            player.velocity.x = 0;
          }
        }
      }
    }
    return onGround;
  }
}
