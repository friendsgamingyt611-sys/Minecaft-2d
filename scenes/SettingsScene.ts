

import { SettingsManager } from '../core/SettingsManager';
import { Settings, Vector2 } from '../types';
import { Scene, SceneManager } from './SceneManager';

export class SettingsScene implements Scene {
    private sceneManager: SceneManager;
    private tempSettings: Settings;
    private uiComponents: any[] = [];
    private hoveredComponent: any | null = null;
    private draggingComponent: any | null = null;

    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;
        this.tempSettings = JSON.parse(JSON.stringify(SettingsManager.instance.settings)); // Deep copy
        this.createUI();
    }

    private createUI() {
        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        const cx = canvas.width / 2;

        this.uiComponents = [
            // Graphics
            this.createToggle(cx - 150, 200, 300, 'Render Interactive Area', 'renderInteractiveArea'),
            // Controls
            this.createDropdown(cx - 150, 260, 300, 'Controls', 'controlScheme', ['auto', 'keyboard', 'touch']),
            this.createSlider(cx-150, 320, 300, 'Touch Button Size', 'touchButtonSize', 0.5, 1.5, 0.1),
            this.createSlider(cx-150, 380, 300, 'Touch Button Opacity', 'touchButtonOpacity', 0.2, 1.0, 0.1),

            // Done Button
            {
                type: 'button',
                rect: { x: cx - 100, y: canvas.height - 100, w: 200, h: 50 },
                label: 'Done',
                onClick: () => {
                    SettingsManager.instance.save(this.tempSettings);
                    this.sceneManager.popScene();
                }
            }
        ];
    }
    
    private createSlider(x: number, y: number, w: number, label: string, key: keyof Settings, min: number, max: number, step: number) {
        return {
            type: 'slider',
            rect: { x, y, w, h: 40 },
            label, key, min, max, step,
            getValue: () => this.tempSettings[key] as number,
            setValue: (val: number) => { (this.tempSettings as any)[key] = val; }
        };
    }

    private createDropdown(x: number, y: number, w: number, label: string, key: keyof Settings, options: string[]) {
        return {
            type: 'dropdown',
            rect: { x, y, w, h: 40 },
            label, key, options,
            getValue: () => this.tempSettings[key],
            cycle: () => {
                const current = this.tempSettings[key] as string;
                const currentIndex = options.indexOf(current);
                const nextIndex = (currentIndex + 1) % options.length;
                (this.tempSettings as any)[key] = options[nextIndex];
            }
        };
    }

    private createToggle(x: number, y: number, w: number, label: string, key: keyof Settings) {
        return {
            type: 'dropdown', // Re-use dropdown rendering logic
            rect: { x, y, w, h: 40 },
            label, key,
            getValue: () => this.tempSettings[key] ? 'On' : 'Off',
            cycle: () => {
                (this.tempSettings as any)[key] = !this.tempSettings[key];
            }
        };
    }

    enter(): void {
    }

    exit(): void {
        if(this.sceneManager.touchHandler) {
            this.sceneManager.touchHandler.updateButtonLayout();
        }
    }

    private updateSlider(component: any, pos: Vector2) {
        const relativeX = Math.max(0, Math.min(component.rect.w, pos.x - component.rect.x));
        const percentage = relativeX / component.rect.w;
        let value = component.min + (component.max - component.min) * percentage;
        value = Math.round(value / component.step) * component.step;
        component.setValue(value);
    }

    update(deltaTime: number): void {
        const mousePos = this.sceneManager.mouseHandler.position;
        const touchPos = this.sceneManager.touchHandler.getPrimaryTouchPos();
        const cursor = touchPos || mousePos;

        if (this.draggingComponent) {
            this.updateSlider(this.draggingComponent, cursor);
        } else {
            this.hoveredComponent = null;
            for (const comp of this.uiComponents) {
                if (mousePos.x >= comp.rect.x && mousePos.x <= comp.rect.x + comp.rect.w &&
                    mousePos.y >= comp.rect.y && mousePos.y <= comp.rect.y + comp.rect.h) {
                    this.hoveredComponent = comp;
                    break;
                }
            }
        }

        // Handle start of interaction
        if (this.sceneManager.mouseHandler.isLeftClicked || this.sceneManager.touchHandler.isPrimaryTouchStarting()) {
            const startPos = this.sceneManager.touchHandler.isPrimaryTouchStarting() ? this.sceneManager.touchHandler.justStartedTouches[0] : mousePos;
            
            let componentClicked = null;
            for (const comp of this.uiComponents) {
                 if (startPos.x >= comp.rect.x && startPos.x <= comp.rect.x + comp.rect.w &&
                    startPos.y >= comp.rect.y && startPos.y <= comp.rect.y + comp.rect.h) {
                    componentClicked = comp;
                    break;
                }
            }

            if (componentClicked) {
                if (componentClicked.type === 'slider') {
                    this.draggingComponent = componentClicked;
                    this.updateSlider(this.draggingComponent, startPos); // Update immediately on click
                } else if (componentClicked.onClick) {
                    componentClicked.onClick();
                } else if (componentClicked.cycle) {
                    componentClicked.cycle();
                }
            }
        }
        
        // Handle end of interaction
        if (this.sceneManager.mouseHandler.isLeftUp || this.sceneManager.touchHandler.isPrimaryTouchEnding()) {
            this.draggingComponent = null;
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
        ctx.strokeText("Settings", ctx.canvas.width / 2, 120);
        ctx.fillText("Settings", ctx.canvas.width / 2, 120);

        this.uiComponents.forEach(comp => {
            const isHovered = comp === this.hoveredComponent;
            this.renderComponent(ctx, comp, isHovered);
        });
    }
    
    private renderComponent(ctx: CanvasRenderingContext2D, comp: any, isHovered: boolean) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        switch(comp.type) {
            case 'slider':
                this.renderSlider(ctx, comp, isHovered);
                break;
            case 'dropdown':
                this.renderDropdown(ctx, comp, isHovered);
                break;
            case 'button':
                this.renderButton(ctx, comp, isHovered);
                break;
        }
    }
    
    private renderSlider(ctx: CanvasRenderingContext2D, comp: any, isHovered: boolean) {
        const { x, y, w, h } = comp.rect;
        const value = comp.getValue();
        const percentage = (value - comp.min) / (comp.max - comp.min);

        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(comp.label, x, y - 15);
        
        // Bar background
        ctx.fillStyle = '#383838';
        ctx.fillRect(x, y, w, h);

        // Bar fill
        ctx.fillStyle = isHovered || this.draggingComponent === comp ? '#a0a0a0' : '#7f7f7f';
        ctx.fillRect(x, y, w * percentage, h);
        
        // Knob
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + w * percentage - 5, y, 10, h);
        
        // Value Text
        ctx.font = "20px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(1), x + w, y - 15);
    }
    
    private renderDropdown(ctx: CanvasRenderingContext2D, comp: any, isHovered: boolean) {
        const { x, y, w, h } = comp.rect;
        this.renderButton(ctx, comp, isHovered, `${comp.label}: < ${comp.getValue()} >`);
    }

    private renderButton(ctx: CanvasRenderingContext2D, comp: any, isHovered: boolean, label?: string) {
        const { x, y, w, h } = comp.rect;
        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 4;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(label || comp.label, x + w / 2, y + h / 2);
    }
}