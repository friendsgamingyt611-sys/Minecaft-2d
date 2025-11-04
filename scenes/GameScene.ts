
import { Scene, SceneManager } from './SceneManager';
import { GameState } from '../core/GameState';
import { ChunkSystem } from '../world/ChunkSystem';
import { Player } from '../entities/Player';
import { Camera } from '../entities/Camera';
import { RenderEngine } from '../rendering/RenderEngine';
import { HUD } from '../ui/HUD';
import { BLOCK_SIZE } from '../core/Constants';

export class GameScene implements Scene {
  private sceneManager: SceneManager;
  private gameState: GameState;
  
  public world: ChunkSystem;
  public player: Player;
  private camera: Camera;
  private renderer: RenderEngine;
  private hud: HUD;

  private isPaused: boolean = false;

  constructor(sceneManager: SceneManager, gameState: GameState) {
    this.sceneManager = sceneManager;
    this.gameState = gameState;

    this.world = new ChunkSystem(this.gameState.worldSeed);
    const spawnPoint = this.world.getSpawnPoint();
    this.player = new Player(spawnPoint.x, spawnPoint.y, this.sceneManager.inputManager, this.world);

    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    this.camera = new Camera(canvas.width, canvas.height, this.player);

    this.renderer = new RenderEngine(this.camera);
    this.hud = new HUD(this.player);
  }

  enter(): void {
    console.log("Entering Game Scene");
  }

  exit(): void {
    console.log("Exiting Game Scene");
  }
  
  update(deltaTime: number): void {
    if (this.sceneManager.inputManager.isKeyPressed('escape')) {
        this.isPaused = !this.isPaused;
    }

    if (this.isPaused) {
        // Handle pause menu logic here in the future
        return;
    }

    this.player.update(deltaTime, this.sceneManager.mouseHandler.position, this.camera);
    this.world.update(this.player.position);
    this.camera.update(deltaTime);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderer.render(ctx, this.world, this.player, this.sceneManager.mouseHandler.position);
    this.hud.render(ctx);

    if (this.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.font = "60px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText("Paused", ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
  }
}
