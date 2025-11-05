import { Scene, SceneManager } from './SceneManager';
import { GameScene } from './GameScene';
import { GameState } from '../core/GameState';
import { VirtualKeyboard } from '../input/VirtualKeyboard';
import { Vector2 } from '../types';

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
        window.addEventListener('keydown', this.handlePhysicalKeyDown);
    }

    exit(): void {
        VirtualKeyboard.instance.hide();
        window.removeEventListener('keydown', this.handlePhysicalKeyDown);
    }

    private handlePhysicalKeyDown = (event: KeyboardEvent) => {
        if (!(this.activeComponent instanceof InputBox)) return;

        const inputBox = this.activeComponent;

        if (event.key === 'Backspace') {
            inputBox.text = inputBox.text.slice(0, -1);
        } else if (event.key === 'Tab') {
            event.preventDefault();
            const nextActive = this.activeComponent === this.worldNameInput 
                ? this.worldSeedInput 
                : this.worldNameInput;
            this.activeComponent = nextActive;
            this.activateInputBox(nextActive);
        } else if (event.key === 'Enter') {
            this.createWorld();
        } else if (event.key.length === 1 && inputBox.text.length < 32) {
            inputBox.text += event.key;
        }
        
        VirtualKeyboard.instance.setText(inputBox.text);
    };

    private createWorld() {
        if (this.worldNameInput.text.trim() === '') {
            console.log("World name cannot be empty");
            return;
        }
        let seed = this.worldSeedInput.text.trim();
        if (seed === '') {
            seed = Date.now().toString();
        }
        const gameState = new GameState({ worldSeed: seed });
        this.sceneManager.switchScene(new GameScene(this.sceneManager, gameState));
    }
    
    private goBack() {
        this.sceneManager.popScene();
    }

    private activateInputBox(inputBox: InputBox) {
        VirtualKeyboard.instance.show({
            text: inputBox.text,
            onInput: (newText) => {
                if (this.activeComponent === inputBox) {
                    inputBox.text = newText;
                }
            },
            onEnter: () => this.createWorld(),
            onBlur: () => {
                if (this.activeComponent === inputBox) {
                    this.activeComponent = null;
                }
            }
        });
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
        
        const pointerEndedPositions: Vector2[] = [...this.sceneManager.touchHandler.justEndedTouches];
        if (this.sceneManager.mouseHandler.isLeftClicked) {
            pointerEndedPositions.push(this.sceneManager.mouseHandler.position);
        }

        let clickedOnComponent = false;
        if (pointerEndedPositions.length > 0) {
            for (const pos of pointerEndedPositions) {
                for (const component of this.uiComponents) {
                    if (pos.x >= component.x && pos.x <= component.x + component.width &&
                        pos.y >= component.y && pos.y <= component.y + component.height) {
                        
                        clickedOnComponent = true;
                        
                        if (component instanceof InputBox) {
                            this.activeComponent = component;
                            this.activateInputBox(component);
                        } else {
                            this.activeComponent = null;
                            VirtualKeyboard.instance.hide();
                            if (component.onClick) {
                                component.onClick();
                            }
                        }
                        break;
                    }
                }
                if (clickedOnComponent) break;
            }

            if (!clickedOnComponent) {
                this.activeComponent = null;
                VirtualKeyboard.instance.hide();
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
