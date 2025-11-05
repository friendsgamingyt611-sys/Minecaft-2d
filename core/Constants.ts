

export const BLOCK_SIZE = 32;
export const CHUNK_SIZE = 16;
export const CHUNK_PIXEL_SIZE = CHUNK_SIZE * BLOCK_SIZE;

// V2.1 Physics Constants
export const GRAVITY = 1.2;
// FIX: Reduced jump force. A force of 11 results in a jump height of ~1.6 blocks,
// enough to clear one block but not two. The previous value of 18 was enough for ~4 blocks.
export const PLAYER_JUMP_FORCE = 11;
export const PLAYER_MOVE_SPEED = 4.3; // From 4.8
export const PLAYER_SPRINT_SPEED = 6.2;
export const PLAYER_SNEAK_SPEED = 1.6;
export const PLAYER_STEP_UP_FORCE = 7; // New: For smooth block stepping

export const PLAYER_MAX_SPEED = 10;
export const PLAYER_FRICTION = 0.85;

// V2.1 Player Model Dimensions
export const PLAYER_WIDTH = BLOCK_SIZE * 0.8;
export const PLAYER_HEIGHT = BLOCK_SIZE * 1.8;
export const PLAYER_SNEAK_HEIGHT = BLOCK_SIZE * 1.5;

export const HOTBAR_SLOTS = 9;
export const INVENTORY_SLOTS = 36; // 9 hotbar + 27 main
export const ARMOR_SLOTS = 4;
export const CHEST_SLOTS = 27;

export const HOTBAR_SLOT_SIZE = 50;
export const HOTBAR_ITEM_SIZE = 32;

export const REACH_DISTANCE = 5.0 * BLOCK_SIZE; // From 4.0
export const ITEM_PICKUP_RADIUS = 2 * BLOCK_SIZE;

export const PARTICLE_COUNT = 10;
export const PARTICLE_LIFESPAN = 30;

// Version 2 Constants
export const MAX_HEALTH = 20; // 10 hearts
export const MAX_HUNGER = 20; // 10 drumsticks
export const VIEW_DISTANCE_CHUNKS = 8; // In chunks, loads a 17x17 area
export const FALL_DAMAGE_START_BLOCKS = 4;
export const TERMINAL_VELOCITY = 30;

// V2.5 Tool Constants
export const TOOL_EFFECTIVENESS_MULTIPLIER = 7.5;
export const TOOL_TIER_SPEED_MAP = {
    wood: 2,
    stone: 4,
    iron: 6,
    diamond: 8,
    none: 1,
};
export const INCORRECT_TOOL_PENALTY = 0.33;

// V2.5.1 UI Constants
export const TOUCH_JOYSTICK_RADIUS = 60;
export const TOUCH_JOYSTICK_STROKE_WIDTH = 8;
export const TOUCH_JOYSTICK_KNOB_RADIUS = 30;
export const TOUCH_BUTTON_SIZE = 70;
export const TOUCH_BUTTON_MARGIN = 20;