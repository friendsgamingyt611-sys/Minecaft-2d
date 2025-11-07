

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
  COAL_ORE = 7,
  IRON_ORE = 8,
  DIAMOND_ORE = 9,
  COBBLESTONE = 10,
  OAK_PLANKS = 11,
  CRAFTING_TABLE = 12,
  CHEST = 13,
  SPRUCE_LOG = 14,
  SPRUCE_LEAVES = 15,
  SPRUCE_PLANKS = 16,
  BIRCH_LOG = 17,
  BIRCH_LEAVES = 18,
  BIRCH_PLANKS = 19,
}

export enum ItemId {
  // Block Items (match BlockId for convenience)
  GRASS = 1, DIRT = 2, STONE = 3, BEDROCK = 4, OAK_LOG = 5, OAK_LEAVES = 6,
  COAL_ORE = 7, IRON_ORE = 8, DIAMOND_ORE = 9, COBBLESTONE = 10, OAK_PLANKS = 11,
  CRAFTING_TABLE = 12, CHEST = 13,
  SPRUCE_LOG = 14, SPRUCE_LEAVES = 15, SPRUCE_PLANKS = 16,
  BIRCH_LOG = 17, BIRCH_LEAVES = 18, BIRCH_PLANKS = 19,

  // Non-Block Items
  STICK = 256,
  COAL = 257,
  IRON_INGOT = 258,
  DIAMOND = 259,
  WOODEN_PICKAXE = 260,
  STONE_PICKAXE = 261,
  IRON_PICKAXE = 262,
  WOODEN_AXE = 263,
  STONE_AXE = 264,
  IRON_AXE = 265,
  WOODEN_SHOVEL = 266,
  STONE_SHOVEL = 267,
  IRON_SHOVEL = 268,
  WOODEN_SWORD = 269,
  STONE_SWORD = 270,
  IRON_SWORD = 271,
  WOODEN_HOE = 272,
  STONE_HOE = 273,
  IRON_HOE = 274,
}

export type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'sword' | 'hoe' | 'none';
export type ToolTier = 'wood' | 'stone' | 'iron' | 'diamond' | 'none';
export type GameMode = 'survival' | 'creative' | 'spectator';

export interface Item {
    id: ItemId;
    count: number;
    durability?: number;
}

export interface ItemInfo {
    name: string;
    maxStackSize: number;
    toolInfo?: ToolInfo;
    blockId?: BlockId; // If this item can be placed as a block
}

export interface ToolInfo {
    type: ToolType;
    tier: ToolTier;
    durability: number;
}

export interface BlockType {
  id: BlockId;
  name: string;
  color: string;
  isSolid: boolean;
  hardness: number; // Time to break in frames (60fps)
  isIndestructible?: boolean;
  texture?: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void;
  isLightTransparent?: boolean;
  // V2.5 Additions
  itemDrop?: { itemId: ItemId; min: number; max: number; };
  toolType?: ToolType;
  minToolTier?: ToolTier;
  xpDrop?: { min: number; max: number; };
  soundType?: 'stone' | 'wood' | 'dirt' | 'grass';
}

export interface GameStateOptions {
    worldSeed: string;
    worldName: string;
    gameMode: GameMode;
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

export interface BodyPart {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    color: string;
    z: number; // z-index for layering
}

export interface PlayerPose {
    head: BodyPart;
    torso: BodyPart;
    leftArm: BodyPart;
    rightArm: BodyPart;
    leftLeg: BodyPart;
    rightLeg: BodyPart;
    heldItem?: ItemId;
    eyeOffset: Vector2;
}

export interface Recipe {
    result: Item;
    shape: (ItemId | null)[][];
    isShapeless?: boolean;
}

export enum BiomeId {
  PLAINS = 0,
  FOREST = 1,
}

export interface Biome {
  id: BiomeId;
  name: string;
  baseHeight: number;
  amplitude: number;
  surfaceBlock: BlockId;
  subSurfaceBlock: BlockId;
  treeFrequency: number;
  treeTypes: ('oak' | 'spruce' | 'birch')[];
}

// V2.5.1 Cross-Platform Update
export type ControlScheme = 'auto' | 'touch' | 'keyboard';

export interface Settings {
    // Graphics
    uiScale: number;
    renderInteractiveArea: boolean;
    // Controls
    controlScheme: ControlScheme;
    touchButtonSize: number;
    touchButtonOpacity: number;
    // Gameplay
    autoJump: boolean;
}

export interface InputState {
    moveX: number; // -1, 0, or 1
    jump: {
        pressed: boolean, // is the button currently down
        justPressed: boolean, // was it just pressed this frame
    },
    sneak: boolean;
    sprint: boolean;
    place: boolean; // right-click or place button (is clicked)
    destroy: boolean; // left-click or destroy button (is down)
    inventory: boolean; // 'e' or inventory button (is pressed)
    drop: boolean; // 'q' or drop button (is pressed)
}

export interface XPOrb {
  position: Vector2;
  velocity: Vector2;
  value: number; // XP points
  lifetime: number;
  collected: boolean;
}

// V2.6 World Persistence
export interface WorldMetadata {
    name: string;
    seed: string;
    gameMode: GameMode;
    timePlayed: number;
    created: number;
    lastPlayed: number;
    spawnPoint: Vector2;
}

export interface InventoryData {
    items: (Item | null)[];
}

export interface PlayerData {
    position: Vector2;
    health: number;
    hunger: number;
    level: number;
    experience: number;
    inventory: InventoryData;
    armorInventory: InventoryData;
}

export interface ChunkData {
    blocks: number[]; // Store as array for JSON serialization
    blockEntities: [string, any][];
}

export interface WorldData {
    metadata: WorldMetadata;
    player: PlayerData;
    chunks: [string, ChunkData][]; // Store as array of [key, value] pairs
    version: string;
}