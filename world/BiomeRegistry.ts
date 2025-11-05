
import { Biome, BiomeId, BlockId } from '../types';

const BIOMES: Biome[] = [
  {
    id: BiomeId.PLAINS,
    name: 'Plains',
    baseHeight: 64,
    amplitude: 8,
    surfaceBlock: BlockId.GRASS,
    subSurfaceBlock: BlockId.DIRT,
    treeFrequency: 0.02, // Lower tree frequency
    treeTypes: ['oak'],
  },
  {
    id: BiomeId.FOREST,
    name: 'Forest',
    baseHeight: 68,
    amplitude: 16, // More hilly
    surfaceBlock: BlockId.GRASS,
    subSurfaceBlock: BlockId.DIRT,
    treeFrequency: 0.25, // Much higher tree frequency
    treeTypes: ['oak', 'birch'],
  },
];

const biomeRegistry = new Map<BiomeId, Biome>();
BIOMES.forEach(biome => biomeRegistry.set(biome.id, biome));

export function getBiomeType(id: BiomeId): Biome | undefined {
  return biomeRegistry.get(id);
}
