import { GameMode } from "../types";
import { REACH_DISTANCE } from "./Constants";

export interface GameModeProperties {
  takesDamage: boolean;
  hasHunger: boolean;
  canFly: boolean;
  isSpectator: boolean; // For noclip and invisibility
  canInteract: boolean;
  instantBreak: boolean;
  keepInventoryOnSwitch: boolean;
  interactionRange: number;
}

export const GAME_MODE_CONFIGS: { [key in GameMode]: GameModeProperties } = {
  survival: {
    takesDamage: true,
    hasHunger: true,
    canFly: false,
    isSpectator: false,
    canInteract: true,
    instantBreak: false,
    keepInventoryOnSwitch: true,
    interactionRange: REACH_DISTANCE,
  },
  creative: {
    takesDamage: false,
    hasHunger: false,
    canFly: true,
    isSpectator: false,
    canInteract: true,
    instantBreak: true,
    keepInventoryOnSwitch: false, // Player gets items from creative menu
    interactionRange: REACH_DISTANCE * 1.5,
  },
  spectator: {
    takesDamage: false,
    hasHunger: false,
    canFly: true,
    isSpectator: true,
    canInteract: false,
    instantBreak: false,
    keepInventoryOnSwitch: false, // Spectators have no inventory
    interactionRange: REACH_DISTANCE * 2,
  }
};
