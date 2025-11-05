

import { TerrainNoise } from './TerrainNoise';
import { CHUNK_SIZE } from '../core/Constants';
import { BlockId, Biome, BiomeId } from '../types';
import { getBiomeType } from './BiomeRegistry';

export class WorldGenerator {
  private noise: TerrainNoise;
  private biomeNoise: TerrainNoise;

  constructor(seed: string) {
    const seedArray = this.cyrb128(seed);
    this.noise = new TerrainNoise(seedArray);
    this.biomeNoise = new TerrainNoise(seedArray.map(s => s ^ 0xdeadbeef));
  }
  
  private cyrb128(str: string) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
  }

  public getBiome(x: number): Biome {
    const biomeValue = this.biomeNoise.perlin(x * 0.005); // Use a low frequency for large biomes
    if (biomeValue < 0.5) {
      return getBiomeType(BiomeId.PLAINS)!;
    } else {
      return getBiomeType(BiomeId.FOREST)!;
    }
  }

  public getSurfaceHeight(x: number): number {
    const biome = this.getBiome(x);
    const frequency = 0.02;
    return Math.floor(biome.baseHeight + this.noise.perlin(x * frequency) * biome.amplitude);
  }

  private generateOres(chunk: any, x: number, y: number, worldY: number) {
      if (chunk.getBlock(x,y) !== BlockId.STONE) return;
      
      const oreNoise = this.noise.perlin( (chunk.chunkX * CHUNK_SIZE + x) * 0.1) + this.noise.perlin(worldY * 0.1);

      // Coal
      if (worldY > 5 && worldY < 128 && oreNoise > 0.6) {
        if(this.noise.random() < 0.05) chunk.setBlock(x,y, BlockId.COAL_ORE);
      }
      // Iron
      if (worldY > 5 && worldY < 64 && oreNoise > 0.7) {
        if(this.noise.random() < 0.02) chunk.setBlock(x,y, BlockId.IRON_ORE);
      }
      // Diamond
      if (worldY > 5 && worldY < 16 && oreNoise > 0.85) {
        if(this.noise.random() < 0.008) chunk.setBlock(x,y, BlockId.DIAMOND_ORE);
      }
  }

  public generateChunk(chunk: any) { // Using any to avoid circular dep, should be Chunk
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const worldX = chunk.chunkX * CHUNK_SIZE + x;
      const terrainHeight = this.getSurfaceHeight(worldX);
      const biome = this.getBiome(worldX);

      for (let y = 0; y < CHUNK_SIZE; y++) {
        const worldY = chunk.chunkY * CHUNK_SIZE + y;

        if (worldY > terrainHeight + 40) { // Deep stone
            chunk.setBlock(x, y, BlockId.STONE);
        } else if (worldY > terrainHeight) {
            chunk.setBlock(x, y, biome.subSurfaceBlock);
        } else if (worldY === terrainHeight) {
            chunk.setBlock(x, y, biome.surfaceBlock);
        }
        
        // Add stone layer
        if (worldY > terrainHeight + 3) {
            chunk.setBlock(x, y, BlockId.STONE);
        }

        // Generate Ores
        this.generateOres(chunk, x, y, worldY);

        // Add bedrock layer
        const bedrockLevel = 127;
        if(worldY >= bedrockLevel) {
            chunk.setBlock(x, y, BlockId.BEDROCK);
        }
      }
    }
    
    // Generate trees after terrain
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const worldX = chunk.chunkX * CHUNK_SIZE + x;
      const terrainHeight = this.getSurfaceHeight(worldX);
      const worldY = chunk.chunkY * CHUNK_SIZE;
      const biome = this.getBiome(worldX);
      
      if (worldY <= terrainHeight && worldY + CHUNK_SIZE > terrainHeight) {
        if (this.noise.random() < biome.treeFrequency) { // Use biome tree frequency
            const localY = terrainHeight - worldY;
            if(chunk.getBlock(x, localY) === biome.surfaceBlock) {
                const treeType = biome.treeTypes[Math.floor(this.noise.random() * biome.treeTypes.length)];
                this.generateTree(chunk, x, localY - 1, treeType);
            }
        }
      }
    }
  }

  private generateTree(chunk: any, x: number, y: number, type: 'oak'|'spruce'|'birch') {
      const trunkHeight = 4 + Math.floor(this.noise.random() * 3);

      let logId = BlockId.OAK_LOG;
      let leafId = BlockId.OAK_LEAVES;
      if (type === 'spruce') {
          logId = BlockId.SPRUCE_LOG;
          leafId = BlockId.SPRUCE_LEAVES;
      } else if (type === 'birch') {
          logId = BlockId.BIRCH_LOG;
          leafId = BlockId.BIRCH_LEAVES;
      }

      // Place trunk
      for (let i = 0; i < trunkHeight; i++) {
          chunk.setBlock(x, y - i, logId);
      }
      
      // Place leaves
      const canopyRadius = 2;
      const topY = y - trunkHeight;
      for (let ly = -canopyRadius; ly <= canopyRadius; ly++) {
          for (let lx = -canopyRadius; lx <= canopyRadius; lx++) {
              if (lx * lx + ly * ly <= canopyRadius * canopyRadius + 0.5) {
                  const block = chunk.getBlock(x + lx, topY + ly);
                  if (block === BlockId.AIR || block === undefined) {
                    chunk.setBlock(x + lx, topY + ly, leafId);
                  }
              }
          }
      }
  }
}
