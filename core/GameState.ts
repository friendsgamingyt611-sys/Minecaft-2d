
import { GameStateOptions } from '../types';

export class GameState {
    public worldSeed: string;

    constructor(options: GameStateOptions) {
        this.worldSeed = options.worldSeed;
    }
}
