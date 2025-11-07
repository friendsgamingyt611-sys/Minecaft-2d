
import { WorldData, WorldMetadata } from '../types';

export class WorldStorage {
    private static readonly WORLD_PREFIX = 'mc2d_world_';

    public static saveWorld(worldData: WorldData): void {
        try {
            const worldKey = this.WORLD_PREFIX + worldData.metadata.name;
            const serializedData = JSON.stringify(worldData);
            localStorage.setItem(worldKey, serializedData);
        } catch (e) {
            console.error("Failed to save world:", e);
            // Handle storage full error
        }
    }

    public static loadWorld(worldName: string): WorldData | null {
        try {
            const worldKey = this.WORLD_PREFIX + worldName;
            const data = localStorage.getItem(worldKey);
            if (!data) return null;
            
            // FIX: Removed incorrect conversion logic. JSON.parse provides the data
            // in the correct array-of-tuples format that the rest of the app expects.
            const worldData: WorldData = JSON.parse(data);
            return worldData;
        } catch (e) {
            console.error("Failed to load world:", e);
            return null;
        }
    }
    
    public static listWorlds(): WorldMetadata[] {
        const worlds: WorldMetadata[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.WORLD_PREFIX)) {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const worldData = JSON.parse(data);
                        worlds.push(worldData.metadata);
                    }
                } catch(e) {
                    console.error(`Failed to parse world data for key ${key}:`, e);
                }
            }
        }
        return worlds.sort((a, b) => b.lastPlayed - a.lastPlayed);
    }
    
    public static deleteWorld(worldName: string): void {
        try {
            const worldKey = this.WORLD_PREFIX + worldName;
            localStorage.removeItem(worldKey);
        } catch (e) {
            console.error("Failed to delete world:", e);
        }
    }

    public static worldExists(worldName: string): boolean {
        const worldKey = this.WORLD_PREFIX + worldName;
        return localStorage.getItem(worldKey) !== null;
    }
}