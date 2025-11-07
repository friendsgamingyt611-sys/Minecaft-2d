

import { Scene, SceneManager } from './SceneManager';
import { GameMode, Vector2, WorldData } from '../types';
import { VirtualKeyboard } from '../input/VirtualKeyboard';
import { WorldStorage } from '../core/WorldStorage';
import { SoundManager } from '../core/SoundManager';
import { WorldLoadingScene } from './WorldLoadingScene';

// --- UI Components for this Scene ---
interface UIComponent {
    rect: {x: number, y: number, width: number, height: number};
    render(ctx: CanvasRenderingContext2D, isHovered: boolean, isActive: boolean): void;
    onClick?(): void;
    cycle?(): void;
}

class InputBox implements UIComponent {
    text: string = '';
    private cursorVisible: boolean = true;
    private cursorTimer: number = 0;
    
    constructor(public rect: {x: number, y: number, width: number, height: number}, public placeholder: string) {}
    
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
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
        ctx.strokeRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        ctx.font = "24px Minecraftia";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        if (this.text) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(this.text, this.rect.x + 10, this.rect.y + this.rect.height / 2);
        } else if (!isActive) {
            ctx.fillStyle = '#a0a0a0';
            ctx.fillText(this.placeholder, this.rect.x + 10, this.rect.y + this.rect.height / 2);
        }
        
        if (isActive && this.cursorVisible) {
            const textMetrics = ctx.measureText(this.text);
            const cursorX = this.rect.x + 10 + textMetrics.width;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cursorX, this.rect.y + 8, 2, this.rect.height - 16);
        }
    }
}

class Button implements UIComponent {
    constructor(public rect: {x: number, y: number, width: number, height: number}, public label: string, public onClick: () => void) {}
    
    render(ctx: CanvasRenderingContext2D, isHovered: boolean): void {
        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 4;
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
        ctx.strokeRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        ctx.font = "30px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.rect.x + this.rect.width / 2, this.rect.y + this.rect.height / 2);
    }
}

class Dropdown implements UIComponent {
    constructor(public rect: {x: number, y: number, width: number, height: number}, public label: string, public options: string[], public getValue: () => string, public cycle: () => void) {}
    onClick = () => this.cycle();

    render(ctx: CanvasRenderingContext2D, isHovered: boolean): void {
        const fullLabel = `${this.label}: < ${this.getValue()} >`;
        // Re-use button rendering logic
        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 4;
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
        ctx.strokeRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fullLabel, this.rect.x + this.rect.width / 2, this.rect.y + this.rect.height / 2);
    }
}


// --- WorldCreateScene Implementation ---
export class WorldCreateScene implements Scene {
    private sceneManager: SceneManager;
    private worldNameInput: InputBox;
    private worldSeedInput: InputBox;
    private gamemodeDropdown: Dropdown;
    private uiComponents: UIComponent[];
    private activeComponent: UIComponent | null = null;
    private hoverComponent: UIComponent | null = null;
    private gameMode: GameMode = 'survival';

    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;

        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        const cx = canvas.width / 2;

        this.worldNameInput = new InputBox({x: cx - 200, y: 280, width: 400, height: 50}, 'World Name');
        this.worldSeedInput = new InputBox({x: cx - 200, y: 350, width: 400, height: 50}, 'Seed (optional)');
        
        const gameModes: GameMode[] = ['survival', 'creative', 'spectator'];
        this.gamemodeDropdown = new Dropdown(
            {x: cx - 200, y: 420, width: 400, height: 50}, 
            'Game Mode', 
            gameModes,
            () => this.gameMode,
            () => {
                const currentIndex = gameModes.indexOf(this.gameMode);
                this.gameMode = gameModes[(currentIndex + 1) % gameModes.length];
                SoundManager.instance.playSound('ui.click');
            }
        );
        
        const createButton = new Button({x: cx - 200, y: 520, width: 180, height: 50}, 'Create', () => this.createWorld());
        const backButton = new Button({x: cx + 20, y: 520, width: 180, height: 50}, 'Back', () => this.goBack());

        this.uiComponents = [this.worldNameInput, this.worldSeedInput, this.gamemodeDropdown, createButton, backButton];
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
        SoundManager.instance.playSound('ui.click');
        const worldName = this.worldNameInput.text.trim();
        if (worldName === '') {
            // TODO: Show error message
            return;
        }
        if (WorldStorage.worldExists(worldName)) {
            // TODO: Show error message
            return;
        }

        let seed = this.worldSeedInput.text.trim();
        if (seed === '') {
            seed = Date.now().toString();
        }
        
        const options = {
            worldName,
            seed,
            gameMode: this.gameMode
        };

        SoundManager.instance.stopMusic();
        this.sceneManager.switchScene(new WorldLoadingScene(this.sceneManager, options));
    }
    
    private goBack() {
        SoundManager.instance.playSound('ui.click');
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
            if (mousePos.x >= component.rect.x && mousePos.x <= component.rect.x + component.rect.width &&
                mousePos.y >= component.rect.y && mousePos.y <= component.rect.y + component.rect.height) {
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
                    if (pos.x >= component.rect.x && pos.x <= component.rect.x + component.rect.width &&
                        pos.y >= component.rect.y && pos.y <= component.rect.y + component.rect.height) {
                        
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