
import { BlockId, Vector2 } from '../types';
import { CHUNK_SIZE, BLOCK_SIZE } from '../core/Constants';
import { WorldGenerator } from './WorldGenerator';
import { getBlockType } from './BlockRegistry';

class Chunk {
  public blocks: Uint8Array;
  public chunkX: number;
  public chunkY: number;

  constructor(chunkX: number, chunkY: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE).fill(BlockId.AIR);
  }

  getBlock(localX: number, localY: number): BlockId {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return BlockId.AIR;
    }
    return this.blocks[localY * CHUNK_SIZE + localX];
  }

  setBlock(localX: number, localY: number, blockId: BlockId) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return;
    }
    this.blocks[localY * CHUNK_SIZE + localX] = blockId;
  }
}

export class ChunkSystem {
  private chunks: Map<string, Chunk> = new Map();
  private generator: WorldGenerator;

  constructor(seed: string) {
    this.generator = new WorldGenerator(seed);
  }
  
  getSpawnPoint(): Vector2 {
    const surfaceY = this.generator.getTerrainHeight(0);
    return { x: 0, y: (surfaceY - 2) * BLOCK_SIZE };
  }

  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = this.getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generateChunk(chunkX, chunkY);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }
  
  private generateChunk(chunkX: number, chunkY: number): Chunk {
    const chunk = new Chunk(chunkX, chunkY);
    this.generator.generateChunk(chunk);
    return chunk;
  }

  getBlock(worldX: number, worldY: number): BlockId {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = worldX - chunkX * CHUNK_SIZE;
    const localY = worldY - chunkY * CHUNK_SIZE;
    
    const chunk = this.getChunk(chunkX, chunkY);
    return chunk.getBlock(localX, localY);
  }

  setBlock(worldX: number, worldY: number, blockId: BlockId): void {
    const blockType = getBlockType(this.getBlock(worldX, worldY));
    if (blockType?.isIndestructible) return;

    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = worldX - chunkX * CHUNK_SIZE;
    const localY = worldY - chunkY * CHUNK_SIZE;

    const chunk = this.getChunk(chunkX, chunkY);
    chunk.setBlock(localX, localY, blockId);
  }

  update(playerPosition: Vector2) {
    // Future: Implement chunk loading/unloading logic here
  }
}
