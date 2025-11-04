
import { TerrainNoise } from './TerrainNoise';
import { CHUNK_SIZE } from '../core/Constants';
import { BlockId } from '../types';

export class WorldGenerator {
  private noise: TerrainNoise;

  constructor(seed: string) {
    this.noise = new TerrainNoise(this.cyrb128(seed));
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

  public getTerrainHeight(x: number): number {
      const baseHeight = 64;
      const amplitude = 16;
      const frequency = 0.02;
      return Math.floor(baseHeight + this.noise.perlin(x * frequency) * amplitude);
  }

  public generateChunk(chunk: any) { // Using any to avoid circular dep, should be Chunk
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const worldX = chunk.chunkX * CHUNK_SIZE + x;
      const terrainHeight = this.getTerrainHeight(worldX);

      for (let y = 0; y < CHUNK_SIZE; y++) {
        const worldY = chunk.chunkY * CHUNK_SIZE + y;

        if (worldY > terrainHeight + 40) { // Deep stone
            chunk.setBlock(x, y, BlockId.STONE);
        } else if (worldY > terrainHeight) {
            chunk.setBlock(x, y, BlockId.DIRT);
        } else if (worldY === terrainHeight) {
            chunk.setBlock(x, y, BlockId.GRASS);
        }
        
        // Add stone layer
        if (worldY > terrainHeight + 3) {
            chunk.setBlock(x, y, BlockId.STONE);
        }

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
      const terrainHeight = this.getTerrainHeight(worldX);
      const worldY = chunk.chunkY * CHUNK_SIZE;
      
      if (worldY <= terrainHeight && worldY + CHUNK_SIZE > terrainHeight) {
        if (this.noise.random() < 0.1) { // 10% chance to spawn a tree
            const localY = terrainHeight - worldY;
            this.generateTree(chunk, x, localY - 1);
        }
      }
    }
  }

  private generateTree(chunk: any, x: number, y: number) {
      const trunkHeight = 4 + Math.floor(this.noise.random() * 3);
      // Place trunk
      for (let i = 0; i < trunkHeight; i++) {
          chunk.setBlock(x, y - i, BlockId.OAK_LOG);
      }
      
      // Place leaves
      const canopyRadius = 2;
      const topY = y - trunkHeight;
      for (let ly = -canopyRadius; ly <= canopyRadius; ly++) {
          for (let lx = -canopyRadius; lx <= canopyRadius; lx++) {
              if (lx * lx + ly * ly <= canopyRadius * canopyRadius + 1) {
                  if (chunk.getBlock(x + lx, topY + ly) === BlockId.AIR) {
                    chunk.setBlock(x + lx, topY + ly, BlockId.OAK_LEAVES);
                  }
              }
          }
      }
  }
}
