
import { Scene, SceneManager } from './SceneManager';
import { ProfileManager } from '../core/ProfileManager';
import { VirtualKeyboard } from '../input/VirtualKeyboard';
import { Vector2 } from '../types';
import { SoundManager } from '../core/SoundManager';
import { TitleScene } from './TitleScene';
import { SettingsManager } from '../core/SettingsManager';

// --- UI Components for this Scene ---
interface UIComponent {
    rect: {x: number, y: number, width: number, height: number};
    render(ctx: CanvasRenderingContext2D, isHovered: boolean, isActive: boolean): void;
    onClick?(): void;
}

class InputBox implements UIComponent {
    text: string = '';
    private cursorVisible: boolean = true;
    private cursorTimer: number = 0;
    public error: string | null = null;
    
    constructor(public rect: {x: number, y: number, width: number, height: number}, public placeholder: string) {}
    
    update(deltaTime: number) {
        this.cursorTimer += deltaTime;
        if (this.cursorTimer > 0.5) {
            this.cursorVisible = !this.cursorVisible;
            this.cursorTimer = 0;
        }
    }
    
    render(ctx: CanvasRenderingContext2D, isHovered: boolean, isActive: boolean): void {
        const borderColor = this.error ? '#ff5555' : (isActive ? '#ffffff' : '#000000');
        ctx.fillStyle = '#383838';
        ctx.strokeStyle = borderColor;
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

class ColorCycler implements UIComponent {
    public currentIndex: number = 0;
    constructor(public rect: {x: number, y: number, width: number, height: number}, public label: string, public colors: string[]) {}
    
    onClick() {
        this.currentIndex = (this.currentIndex + 1) % this.colors.length;
        SoundManager.instance.playSound('ui.click');
    }

    render(ctx: CanvasRenderingContext2D, isHovered: boolean): void {
        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.rect.x + 10, this.rect.y + this.rect.height / 2);

        ctx.fillStyle = this.colors[this.currentIndex];
        ctx.fillRect(this.rect.x + this.rect.width - 50, this.rect.y + 10, this.rect.width / 4, this.rect.height - 20);
    }
}

// --- Scene Implementation ---
export class ProfileCreationScene implements Scene {
    private sceneManager: SceneManager;
    private nameInput: InputBox;
    private skinColorCycler: ColorCycler;
    private hairColorCycler: ColorCycler;
    private shirtColorCycler: ColorCycler;
    private pantsColorCycler: ColorCycler;
    private uiComponents: UIComponent[];
    private activeComponent: UIComponent | null = null;
    private hoverComponent: UIComponent | null = null;
    
    private readonly SKIN_COLORS = ['#c58c6b', '#f2d2b1', '#a05b3e', '#59321c'];
    private readonly HAIR_COLORS = ['#382b1c', '#e6af49', '#914620', '#dcdcdc', '#1e1e1e'];
    private readonly SHIRT_COLORS = ['#4ca7a7', '#a74c4c', '#4ca75a', '#a79d4c', '#8a4ca7'];
    private readonly PANTS_COLORS = ['#3a3a99', '#555555', '#2a643b', '#6b4d3b'];

    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;
        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        const cx = canvas.width / 2;

        this.nameInput = new InputBox({x: cx - 200, y: 220, width: 400, height: 50}, 'Enter Name');
        
        this.skinColorCycler = new ColorCycler({x: cx - 200, y: 300, width: 400, height: 50}, 'Skin Color', this.SKIN_COLORS);
        this.hairColorCycler = new ColorCycler({x: cx - 200, y: 360, width: 400, height: 50}, 'Hair Color', this.HAIR_COLORS);
        this.shirtColorCycler = new ColorCycler({x: cx - 200, y: 420, width: 400, height: 50}, 'Shirt Color', this.SHIRT_COLORS);
        this.pantsColorCycler = new ColorCycler({x: cx - 200, y: 480, width: 400, height: 50}, 'Pants Color', this.PANTS_COLORS);

        const createButton = {
            rect: {x: cx - 100, y: 560, width: 200, height: 50},
            render: (ctx: CanvasRenderingContext2D, isHovered: boolean) => { /* Render logic for button */ 
                ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
                ctx.fillRect(cx - 100, 560, 200, 50);
                ctx.font = "30px Minecraftia"; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText("Create", cx, 560 + 25);
            },
            onClick: () => this.createProfile()
        };

        this.uiComponents = [this.nameInput, this.skinColorCycler, this.hairColorCycler, this.shirtColorCycler, this.pantsColorCycler, createButton];
    }

    enter() {
        window.addEventListener('keydown', this.handlePhysicalKeyDown);
    }
    exit() {
        VirtualKeyboard.instance.hide();
        window.removeEventListener('keydown', this.handlePhysicalKeyDown);
    }

    private handlePhysicalKeyDown = (event: KeyboardEvent) => {
        if (this.activeComponent !== this.nameInput) return;
        
        // Let the VirtualKeyboard's input event handler do the actual text modification.
        // This scene's handler just manages key presses like Enter.
        if (event.key === 'Enter') {
            this.createProfile();
        }
        // Bug Fix: Removed manual text appending to prevent double characters.
        // The VirtualKeyboard's `onInput` callback is the single source of truth for text changes.
    };

    private createProfile() {
        const name = this.nameInput.text.trim();
        const validNameRegex = /^[a-zA-Z0-9_]{3,16}$/;
        if (!validNameRegex.test(name)) {
            this.nameInput.error = "Invalid name (3-16 chars, letters, numbers, _)";
            return;
        }
        this.nameInput.error = null;

        ProfileManager.instance.createProfile(name, {
            skinColor: this.skinColorCycler.colors[this.skinColorCycler.currentIndex],
            hairColor: this.hairColorCycler.colors[this.hairColorCycler.currentIndex],
            shirtColor: this.shirtColorCycler.colors[this.shirtColorCycler.currentIndex],
            pantsColor: this.pantsColorCycler.colors[this.pantsColorCycler.currentIndex],
        });
        
        SoundManager.instance.playSound('ui.click');
        this.sceneManager.switchScene(new TitleScene(this.sceneManager));
    }

    update(deltaTime: number): void {
        const mousePos = this.sceneManager.mouseHandler.position;
        
        this.hoverComponent = null;
        // Hover detection is mouse-only, check if not on touch device
        if (SettingsManager.instance.getEffectiveControlScheme() === 'keyboard') {
            for (const component of this.uiComponents) {
                if (mousePos.x >= component.rect.x && mousePos.x <= component.rect.x + component.rect.width &&
                    mousePos.y >= component.rect.y && mousePos.y <= component.rect.y + component.rect.height) {
                    this.hoverComponent = component;
                    break;
                }
            }
        }
        
        // Combine mouse clicks and touch taps for interaction
        const interactionPoints: Vector2[] = [...this.sceneManager.touchHandler.justEndedTouches];
        if (this.sceneManager.mouseHandler.isLeftClicked) {
            interactionPoints.push(this.sceneManager.mouseHandler.position);
        }

        let didInteractWithComponent = false;
        if (interactionPoints.length > 0) {
            for (const pos of interactionPoints) {
                for (const component of this.uiComponents) {
                    if (pos.x >= component.rect.x && pos.x <= component.rect.x + component.rect.width &&
                        pos.y >= component.rect.y && pos.y <= component.rect.y + component.rect.height) {
                        
                        didInteractWithComponent = true;
                        
                        if (component === this.nameInput) {
                            this.activeComponent = this.nameInput;
                            VirtualKeyboard.instance.show({
                                text: this.nameInput.text,
                                onInput: (t) => this.nameInput.text = t,
                                onEnter: () => this.createProfile(),
                                onBlur: () => { if (this.activeComponent === this.nameInput) this.activeComponent = null; }
                            });
                        } else {
                            this.activeComponent = null;
                            VirtualKeyboard.instance.hide();
                            if (component.onClick) {
                                component.onClick();
                            }
                        }
                        break; // Process one component per interaction point
                    }
                }
                if (didInteractWithComponent) break; // Process one interaction point per frame
            }
            
            if (!didInteractWithComponent) {
                this.activeComponent = null;
                VirtualKeyboard.instance.hide();
            }
        }

        if (this.activeComponent instanceof InputBox) this.activeComponent.update(deltaTime);
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#63a3ff';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.font = "60px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 7;
        ctx.strokeText("Create Your Character", ctx.canvas.width / 2, 150);
        ctx.fillText("Create Your Character", ctx.canvas.width / 2, 150);

        this.uiComponents.forEach(c => c.render(ctx, c === this.hoverComponent, c === this.activeComponent));

        if (this.nameInput.error) {
            ctx.font = "18px Minecraftia";
            ctx.fillStyle = '#ffdddd';
            ctx.textAlign = 'center';
            ctx.fillText(this.nameInput.error, ctx.canvas.width / 2, this.nameInput.rect.y + this.nameInput.rect.height + 15);
        }
    }
}
