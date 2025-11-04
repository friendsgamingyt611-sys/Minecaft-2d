import { Scene, SceneManager } from './SceneManager';
import { GameScene } from './GameScene';
import { GameState } from '../core/GameState';
import { TitleScene } from './TitleScene';

// --- UI Components for this Scene ---

interface UIComponent {
    x: number;
    y: number;
    width: number;
    height: number;
    render(ctx: CanvasRenderingContext2D, isHovered: boolean, isActive: boolean): void;
    onClick?(): void;
}

class InputBox implements UIComponent {
    text: string = '';
    private cursorVisible: boolean = true;
    private cursorTimer: number = 0;
    
    constructor(public x: number, public y: number, public width: number, public height: number, public placeholder: string) {}
    
    update(deltaTime: number) {
        this.cursorTimer += deltaTime;
        if (this.cursorTimer > 0.5) {
            this.cursorVisible = !this.cursorVisible;
            this.cursorTimer = 0;
        }
    }
    
    render(ctx: CanvasRenderingContext2D, isHovered: boolean, isActive: boolean): void {
        ctx.fillStyle = '#383838';
        ctx.strokeStyle = isActive ? '#ffffff' : '#000000';
        ctx.lineWidth = 4;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.font = "24px Minecraftia";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        if (this.text) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(this.text, this.x + 10, this.y + this.height / 2);
        } else if (!isActive) {
            ctx.fillStyle = '#a0a0a0';
            ctx.fillText(this.placeholder, this.x + 10, this.y + this.height / 2);
        }
        
        if (isActive && this.cursorVisible) {
            const textMetrics = ctx.measureText(this.text);
            const cursorX = this.x + 10 + textMetrics.width;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cursorX, this.y + 8, 2, this.height - 16);
        }
    }
    
    addChar(char: string): void {
        this.text += char;
    }

    deleteChar(): void {
        this.text = this.text.slice(0, -1);
    }
}

class Button implements UIComponent {
    constructor(public x: number, public y: number, public width: number, public height: number, public label: string, public onClick: () => void) {}
    
    render(ctx: CanvasRenderingContext2D, isHovered: boolean): void {
        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 4;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.font = "30px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
    }
}

// --- WorldCreateScene Implementation ---

export class WorldCreateScene implements Scene {
    private sceneManager: SceneManager;
    private worldNameInput: InputBox;
    private worldSeedInput: InputBox;
    private uiComponents: UIComponent[];
    private activeComponent: UIComponent | null = null;
    private hoverComponent: UIComponent | null = null;

    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;

        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        const canvasWidth = canvas.width;

        this.worldNameInput = new InputBox(canvasWidth / 2 - 200, 280, 400, 50, 'World Name');
        this.worldSeedInput = new InputBox(canvasWidth / 2 - 200, 350, 400, 50, 'Seed (optional)');
        
        const createButton = new Button(canvasWidth / 2 - 200, 450, 180, 50, 'Create', () => this.createWorld());
        const backButton = new Button(canvasWidth / 2 + 20, 450, 180, 50, 'Back', () => this.goBack());

        this.uiComponents = [this.worldNameInput, this.worldSeedInput, createButton, backButton];
        this.activeComponent = this.worldNameInput;
    }

    enter(): void {
        this.sceneManager.mouseHandler['canvas'].addEventListener('click', this.handleMouseClick);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    exit(): void {
        this.sceneManager.mouseHandler['canvas'].removeEventListener('click', this.handleMouseClick);
        window.removeEventListener('keydown', this.handleKeyDown);
    }
    
    private handleMouseClick = () => {
        if (this.hoverComponent) {
            this.activeComponent = this.hoverComponent;
            if (this.hoverComponent.onClick) {
                this.hoverComponent.onClick();
            }
        } else {
            this.activeComponent = null;
        }
    };

    private handleKeyDown = (event: KeyboardEvent) => {
        if (!(this.activeComponent instanceof InputBox)) return;

        const forbiddenKeys = [
            'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'F1', 'F2', 'F3', 
            'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
        ];

        if (event.key === 'Backspace') {
            this.activeComponent.deleteChar();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            this.activeComponent = this.activeComponent === this.worldNameInput 
                ? this.worldSeedInput 
                : this.worldNameInput;
        } else if (event.key === 'Enter') {
            this.createWorld();
        } else if (!forbiddenKeys.includes(event.key) && this.activeComponent.text.length < 32) {
            this.activeComponent.addChar(event.key);
        }
    };

    private createWorld() {
        if (this.worldNameInput.text.trim() === '') {
            console.log("World name cannot be empty");
            return;
        }
        let seed = this.worldSeedInput.text.trim();
        if (seed === '') {
            seed = (Math.random() * 1000000).toString();
        }
        const gameState = new GameState({ worldSeed: seed });
        this.sceneManager.switchScene(new GameScene(this.sceneManager, gameState));
    }
    
    private goBack() {
        this.sceneManager.popScene();
    }

    update(deltaTime: number): void {
        const mousePos = this.sceneManager.mouseHandler.position;
        this.hoverComponent = null;
        for (const component of this.uiComponents) {
            if (mousePos.x >= component.x && mousePos.x <= component.x + component.width &&
                mousePos.y >= component.y && mousePos.y <= component.y + component.height) {
                this.hoverComponent = component;
                break;
            }
        }
        
        if (this.activeComponent instanceof InputBox) {
            this.activeComponent.update(deltaTime);
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#63a3ff';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.font = "60px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 7;
        ctx.strokeText("Create New World", ctx.canvas.width / 2, 180);
        ctx.fillText("Create New World", ctx.canvas.width / 2, 180);

        this.uiComponents.forEach(component => {
            const isHovered = component === this.hoverComponent;
            const isActive = component === this.activeComponent;
            component.render(ctx, isHovered, isActive);
        });
    }
}
