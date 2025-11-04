
export interface Vector2 {
  x: number;
  y: number;
}

export enum BlockId {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  BEDROCK = 4,
  OAK_LOG = 5,
  OAK_LEAVES = 6,
}

export interface BlockType {
  id: BlockId;
  name: string;
  color: string;
  isSolid: boolean;
  isIndestructible?: boolean;
  texture?: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;
}

export interface GameStateOptions {
    worldSeed: string;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}
