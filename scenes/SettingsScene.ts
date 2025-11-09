
import { SettingsManager } from '../core/SettingsManager';
import { GlobalSettings, GraphicsSettings, AudioSettings, ControlsSettings, GameplaySettings, AccessibilitySettings, Vector2 } from '../types';
import { Scene, SceneManager } from './SceneManager';
import { SoundManager } from '../core/SoundManager';

type SettingsCategory = 'Graphics' | 'Audio' | 'Controls' | 'Gameplay' | 'Accessibility';
type UIComponentType = 'slider' | 'dropdown' | 'toggle' | 'button';

interface UIComponent {
    type: UIComponentType;
    rect: { x: number; y: number; w: number; h: number };
    label: string;
    description: string;
    category: SettingsCategory;
    key?: keyof GraphicsSettings | keyof AudioSettings | keyof ControlsSettings | keyof GameplaySettings | keyof AccessibilitySettings;
    options?: any[]; // for dropdown
    min?: number; max?: number; step?: number; // for slider
    onClick?: () => void;
}

export class SettingsScene implements Scene {
    private sceneManager: SceneManager;
    private tempSettings: GlobalSettings;
    private uiComponents: UIComponent[] = [];
    private categoryButtons: { label: SettingsCategory, rect: any }[] = [];
    
    private activeCategory: SettingsCategory = 'Graphics';
    private hoveredComponent: any | null = null;
    private draggingComponent: any | null = null;
    private tooltipTarget: UIComponent | null = null;

    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;
        this.tempSettings = JSON.parse(JSON.stringify(SettingsManager.instance.settings)); // Deep copy
        this.createUI();
    }

    private createUI() {
        const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
        const catX = 50, catY = 150, catW = 250, catH = 60, catS = 15;
        const categories: SettingsCategory[] = ['Graphics', 'Audio', 'Controls', 'Gameplay', 'Accessibility'];
        this.categoryButtons = categories.map((label, i) => ({
            label,
            rect: { x: catX, y: catY + i * (catH + catS), w: catW, h: catH }
        }));

        this.createGraphicsSettings();
        this.createAudioSettings();
        this.createControlsSettings();
        this.createGameplaySettings();
        this.createAccessibilitySettings();

        // Bottom buttons
        this.uiComponents.push(
            { type: 'button', rect: { x: canvas.width - 450, y: canvas.height - 80, w: 200, h: 50}, label: 'Apply', description: 'Save and apply changes.', category: 'Graphics', onClick: () => this.applyAndExit() },
            { type: 'button', rect: { x: canvas.width - 230, y: canvas.height - 80, w: 200, h: 50}, label: 'Cancel', description: 'Discard changes and go back.', category: 'Graphics', onClick: () => this.sceneManager.popScene() }
        );
    }

    private createGraphicsSettings() {
        const startX = 350, startY = 150, width = 500, height = 40, spacing = 55;
        this.uiComponents.push(
            { type: 'slider', rect: { x: startX, y: startY, w: width, h: height }, label: 'FOV', description: 'Field of View. Higher is wider.', category: 'Graphics', key: 'fov', min: 30, max: 110, step: 1 },
            { type: 'slider', rect: { x: startX, y: startY + spacing, w: width, h: height }, label: 'Render Distance', description: 'How many chunks to render.', category: 'Graphics', key: 'renderDistance', min: 2, max: 16, step: 1 },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * 2, w: width, h: height }, label: 'View Bobbing', description: 'Sways camera when walking.', category: 'Graphics', key: 'viewBobbing' },
            { type: 'dropdown', rect: { x: startX, y: startY + spacing * 3, w: width, h: height }, label: 'Clouds', description: 'Visual quality of clouds.', category: 'Graphics', key: 'clouds', options: ['Off', 'Fast', 'Fancy'] },
            { type: 'dropdown', rect: { x: startX, y: startY + spacing * 4, w: width, h: height }, label: 'Particles', description: 'Amount of visible particles.', category: 'Graphics', key: 'particleEffects', options: ['All', 'Decreased', 'Minimal', 'Off'] },
            { type: 'dropdown', rect: { x: startX, y: startY + spacing * 5, w: width, h: height }, label: 'FPS Limit', description: 'Cap the game framerate.', category: 'Graphics', key: 'fpsLimit', options: [30, 60, 120, 0] }
        );
    }
    
    private createAudioSettings() {
        const startX = 350, startY = 150, width = 500, height = 40, spacing = 55;
        this.uiComponents.push(
            { type: 'slider', rect: { x: startX, y: startY, w: width, h: height }, label: 'Master Volume', description: 'Overall game volume.', category: 'Audio', key: 'masterVolume', min: 0, max: 100, step: 1 },
            { type: 'slider', rect: { x: startX, y: startY + spacing, w: width, h: height }, label: 'Music', description: 'Volume of background music.', category: 'Audio', key: 'musicVolume', min: 0, max: 100, step: 1 },
            { type: 'slider', rect: { x: startX, y: startY + spacing * 2, w: width, h: height }, label: 'Block Sounds', description: 'Volume of block interactions.', category: 'Audio', key: 'blockSounds', min: 0, max: 100, step: 1 },
            { type: 'slider', rect: { x: startX, y: startY + spacing * 3, w: width, h: height }, label: 'Player Sounds', description: 'Volume of player actions.', category: 'Audio', key: 'playerSounds', min: 0, max: 100, step: 1 },
            { type: 'slider', rect: { x: startX, y: startY + spacing * 4, w: width, h: height }, label: 'UI Sounds', description: 'Volume of interface sounds.', category: 'Audio', key: 'uiSounds', min: 0, max: 100, step: 1 }
        );
    }
    
    private createControlsSettings() {
        const startX = 350, startY = 150, width = 500, height = 40, spacing = 55;
        this.uiComponents.push(
            { type: 'dropdown', rect: { x: startX, y: startY, w: width, h: height }, label: 'Control Scheme', description: 'Auto-detect or force controls.', category: 'Controls', key: 'controlScheme', options: ['auto', 'touch', 'keyboard'] },
            { type: 'slider', rect: { x: startX, y: startY + spacing, w: width, h: height }, label: 'Touch Button Size', description: 'Size of on-screen buttons.', category: 'Controls', key: 'touchButtonSize', min: 0.5, max: 2.0, step: 0.1 },
            { type: 'slider', rect: { x: startX, y: startY + spacing * 2, w: width, h: height }, label: 'Touch Button Opacity', description: 'Transparency of buttons.', category: 'Controls', key: 'touchButtonOpacity', min: 0, max: 1, step: 0.1 },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * 3, w: width, h: height }, label: 'Auto-Jump', description: 'Automatically jump up 1-block steps.', category: 'Controls', key: 'autoJump' },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * 4, w: width, h: height }, label: 'Toggle Sprint', description: 'Tap to sprint instead of hold.', category: 'Controls', key: 'toggleSprint' },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * 5, w: width, h: height }, label: 'Toggle Crouch', description: 'Tap to sneak instead of hold.', category: 'Controls', key: 'toggleCrouch' }
        );
    }

    private createGameplaySettings() {
        const startX = 350, startY = 150, width = 500, height = 40, spacing = 55;
        let i = 0;
        this.uiComponents.push(
            { type: 'dropdown', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Difficulty', description: 'Game difficulty (affects new worlds).', category: 'Gameplay', key: 'difficulty', options: ['Peaceful', 'Easy', 'Normal', 'Hard'] },
            { type: 'dropdown', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Daylight Cycle', description: 'Control the flow of time.', category: 'Gameplay', key: 'daylightCycle', options: ['On', 'Off', 'Locked Day', 'Locked Night'] },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Show FPS', description: 'Display frames per second.', category: 'Gameplay', key: 'showFps' },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Show Coordinates', description: 'Display player X/Y coordinates.', category: 'Gameplay', key: 'showCoordinates' },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Show Reach Radius', description: 'Display a circle for interaction range.', category: 'Gameplay', key: 'renderInteractiveArea' },
            { type: 'dropdown', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Nametag Distance', description: 'When to show player nametags.', category: 'Gameplay', key: 'nametagDistance', options: ['Always', '16 Blocks', 'Never'] },
            { type: 'slider', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Nametag Opacity', description: 'Transparency of player nametags.', category: 'Gameplay', key: 'nametagOpacity', min: 0, max: 100, step: 1 },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * i++, w: width, h: height }, label: 'Nametag Background', description: 'Show a dark background behind nametags.', category: 'Gameplay', key: 'nametagBackground' }
        );
    }
    
    private createAccessibilitySettings() {
        const startX = 350, startY = 150, width = 500, height = 40, spacing = 55;
        this.uiComponents.push(
            { type: 'toggle', rect: { x: startX, y: startY, w: width, h: height }, label: 'Large Text', description: 'Increases text size in menus.', category: 'Accessibility', key: 'largeText' },
            { type: 'toggle', rect: { x: startX, y: startY + spacing, w: width, h: height }, label: 'High Contrast', description: 'Improves color contrast in UI.', category: 'Accessibility', key: 'highContrast' },
            { type: 'toggle', rect: { x: startX, y: startY + spacing * 2, w: width, h: height }, label: 'Reduced Motion', description: 'Reduces screen effects like bobbing.', category: 'Accessibility', key: 'reducedMotion' }
        );
    }
    
    private applyAndExit() {
        SettingsManager.instance.save(this.tempSettings);
        if (this.sceneManager.touchHandler) this.sceneManager.touchHandler.updateButtonLayout();
        SoundManager.instance.updateMusicVolume();
        SoundManager.instance.playSound('ui.click');
        this.sceneManager.popScene();
    }

    enter() {}
    exit() {}
    
    private getComponentValue(comp: UIComponent): any {
        const categoryKey = comp.category.toLowerCase() as keyof GlobalSettings;
        return (this.tempSettings[categoryKey] as any)[comp.key!];
    }
    
    private setComponentValue(comp: UIComponent, value: any) {
        const categoryKey = comp.category.toLowerCase() as keyof GlobalSettings;
        (this.tempSettings[categoryKey] as any)[comp.key!] = value;
        if (comp.category === 'Audio') SoundManager.instance.updateMusicVolume();
    }

    update(deltaTime: number): void {
        const mousePos = this.sceneManager.mouseHandler.position;
        const currentComponents = this.uiComponents.filter(c => c.category === this.activeCategory || c.type === 'button');
        
        // --- Hover & Tooltip Logic (Mouse Only) ---
        this.tooltipTarget = null;
        this.hoveredComponent = null;
        if (!this.draggingComponent && SettingsManager.instance.getEffectiveControlScheme() === 'keyboard') {
            for (const comp of [...currentComponents, ...this.categoryButtons]) {
                if (this.isPosInRect(mousePos, comp.rect)) {
                    this.hoveredComponent = comp;
                    if ('description' in comp) this.tooltipTarget = comp as UIComponent;
                    break;
                }
            }
        }

        // --- Slider Drag Logic (Mouse) ---
        if (this.draggingComponent && this.sceneManager.mouseHandler.isLeftDown) {
            this.updateSlider(this.draggingComponent, mousePos);
        } else if (this.sceneManager.mouseHandler.isLeftUp) {
            this.draggingComponent = null;
        }
        
        // --- Click/Tap Interaction Logic ---
        const interactionPoints: Vector2[] = [...this.sceneManager.touchHandler.justEndedTouches];
        if (this.sceneManager.mouseHandler.isLeftClicked) {
            interactionPoints.push(this.sceneManager.mouseHandler.position);
        }

        if (interactionPoints.length > 0) {
            const pos = interactionPoints[0]; // Process one interaction per frame to avoid multi-taps
            let interacted = false;

            // Check category buttons
            for (const cat of this.categoryButtons) {
                if (this.isPosInRect(pos, cat.rect)) {
                    this.activeCategory = cat.label;
                    SoundManager.instance.playSound('ui.click');
                    interacted = true;
                    break;
                }
            }

            if (interacted) return; // Don't process other components if a category was clicked

            // Check UI components in the active category
            for (const comp of currentComponents) {
                if (this.isPosInRect(pos, comp.rect)) {
                    if (comp.type === 'slider') {
                        // For mouse, this starts a drag. For touch, it just sets the value.
                        if (SettingsManager.instance.getEffectiveControlScheme() === 'keyboard') {
                            this.draggingComponent = comp;
                        }
                        this.updateSlider(comp, pos);
                    } else if (comp.type === 'toggle') {
                        this.setComponentValue(comp, !this.getComponentValue(comp));
                        SoundManager.instance.playSound('ui.click');
                    } else if (comp.type === 'dropdown') {
                        const current = this.getComponentValue(comp);
                        const currentIndex = comp.options!.indexOf(current);
                        const nextIndex = (currentIndex + 1) % comp.options!.length;
                        this.setComponentValue(comp, comp.options![nextIndex]);
                        SoundManager.instance.playSound('ui.click');
                    } else if (comp.onClick) {
                        comp.onClick();
                    }
                    interacted = true;
                    break;
                }
            }
        }
    }

    private updateSlider(comp: UIComponent, pos: Vector2) {
        const barW = comp.rect.w * 0.4;
        const barX = comp.rect.x + comp.rect.w - barW;
        
        const relativeX = Math.max(0, Math.min(barW, pos.x - barX));
        const percentage = relativeX / barW;
        let value = comp.min! + (comp.max! - comp.min!) * percentage;
        value = Math.round(value / comp.step!) * comp.step!;
        this.setComponentValue(comp, value);
    }
    
    private isPosInRect(pos: Vector2, rect: { x: number, y: number, w: number, h: number }): boolean {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h;
    }

    // --- Accessibility Helpers ---
    private getTextColor(): string { return this.tempSettings.accessibility.highContrast ? '#FFFFFF' : '#ffffff'; }
    private getBgColor(): string { return this.tempSettings.accessibility.highContrast ? '#000000' : '#1e1e1e'; }
    private getPanelColor(): string { return this.tempSettings.accessibility.highContrast ? '#111111' : '#383838'; }
    private getButtonColor(isHovered: boolean): string { return this.tempSettings.accessibility.highContrast ? (isHovered ? '#DDDDDD' : '#BBBBBB') : (isHovered ? '#9a9a9a' : '#7f7f7f'); }
    private getActiveButtonColor(isHovered: boolean): string { return this.tempSettings.accessibility.highContrast ? (isHovered ? '#EEEEEE' : '#DDDDDD') : (isHovered ? '#b0b0b0' : '#b0b0b0'); }
    private getFont(baseSize: number): string { return `${baseSize * (this.tempSettings.accessibility.largeText ? 1.25 : 1)}px Minecraftia`; }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.getBgColor();
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.fillStyle = this.getPanelColor();
        ctx.fillRect(20, 20, ctx.canvas.width - 40, ctx.canvas.height - 40);

        ctx.font = this.getFont(60);
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'center';
        ctx.fillText("Settings", ctx.canvas.width / 2, 80);

        this.categoryButtons.forEach(cat => {
            const isHovered = this.hoveredComponent === cat;
            const isActive = this.activeCategory === cat.label;
            ctx.fillStyle = isActive ? this.getActiveButtonColor(isHovered) : this.getButtonColor(isHovered);
            ctx.fillRect(cat.rect.x, cat.rect.y, cat.rect.w, cat.rect.h);
            ctx.font = this.getFont(30);
            ctx.fillStyle = this.getTextColor();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cat.label, cat.rect.x + cat.rect.w / 2, cat.rect.y + cat.rect.h / 2);
        });

        this.uiComponents.filter(c => c.category === this.activeCategory || c.type === 'button').forEach(c => {
            this.renderComponent(ctx, c);
        });
        
        this.renderTooltip(ctx);
    }
    
    private renderComponent(ctx: CanvasRenderingContext2D, comp: UIComponent) {
        const isHovered = this.hoveredComponent === comp;
        switch (comp.type) {
            case 'slider': this.renderSlider(ctx, comp, isHovered); break;
            case 'dropdown': this.renderDropdown(ctx, comp, isHovered); break;
            case 'toggle': this.renderToggle(ctx, comp, isHovered); break;
            case 'button': this.renderButton(ctx, comp, isHovered); break;
        }
    }
    
    private renderSlider(ctx: CanvasRenderingContext2D, comp: UIComponent, isHovered: boolean) {
        const { x, y, w, h } = comp.rect;
        const value = this.getComponentValue(comp);
        const percentage = (value - comp.min!) / (comp.max! - comp.min!);

        ctx.font = this.getFont(24);
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        let valueText = `${value}`;
        if (comp.key === 'touchButtonOpacity') valueText = `${Math.round(value*100)}%`;
        else if (comp.key === 'nametagOpacity') valueText = `${Math.round(value)}%`;
        else if (comp.key === 'touchButtonSize') valueText = `${value.toFixed(1)}x`;

        ctx.fillText(`${comp.label}: ${valueText}`, x, y + h / 2);
        
        const barY = y + 5;
        const barH = h - 10;
        const barW = w * 0.4;
        const barX = x + w - barW;
        
        ctx.fillStyle = this.getPanelColor(); ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = this.getButtonColor(isHovered); ctx.fillRect(barX + 2, barY + 2, barW * percentage - 4, barH - 4);
    }

    private renderDropdown(ctx: CanvasRenderingContext2D, comp: UIComponent, isHovered: boolean) {
        const { x, y, w, h } = comp.rect;
        const value = this.getComponentValue(comp);
        const valText = comp.key === 'fpsLimit' && value === 0 ? 'Unlimited' : value;
        
        ctx.font = this.getFont(24);
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(comp.label, x, y + h / 2);
        
        const btnW = w * 0.4;
        const btnX = x + w - btnW;
        
        ctx.fillStyle = this.getButtonColor(isHovered);
        ctx.fillRect(btnX, y, btnW, h);
        
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'center';
        ctx.fillText(`< ${valText} >`, btnX + btnW / 2, y + h / 2);
    }

    private renderToggle(ctx: CanvasRenderingContext2D, comp: UIComponent, isHovered: boolean) {
        comp.options = ['On', 'Off'];
        const value = this.getComponentValue(comp) ? 'On' : 'Off';
        
        const { x, y, w, h } = comp.rect;
        ctx.font = this.getFont(24);
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(comp.label, x, y + h / 2);

        const btnW = w * 0.4;
        const btnX = x + w - btnW;
        
        ctx.fillStyle = this.getButtonColor(isHovered);
        ctx.fillRect(btnX, y, btnW, h);
        
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'center';
        ctx.fillText(value, btnX + btnW / 2, y + h / 2);
    }
    
    private renderButton(ctx: CanvasRenderingContext2D, comp: UIComponent, isHovered: boolean) {
        ctx.fillStyle = this.getButtonColor(isHovered);
        ctx.fillRect(comp.rect.x, comp.rect.y, comp.rect.w, comp.rect.h);
        ctx.font = this.getFont(24);
        ctx.fillStyle = this.getTextColor();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(comp.label, comp.rect.x + comp.rect.w / 2, comp.rect.y + comp.rect.h / 2);
    }
    
    private renderTooltip(ctx: CanvasRenderingContext2D) {
        if (!this.tooltipTarget) return;

        const mousePos = this.sceneManager.mouseHandler.position;
        const text = this.tooltipTarget.description;
        ctx.font = this.getFont(18);
        const metrics = ctx.measureText(text);
        const width = metrics.width + 20;
        const height = 40 * (this.tempSettings.accessibility.largeText ? 1.25 : 1);
        const x = mousePos.x + 15;
        const y = mousePos.y + 15;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 10, y + height / 2);
    }
}
