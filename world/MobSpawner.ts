import { ChunkSystem } from './ChunkSystem';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/mobs/Zombie';
import { BLOCK_SIZE, CHUNK_SIZE } from '../core/Constants';
import { getBlockType } from './BlockRegistry';
import { BlockId } from '../types';
import { LivingEntity } from '../entities/LivingEntity';

export class MobSpawner {
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 10; // seconds
  private readonly MAX_MOBS_PER_CHUNK = 8;
  private readonly MIN_SPAWN_DISTANCE = BLOCK_SIZE * 12;
  private readonly MAX_SPAWN_DISTANCE = BLOCK_SIZE * 32;
  
  constructor(private world: ChunkSystem) {}
  
  public update(deltaTime: number, player: Player, mobs: LivingEntity[], worldTime: number): void {
    this.spawnTimer += deltaTime;
    
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.attemptSpawn(player, mobs, worldTime);
    }
  }
  
  private attemptSpawn(player: Player, mobs: LivingEntity[], worldTime: number): void {
    const isNight = worldTime > 13000 && worldTime < 23000;
    if (!isNight) {
        return;
    }

    const nearbyMobs = mobs.filter(mob => {
      const dx = mob.position.x - player.position.x;
      const dy = mob.position.y - player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < this.MAX_SPAWN_DISTANCE * 2;
    });
    
    if (nearbyMobs.length >= this.MAX_MOBS_PER_CHUNK) {
      return; // Too many mobs nearby
    }
    
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.MIN_SPAWN_DISTANCE + Math.random() * (this.MAX_SPAWN_DISTANCE - this.MIN_SPAWN_DISTANCE);
      
      const spawnX = player.position.x + Math.cos(angle) * distance;
      const spawnY = player.position.y + Math.sin(angle) * distance;
      
      const blockX = Math.floor(spawnX / BLOCK_SIZE);
      const blockY = Math.floor(spawnY / BLOCK_SIZE);
      
      if (this.canSpawnAt(blockX, blockY)) {
        const newMob = new Zombie({ x: spawnX, y: blockY * BLOCK_SIZE });
        mobs.push(newMob);
        break;
      }
    }
  }
  
  private canSpawnAt(x: number, y: number): boolean {
    const blockBelow = this.world.getBlock(x, y + 1);
    const blockBelowType = getBlockType(blockBelow);
    if (!blockBelowType || !blockBelowType.isSolid) {
      return false;
    }
    
    const blockAtPos = this.world.getBlock(x, y);
    const blockAbove = this.world.getBlock(x, y - 1);
    
    if (blockAtPos !== BlockId.AIR || blockAbove !== BlockId.AIR) {
      return false;
    }
    
    const surfaceHeight = this.world.generator.getSurfaceHeight(x);
    if (y <= surfaceHeight + 2) {
      return false; 
    }
    
    return true;
  }
}