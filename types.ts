

export type ItemCategory = 
  | 'Building Blocks'
  | 'Decorations'
  | 'Redstone'
  | 'Transportation'
  | 'Miscellaneous'
  | 'Foodstuffs'
  | 'Tools & Combat'
  | 'Brewing'
  | 'Materials';

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
  FURNACE = 20,
  FURNACE_LIT = 21,
  SAND = 22,
  GRAVEL = 23,
  GOLD_ORE = 24,
  REDSTONE_ORE = 25,
  EMERALD_ORE = 26,
  STONE_BRICKS = 27,
  GLASS = 28,
  TORCH = 29,
  REDSTONE_ORE_LIT = 30,
  SMOOTH_STONE = 31,
  LAPIS_LAZULI_ORE = 32,
  OBSIDIAN = 33,
  OAK_SAPLING = 34,
  SPRUCE_SAPLING = 35,
  BIRCH_SAPLING = 36,
  FARMLAND = 37,
  FARMLAND_WET = 38,
}

export enum ItemId {
  // Block Items (match BlockId for convenience)
  GRASS = 1, DIRT = 2, STONE = 3, BEDROCK = 4, OAK_LOG = 5, OAK_LEAVES = 6,
  COAL_ORE = 7, IRON_ORE = 8, DIAMOND_ORE = 9, COBBLESTONE = 10, OAK_PLANKS = 11,
  CRAFTING_TABLE = 12, CHEST = 13,
  SPRUCE_LOG = 14, SPRUCE_LEAVES = 15, SPRUCE_PLANKS = 16,
  BIRCH_LOG = 17, BIRCH_LEAVES = 18, BIRCH_PLANKS = 19,
  FURNACE = 20,
  SAND = 22, GRAVEL = 23, GOLD_ORE = 24, REDSTONE_ORE = 25, EMERALD_ORE = 26,
  STONE_BRICKS = 27, GLASS = 28, TORCH = 29,
  SMOOTH_STONE = 31, LAPIS_LAZULI_ORE = 32, OBSIDIAN = 33,
  OAK_SAPLING = 34, SPRUCE_SAPLING = 35, BIRCH_SAPLING = 36,
  FARMLAND = 37,

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
  IRON_HELMET = 275,
  IRON_CHESTPLATE = 276,
  IRON_LEGGINGS = 277,
  IRON_BOOTS = 278,
  DIAMOND_PICKAXE = 279,
  DIAMOND_AXE = 280,
  DIAMOND_SHOVEL = 281,
  DIAMOND_SWORD = 282,
  DIAMOND_HOE = 283,
  RAW_IRON = 284,
  RAW_GOLD = 285,
  GOLD_INGOT = 286,
  REDSTONE_DUST = 287,
  EMERALD = 288,
  FLINT = 289,
  DIAMOND_HELMET = 290,
  DIAMOND_CHESTPLATE = 291,
  DIAMOND_LEGGINGS = 292,
  DIAMOND_BOOTS = 293,
  SHIELD = 294,
  LEATHER = 295,
  LEATHER_HELMET = 296,
  LEATHER_CHESTPLATE = 297,
  LEATHER_LEGGINGS = 298,
  LEATHER_BOOTS = 299,
  LAPIS_LAZULI = 300,
}

export type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'sword' | 'hoe' | 'none';
export type ToolTier = 'wood' | 'stone' | 'iron' | 'diamond' | 'none';
export type GameMode = 'survival' | 'creative' | 'spectator';
export type SlotType = 'player' | 'hotbar' | 'armor' | 'crafting_input' | 'crafting_output' | 'furnace_input' | 'furnace_fuel' | 'furnace_output' | 'offhand' | 'creative_display';


export interface Item {
    id: ItemId;
    count: number;
    durability?: number;
}

export interface ItemInfo {
    name: string;
    maxStackSize: number;
    category: ItemCategory;
    toolInfo?: ToolInfo;
    armorInfo?: ArmorInfo;
    blockId?: BlockId; // If this item can be placed as a block
}

export interface ToolInfo {
    type: ToolType;
    tier: ToolTier;
    durability: number;
    damage?: number;
}

export interface ArmorInfo {
    type: 'helmet' | 'chestplate' | 'leggings' | 'boots';
    protection: number;
    durability: number;
}

export interface BlockType {
  id: BlockId;
  name: string;
  color: string;
  isSolid: boolean;
  hardness: number; // Time to break in frames with hand (60fps)
  isIndestructible?: boolean;
  texture?: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, data?: any) => void;
  isLightTransparent?: boolean;
  isBlockEntity?: boolean;
  lightLevel?: number; // 0-15
  itemDrop?: { itemId: ItemId; min: number; max: number; };
  toolType?: ToolType;
  minToolTier?: ToolTier;
  xpDrop?: { min: number; max: number; };
  soundType?: 'stone' | 'wood' | 'dirt' | 'grass' | 'sand' | 'gravel' | 'glass';
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

export interface InputState {
    moveX: number; // -1, 0, or 1
    jump: {
        pressed: boolean, // is the button currently down
        justPressed: boolean, // was it just pressed this frame
    },
    sneak: {
        pressed: boolean,
        justPressed: boolean,
    },
    sprint: {
        pressed: boolean,
        justPressed: boolean,
    },
    place: boolean; // right-click or place button (is clicked)
    destroy: boolean; // left-click or destroy button (is down)
    drop: boolean; // 'q' or drop button (is pressed)
    pickBlock: boolean; // middle-click
    swapHands: boolean; // 'f' key
    
    // FIX: Centralized system-level actions
    inventory: boolean; // 'e' key
    gamemodeSwitch: boolean; // 'm' key
    pause: boolean; // 'escape' key
    toggleDebug: boolean; // 'f3' key
    screenshot: boolean; // 'f2' key
    toggleFullscreen: boolean; // 'f11' key
    openChat: boolean; // 't' key
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

export interface BlockEntityData {
    inventory?: InventoryData;
    smeltTime?: number;
    fuelTime?: number;
    maxFuelTime?: number;
}


export interface PlayerData {
    position: Vector2;
    health: number;
    hunger: number;
    level: number;
    experience: number;
    inventory: InventoryData;
    armorInventory: InventoryData;
    offhandInventory: InventoryData;
}

export interface ChunkData {
    blocks: number[]; // Store as array for JSON serialization
    blockEntities: [string, BlockEntityData][];
}

export interface WorldData {
    metadata: WorldMetadata;
    player: PlayerData;
    chunks: [string, ChunkData][]; // Store as array of [key, value] pairs
    version: string;
}


// --- V3.0 NEW SETTINGS & PLAYER PROFILE SYSTEM ---

export interface PlayerProfile {
  uuid: string;
  name: string;
  skin: {
    skinColor: string;
    shirtColor: string;
    pantsColor: string;
    hairColor: string;
  };
  createdAt: number;
  lastPlayed: number;
}

// Settings Interfaces
export interface GraphicsSettings {
  renderDistance: number; // 2-16 chunks
  viewBobbing: boolean;
  viewBobbingIntensity: number; // 0-200%
  particleEffects: 'All' | 'Decreased' | 'Minimal' | 'Off';
  clouds: 'Fancy' | 'Fast' | 'Off';
  guiScale: number; // 0.5 - 2.0
  brightness: number; // 0-100%
  fullscreen: boolean;
  fpsLimit: number; // 30, 60, 120, 0 (unlimited)
  fov: number; // 30-110
  cameraShakeIntensity: number; // 0-200%
}

export interface AudioSettings {
  masterVolume: number; // 0-100
  musicVolume: number; // 0-100
  ambientSounds: number; // 0-100
  blockSounds: number; // 0-100
  playerSounds: number; // 0-100
  uiSounds: number; // 0-100
}

export type KeyBinding = { [key: string]: string };

export interface ControlsSettings {
  controlScheme: ControlScheme;
  mouseSensitivity: number; // 0-200%
  autoJump: boolean;
  toggleCrouch: boolean;
  toggleSprint: boolean;
  keyBindings: KeyBinding;
  touchButtonSize: number;
  touchButtonOpacity: number;
}

export interface GameplaySettings {
  difficulty: 'Peaceful' | 'Easy' | 'Normal' | 'Hard';
  showCoordinates: boolean;
  showFps: boolean;
  showBiome: boolean;
  autoSaveIndicator: boolean;
  renderInteractiveArea: boolean;
  nametagDistance: 'Always' | '16 Blocks' | 'Never';
  nametagOpacity: number; // 0-100
  nametagBackground: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

export interface GlobalSettings {
  version: string;
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlsSettings;
  gameplay: GameplaySettings;
  accessibility: AccessibilitySettings;
}