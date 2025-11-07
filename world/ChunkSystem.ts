

import { BlockId, Vector2, ChunkData } from '../types';
import { CHUNK_SIZE, BLOCK_SIZE, VIEW_DISTANCE_CHUNKS, CHUNK_PIXEL_SIZE, CHEST_SLOTS } from '../core/Constants';
import { WorldGenerator } from './WorldGenerator';
import { getBlockType } from './BlockRegistry';
import { Inventory } from './Inventory';

class Chunk {
  public blocks: Uint8Array;
  public chunkX: number;
  public chunkY: number;
  public blockEntities: Map<string, any> = new Map();
  public isModified: boolean = false;

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
    this.isModified = true;
    
    const key = `${localX},${localY}`;
    if (blockId === BlockId.CHEST) {
        if (!this.blockEntities.has(key)) {
            this.blockEntities.set(key, { inventory: new Inventory(CHEST_SLOTS) });
        }
    } else {
        this.blockEntities.delete(key);
    }
  }

  getBlockEntity(localX: number, localY: number) {
      return this.blockEntities.get(`${localX},${localY}`);
  }
}

export class ChunkSystem {
  private chunks: Map<string, Chunk> = new Map();
  public generator: WorldGenerator;

  constructor(seed: string) {
    this.generator = new WorldGenerator(seed);
  }
  
  getSpawnPoint(): Vector2 {
    const surfaceY = this.generator.getSurfaceHeight(0);
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

  getChestInventory(worldX: number, worldY: number): Inventory | null {
      const chunkX = Math.floor(worldX / CHUNK_SIZE);
      const chunkY = Math.floor(worldY / CHUNK_SIZE);
      const localX = worldX - chunkX * CHUNK_SIZE;
      const localY = worldY - chunkY * CHUNK_SIZE;
      const chunk = this.getChunk(chunkX, chunkY);
      const entity = chunk.getBlockEntity(localX, localY);
      return entity ? entity.inventory : null;
  }

  update(playerPosition: Vector2) {
    const playerChunkX = Math.floor(playerPosition.x / CHUNK_PIXEL_SIZE);
    const playerChunkY = Math.floor(playerPosition.y / CHUNK_PIXEL_SIZE);

    for (let y = playerChunkY - VIEW_DISTANCE_CHUNKS; y <= playerChunkY + VIEW_DISTANCE_CHUNKS; y++) {
      for (let x = playerChunkX - VIEW_DISTANCE_CHUNKS; x <= playerChunkX + VIEW_DISTANCE_CHUNKS; x++) {
        this.getChunk(x, y);
      }
    }
    
    for (const key of this.chunks.keys()) {
        const [chunkX, chunkY] = key.split(',').map(Number);
        const distanceX = Math.abs(playerChunkX - chunkX);
        const distanceY = Math.abs(playerChunkY - chunkY);
        if (distanceX > VIEW_DISTANCE_CHUNKS + 2 || distanceY > VIEW_DISTANCE_CHUNKS + 2) {
            this.chunks.delete(key);
        }
    }
  }
  
  public toData(): [string, ChunkData][] {
      const modifiedChunks: [string, ChunkData][] = [];
      for (const [key, chunk] of this.chunks.entries()) {
          if (chunk.isModified) {
              // FIX: Explicitly type the return of the map to ensure it's a tuple [string, any], not (string | object)[].
              const blockEntitiesData = Array.from(chunk.blockEntities.entries()).map(([posKey, entity]): [string, any] => {
                  return [posKey, { inventory: entity.inventory.toData() }];
              });

              modifiedChunks.push([key, {
                  blocks: Array.from(chunk.blocks),
                  blockEntities: blockEntitiesData,
              }]);
          }
      }
      return modifiedChunks;
  }

  public fromData(data: [string, ChunkData][]) {
      if (!data) return;
      for (const [key, chunkData] of data) {
          const [chunkX, chunkY] = key.split(',').map(Number);
          const chunk = new Chunk(chunkX, chunkY);
          chunk.blocks = new Uint8Array(chunkData.blocks);
          chunk.isModified = true;

          if (chunkData.blockEntities) {
            chunkData.blockEntities.forEach(([posKey, entityData]) => {
                const inventory = new Inventory(CHEST_SLOTS);
                inventory.fromData(entityData.inventory);
                chunk.blockEntities.set(posKey, { inventory });
            });
          }

          this.chunks.set(key, chunk);
      }
  }
}