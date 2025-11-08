
import { BlockId, Vector2, ChunkData, BlockEntityData } from '../types';
import { CHUNK_SIZE, BLOCK_SIZE, VIEW_DISTANCE_CHUNKS, CHUNK_PIXEL_SIZE, CHEST_SLOTS, FURNACE_INPUT_SLOT, FURNACE_FUEL_SLOT, FURNACE_OUTPUT_SLOT } from '../core/Constants';
import { WorldGenerator } from './WorldGenerator';
import { getBlockType } from './BlockRegistry';
import { Inventory } from './Inventory';
import { SmeltingSystem } from '../systems/SmeltingSystem';

// FIX: Define a type for the live block entity data to distinguish it from the serialized BlockEntityData.
// This avoids type errors when using Inventory class instances in memory.
type LiveBlockEntityData = Omit<BlockEntityData, 'inventory'> & {
  inventory?: Inventory;
};

class Chunk {
  public blocks: Uint8Array;
  public chunkX: number;
  public chunkY: number;
  // FIX: Use the LiveBlockEntityData type for the in-memory map.
  public blockEntities: Map<string, LiveBlockEntityData> = new Map();
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
    const blockType = getBlockType(blockId);

    if (blockType?.isBlockEntity) {
        if (!this.blockEntities.has(key)) {
            let inventorySize = 0;
            if (blockId === BlockId.CHEST) inventorySize = CHEST_SLOTS;
            if (blockId === BlockId.FURNACE || blockId === BlockId.FURNACE_LIT) inventorySize = 3;
            
            this.blockEntities.set(key, { 
                inventory: new Inventory(inventorySize),
                smeltTime: 0,
                fuelTime: 0,
                maxFuelTime: 0
            });
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

  // FIX: Update the return type to reflect the in-memory data structure.
  getBlockEntity(worldX: number, worldY: number): LiveBlockEntityData | undefined {
      const chunkX = Math.floor(worldX / CHUNK_SIZE);
      const chunkY = Math.floor(worldY / CHUNK_SIZE);
      const localX = worldX - chunkX * CHUNK_SIZE;
      const localY = worldY - chunkY * CHUNK_SIZE;
      return this.getChunk(chunkX, chunkY).getBlockEntity(localX, localY);
  }

  getChestInventory(worldX: number, worldY: number): Inventory | null {
      const entity = this.getBlockEntity(worldX, worldY);
      return entity?.inventory ? entity.inventory : null;
  }
  
  updateBlockEntities(deltaTime: number) {
      for (const chunk of this.chunks.values()) {
          for (const [key, entity] of chunk.blockEntities.entries()) {
              const [localX, localY] = key.split(',').map(Number);
              const blockId = chunk.getBlock(localX, localY);
              if (blockId === BlockId.FURNACE || blockId === BlockId.FURNACE_LIT) {
                  this.updateFurnace(chunk, localX, localY, entity, deltaTime);
              }
          }
      }
  }
  
  // FIX: Update the entity parameter type to LiveBlockEntityData.
  private updateFurnace(chunk: Chunk, localX: number, localY: number, entity: LiveBlockEntityData, deltaTime: number) {
      const inventory = entity.inventory!;
      const input = inventory.getItem(FURNACE_INPUT_SLOT);
      const fuel = inventory.getItem(FURNACE_FUEL_SLOT);
      const output = inventory.getItem(FURNACE_OUTPUT_SLOT);
      const recipe = input ? SmeltingSystem.getSmeltingResult(input.id) : null;
      let needsUpdate = false;

      if (entity.fuelTime > 0) {
          entity.fuelTime -= deltaTime;
          if (chunk.getBlock(localX, localY) !== BlockId.FURNACE_LIT) {
              chunk.setBlock(localX, localY, BlockId.FURNACE_LIT);
          }
      } else {
          if (chunk.getBlock(localX, localY) === BlockId.FURNACE_LIT) {
              chunk.setBlock(localX, localY, BlockId.FURNACE);
          }
      }

      if (recipe && (!output || (output.id === recipe.result.id && output.count < 64))) {
          if (entity.fuelTime <= 0 && fuel) {
              const burnTime = SmeltingSystem.getFuelBurnTime(fuel.id);
              if (burnTime > 0) {
                  entity.fuelTime = burnTime;
                  entity.maxFuelTime = burnTime;
                  inventory.removeItem(FURNACE_FUEL_SLOT, 1);
                  needsUpdate = true;
              }
          }

          if (entity.fuelTime > 0) {
              entity.smeltTime += deltaTime;
              if (entity.smeltTime >= recipe.cookTime) {
                  entity.smeltTime = 0;
                  inventory.removeItem(FURNACE_INPUT_SLOT, 1);
                  if (output) {
                      output.count += recipe.result.count;
                  } else {
                      inventory.setItem(FURNACE_OUTPUT_SLOT, { ...recipe.result });
                  }
                  needsUpdate = true;
              }
          } else {
              entity.smeltTime = 0;
          }
      } else {
          entity.smeltTime = 0;
      }
      
      if(needsUpdate) chunk.isModified = true;
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
              const blockEntitiesData = Array.from(chunk.blockEntities.entries()).map(([posKey, entity]): [string, BlockEntityData] => {
                  return [posKey, { 
                      inventory: entity.inventory?.toData(),
                      smeltTime: entity.smeltTime,
                      fuelTime: entity.fuelTime,
                      maxFuelTime: entity.maxFuelTime,
                  }];
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
                const blockId = chunk.getBlock(...posKey.split(',').map(Number) as [number, number]);
                let inventorySize = 0;
                if (blockId === BlockId.CHEST) inventorySize = CHEST_SLOTS;
                if (blockId === BlockId.FURNACE || blockId === BlockId.FURNACE_LIT) inventorySize = 3;

                const inventory = new Inventory(inventorySize);
                if (entityData.inventory) inventory.fromData(entityData.inventory);

                chunk.blockEntities.set(posKey, { 
                    inventory,
                    smeltTime: entityData.smeltTime || 0,
                    fuelTime: entityData.fuelTime || 0,
                    maxFuelTime: entityData.maxFuelTime || 0
                });
            });
          }

          this.chunks.set(key, chunk);
      }
  }
}
