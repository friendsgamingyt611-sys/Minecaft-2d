
import { Vector2, BlockId, Particle } from '../types';
import { InputManager } from '../input/InputManager';
import { ChunkSystem } from '../world/ChunkSystem';
import { 
    PLAYER_MOVE_SPEED, GRAVITY, PLAYER_JUMP_FORCE, PLAYER_FRICTION,
    PLAYER_WIDTH, PLAYER_HEIGHT, BLOCK_SIZE, HOTBAR_SLOTS, REACH_DISTANCE,
    PARTICLE_COUNT, PARTICLE_LIFESPAN
} from '../core/Constants';
import { PhysicsSystem } from './PhysicsSystem';
import { getBlockType } from '../world/BlockRegistry';
import { Camera } from './Camera';

export class Player {
  public position: Vector2;
  public velocity: Vector2 = { x: 0, y: 0 };
  public width: number = PLAYER_WIDTH;
  public height: number = PLAYER_HEIGHT;
  
  private inputManager: InputManager;
  private world: ChunkSystem;
  private physics: PhysicsSystem;
  private onGround: boolean = false;

  public hotbar: (BlockId | null)[] = new Array(HOTBAR_SLOTS).fill(null);
  public activeHotbarSlot: number = 0;
  
  public particles: Particle[] = [];

  constructor(x: number, y: number, inputManager: InputManager, world: ChunkSystem) {
    this.position = { x, y };
    this.inputManager = inputManager;
    this.world = world;
    this.physics = new PhysicsSystem(this.world);
    this.initializeInventory();
  }

  private initializeInventory() {
    this.hotbar[0] = BlockId.GRASS;
    this.hotbar[1] = BlockId.DIRT;
    this.hotbar[2] = BlockId.STONE;
    this.hotbar[3] = BlockId.OAK_LOG;
    this.hotbar[4] = BlockId.OAK_LEAVES;
  }
  
  update(deltaTime: number, mousePosition: Vector2, camera: Camera): void {
    this.handleInput();
    this.physics.applyGravity(this);
    this.physics.applyFriction(this);
    this.physics.updatePosition(this, deltaTime);
    this.onGround = this.physics.checkCollision(this);
    this.handleBlockInteraction(mousePosition, camera);
    this.updateParticles();
  }
  
  private handleInput(): void {
    if (this.inputManager.isKeyDown('a') || this.inputManager.isKeyDown('arrowleft')) {
      this.velocity.x = -PLAYER_MOVE_SPEED;
    } else if (this.inputManager.isKeyDown('d') || this.inputManager.isKeyDown('arrowright')) {
      this.velocity.x = PLAYER_MOVE_SPEED;
    }

    if ((this.inputManager.isKeyDown('w') || this.inputManager.isKeyDown(' ') || this.inputManager.isKeyDown('arrowup')) && this.onGround) {
      this.velocity.y = -PLAYER_JUMP_FORCE;
    }

    for (let i = 1; i <= HOTBAR_SLOTS; i++) {
        if (this.inputManager.isKeyDown(i.toString())) {
            this.activeHotbarSlot = i - 1;
        }
    }
  }
  
  private handleBlockInteraction(mousePosition: Vector2, camera: Camera): void {
    const worldMouseX = mousePosition.x + camera.position.x;
    const worldMouseY = mousePosition.y + camera.position.y;
    
    const blockX = Math.floor(worldMouseX / BLOCK_SIZE);
    const blockY = Math.floor(worldMouseY / BLOCK_SIZE);
    
    const playerCenterX = this.position.x + this.width / 2;
    const playerCenterY = this.position.y + this.height / 2;
    const distance = Math.sqrt(Math.pow(worldMouseX - playerCenterX, 2) + Math.pow(worldMouseY - playerCenterY, 2));

    if (distance > REACH_DISTANCE) return;

    if (this.inputManager.isKeyDown('mouse0')) { // left click
      const currentBlock = this.world.getBlock(blockX, blockY);
      if (currentBlock !== BlockId.AIR) {
          const blockType = getBlockType(currentBlock);
          if (!blockType?.isIndestructible) {
              this.createBlockParticles(blockX, blockY, blockType?.color || '#fff');
              this.world.setBlock(blockX, blockY, BlockId.AIR);
          }
      }
    } else if (this.inputManager.isKeyDown('mouse2')) { // right click
        const selectedBlock = this.hotbar[this.activeHotbarSlot];
        if (selectedBlock !== null) {
            const currentBlock = this.world.getBlock(blockX, blockY);
            if (currentBlock === BlockId.AIR) {
                this.world.setBlock(blockX, blockY, selectedBlock);
            }
        }
    }
  }
  
  private createBlockParticles(blockX: number, blockY: number, color: string): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        this.particles.push({
            x: (blockX + 0.5) * BLOCK_SIZE,
            y: (blockY + 0.5) * BLOCK_SIZE,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: PARTICLE_LIFESPAN,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
  }

  private updateParticles(): void {
      this.particles.forEach((p, index) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += GRAVITY * 0.1;
          p.life--;
          if (p.life <= 0) {
              this.particles.splice(index, 1);
          }
      });
  }
}
