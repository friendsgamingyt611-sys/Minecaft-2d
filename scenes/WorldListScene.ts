
import { Scene, SceneManager } from './SceneManager';
import { WorldStorage } from '../core/WorldStorage';
import { GameMode, Vector2, WorldMetadata } from '../types';
import { GameScene } from './GameScene';
import { WorldCreateScene } from './WorldCreateScene';
import { SoundManager } from '../core/SoundManager';

interface WorldButton {
    metadata: WorldMetadata;
    rect: { x: number; y: number; w: number; h: number };
    deleteRect: { x: number; y: number; w: number; h: number };
}

export class WorldListScene implements Scene {
    private sceneManager: SceneManager;
    private worlds: WorldMetadata[] = [];
    private worldButtons: WorldButton[] = [];
    private createButtonRect: { x: number; y: number; w: number; h: number };
    private backButtonRect: { x: number; y: number; w: number; h: number };
    
    private hoveredButton: WorldButton | 'create' | 'back' | null = null;
    private hoveredDeleteButton: WorldButton | null = null;
    private scrollOffset: number = 0;

    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;
        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        this.createButtonRect = { x: canvas.width / 2 - 205, y: canvas.height - 100, w: 200, h: 50 };
        this.backButtonRect = { x: canvas.width / 2 + 5, y: canvas.height - 100, w: 200, h: 50 };
    }

    enter(): void {
        this.worlds = WorldStorage.listWorlds();
        this.createWorldButtons();
    }

    exit(): void {}
    
    private createWorldButtons() {
        this.worldButtons = [];
        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        const listWidth = 800;
        const startX = canvas.width / 2 - listWidth / 2;
        const startY = 180;
        const buttonHeight = 80;
        const spacing = 15;

        this.worlds.forEach((world, index) => {
            const y = startY + index * (buttonHeight + spacing);
            this.worldButtons.push({
                metadata: world,
                rect: { x: startX, y: y, w: listWidth, h: buttonHeight },
                deleteRect: { x: startX + listWidth - 60, y: y + 10, w: 50, h: 60 }
            });
        });
    }

    private playWorld(worldName: string) {
        SoundManager.instance.playSound('ui.click');
        SoundManager.instance.stopMusic();
        const worldData = WorldStorage.loadWorld(worldName);
        if (worldData) {
            this.sceneManager.switchScene(new GameScene(this.sceneManager, worldData));
        } else {
            console.error("Failed to load world:", worldName);
        }
    }
    
    private deleteWorld(worldName: string) {
        // TODO: Add confirmation dialog
        SoundManager.instance.playSound('ui.click');
        WorldStorage.deleteWorld(worldName);
        this.enter(); // Refresh list
    }

    update(deltaTime: number): void {
        const mousePos = this.sceneManager.mouseHandler.position;
        const pointerClicks: Vector2[] = [];
        if (this.sceneManager.mouseHandler.isLeftClicked) {
            pointerClicks.push(mousePos);
        }
        pointerClicks.push(...this.sceneManager.touchHandler.justEndedTouches);

        // Hover detection
        this.hoveredButton = null;
        this.hoveredDeleteButton = null;
        for (const button of this.worldButtons) {
            if (this.isPosInRect(mousePos, button.deleteRect)) {
                this.hoveredDeleteButton = button;
                break;
            }
            if (this.isPosInRect(mousePos, button.rect)) {
                this.hoveredButton = button;
                break;
            }
        }
        if (!this.hoveredButton && !this.hoveredDeleteButton) {
            if (this.isPosInRect(mousePos, this.createButtonRect)) this.hoveredButton = 'create';
            else if (this.isPosInRect(mousePos, this.backButtonRect)) this.hoveredButton = 'back';
        }

        // Click detection
        for (const pos of pointerClicks) {
             for (const button of this.worldButtons) {
                if (this.isPosInRect(pos, button.deleteRect)) {
                    this.deleteWorld(button.metadata.name);
                    return;
                }
                if (this.isPosInRect(pos, button.rect)) {
                    this.playWorld(button.metadata.name);
                    return;
                }
            }
            if (this.isPosInRect(pos, this.createButtonRect)) {
                 SoundManager.instance.playSound('ui.click');
                 this.sceneManager.pushScene(new WorldCreateScene(this.sceneManager));
                 return;
            }
            if (this.isPosInRect(pos, this.backButtonRect)) {
                 SoundManager.instance.playSound('ui.click');
                 this.sceneManager.popScene();
                 return;
            }
        }
    }
    
    private isPosInRect(pos: Vector2, rect: {x:number, y:number, w:number, h:number}): boolean {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h;
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#383838'; // Dark dirt background
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.font = "60px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText("Select World", ctx.canvas.width / 2, 100);

        this.worldButtons.forEach(button => {
            const isHovered = this.hoveredButton === button;
            ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
            ctx.fillRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);
            ctx.strokeStyle = '#383838';
            ctx.lineWidth = 4;
            ctx.strokeRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h);

            ctx.font = "24px Minecraftia";
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(button.metadata.name, button.rect.x + 20, button.rect.y + 30);
            
            ctx.font = "18px Minecraftia";
            ctx.fillStyle = '#d0d0d0';
            const details = `${button.metadata.gameMode}, Last Played: ${new Date(button.metadata.lastPlayed).toLocaleDateString()}`;
            ctx.fillText(details, button.rect.x + 20, button.rect.y + 60);

            // Delete button
            const isDeleteHovered = this.hoveredDeleteButton === button;
            ctx.fillStyle = isDeleteHovered ? '#ff8080' : '#ff5555';
            ctx.fillRect(button.deleteRect.x, button.deleteRect.y, button.deleteRect.w, button.deleteRect.h);
            ctx.fillStyle = '#ffffff';
            ctx.font = "30px Minecraftia";
            ctx.textAlign = 'center';
            ctx.fillText("X", button.deleteRect.x + button.deleteRect.w/2, button.deleteRect.y + button.deleteRect.h/2 + 2);
        });
        
        // Create/Back buttons
        const buttons = [
            { rect: this.createButtonRect, label: 'Create New', name: 'create' as const },
            { rect: this.backButtonRect, label: 'Back', name: 'back' as const }
        ];

        buttons.forEach(b => {
            const isHovered = this.hoveredButton === b.name;
            ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
            ctx.fillRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
            ctx.strokeStyle = '#383838';
            ctx.lineWidth = 4;
            ctx.strokeRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);

            ctx.font = "24px Minecraftia";
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2);
        });
    }
}
