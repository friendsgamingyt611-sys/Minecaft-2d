import { Scene, SceneManager } from './SceneManager';
import { GameScene } from './GameScene';
import { GameMode, WorldData } from '../types';
import { WorldStorage } from '../core/WorldStorage';
import { ChunkSystem } from '../world/ChunkSystem';
import { Player } from '../entities/Player';
import { VIEW_DISTANCE_CHUNKS, CHUNK_PIXEL_SIZE } from '../core/Constants';

interface WorldCreationOptions {
    worldName: string;
    seed: string;
    gameMode: GameMode;
}

type GenerationStage = 'initializing' | 'generating_terrain' | 'building_chunks' | 'finalizing' | 'done';

export class WorldLoadingScene implements Scene {
    private sceneManager: SceneManager;
    private options: WorldCreationOptions;

    private stage: GenerationStage = 'initializing';
    private statusMessage: string = 'Initializing...';
    private progress: number = 0;
    
    private tempWorld: ChunkSystem | null = null;
    private worldData: WorldData | null = null;
    private spawnChunksToGenerate: { x: number, y: number }[] = [];

    constructor(sceneManager: SceneManager, options: WorldCreationOptions) {
        this.sceneManager = sceneManager;
        this.options = options;
    }

    enter(): void {
        this.stage = 'initializing';
    }

    exit(): void {}
    
    update(deltaTime: number): void {
        // This is a state machine that progresses through world generation stages asynchronously.
        switch (this.stage) {
            case 'initializing':
                this.initializeGeneration();
                this.stage = 'generating_terrain';
                this.statusMessage = 'Generating Terrain...';
                break;
            
            case 'generating_terrain':
                this.generateTerrain();
                this.stage = 'building_chunks';
                this.statusMessage = 'Building Chunks...';
                break;
            
            case 'building_chunks':
                // Generate a few chunks per frame to avoid freezing
                this.generateNextChunkBatch(2); 
                if (this.spawnChunksToGenerate.length === 0) {
                    this.stage = 'finalizing';
                    this.statusMessage = 'Finalizing...';
                }
                break;
            
            case 'finalizing':
                this.finalizeWorld();
                this.stage = 'done';
                break;

            case 'done':
                if (this.worldData) {
                    this.sceneManager.switchScene(new GameScene(this.sceneManager, this.worldData));
                }
                break;
        }
    }

    private initializeGeneration() {
        this.tempWorld = new ChunkSystem(this.options.seed);
        const spawnPoint = this.tempWorld.getSpawnPoint();
        const spawnChunkX = Math.floor(spawnPoint.x / CHUNK_PIXEL_SIZE);
        const spawnChunkY = Math.floor(spawnPoint.y / CHUNK_PIXEL_SIZE);

        // Queue up all chunks in the initial view distance to be generated
        for (let y = spawnChunkY - VIEW_DISTANCE_CHUNKS; y <= spawnChunkY + VIEW_DISTANCE_CHUNKS; y++) {
            for (let x = spawnChunkX - VIEW_DISTANCE_CHUNKS; x <= spawnChunkX + VIEW_DISTANCE_CHUNKS; x++) {
                this.spawnChunksToGenerate.push({ x, y });
            }
        }
        this.progress = 0.05;
    }
    
    private generateTerrain() {
        // In a more complex generator, this step could involve creating heightmaps, biome maps, etc.
        // For now, it's a quick step.
        this.progress = 0.1;
    }

    private generateNextChunkBatch(batchSize: number) {
        if (!this.tempWorld) return;

        const totalChunks = Math.pow(VIEW_DISTANCE_CHUNKS * 2 + 1, 2);
        for (let i = 0; i < batchSize; i++) {
            const chunkCoords = this.spawnChunksToGenerate.shift();
            if (chunkCoords) {
                this.tempWorld.getChunk(chunkCoords.x, chunkCoords.y);
                const chunksDone = totalChunks - this.spawnChunksToGenerate.length;
                // Progress from 10% to 90% during chunk generation
                this.progress = 0.1 + (chunksDone / totalChunks) * 0.8;
            } else {
                break; // No more chunks to generate in this batch
            }
        }
    }
    
    private finalizeWorld() {
        if (!this.tempWorld) return;
        
        const now = Date.now();
        const spawnPoint = this.tempWorld.getSpawnPoint();
        
        const newWorld: WorldData = {
            metadata: {
                name: this.options.worldName,
                seed: this.options.seed,
                gameMode: this.options.gameMode,
                created: now,
                lastPlayed: now,
                timePlayed: 0,
                spawnPoint: spawnPoint
            },
            player: null as any,
            chunks: [],
            version: '1.0'
        };

        const tempPlayer = new Player(spawnPoint, this.tempWorld, this.sceneManager.mouseHandler, this.sceneManager.touchHandler, this.sceneManager.inputManager, null as any, () => {});
        tempPlayer.gamemode = this.options.gameMode;
        newWorld.player = tempPlayer.toData();
        
        // Only modified chunks will be saved, but we need to mark the spawn chunks as modified
        for (const chunk of this.tempWorld['chunks'].values()) {
            chunk.isModified = true;
        }
        newWorld.chunks = this.tempWorld.toData();

        WorldStorage.saveWorld(newWorld);
        this.worldData = newWorld;
        this.progress = 1.0;
    }

    render(ctx: CanvasRenderingContext2D): void {
        const { width, height } = ctx.canvas;
        
        // Dark background
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, width, height);
        
        // Title
        ctx.font = "60px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText("Generating World", width / 2, height / 2 - 100);
        
        // Status Message
        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#a0aec0';
        ctx.fillText(this.statusMessage, width / 2, height / 2 - 40);
        
        // Progress Bar
        const barWidth = 600;
        const barHeight = 40;
        const barX = width / 2 - barWidth / 2;
        const barY = height / 2;
        
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#48bb78';
        ctx.fillRect(barX, barY, barWidth * this.progress, barHeight);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}