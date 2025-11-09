import { TOUCH_JOYSTICK_RADIUS, TOUCH_JOYSTICK_KNOB_RADIUS, TOUCH_BUTTON_SIZE, TOUCH_BUTTON_MARGIN, HOTBAR_SLOT_SIZE, HOTBAR_SLOTS } from '../core/Constants';
import { SettingsManager } from '../core/SettingsManager';
import { Vector2 } from '../types';

interface Touch {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    isUITouch?: boolean;
    uiElementId?: string; // ID of the UI element this touch started on
}

type TouchButtonType = 'jump' | 'sneak' | 'action' | 'inventory' | 'drop' | 'sprint' | 'swapHands';

interface TouchButton {
    id: TouchButtonType;
    rect: { x: number; y: number; w: number; h: number };
    isPressed: boolean;
    justPressed: boolean;
}

interface TappableRect {
    id: string;
    rect: { x: number, y: number, w: number, h: number };
    callback: () => void;
}

export class TouchHandler {
    private canvas: HTMLCanvasElement;
    private activeTouches: Map<number, Touch> = new Map();
    
    public justStartedTouches: Touch[] = [];
    public justEndedTouches: Touch[] = [];
    
    private joystickTouchId: number | null = null;
    public joystickCenter: Vector2 = { x: 0, y: 0 };
    public joystickKnob: Vector2 = { x: 0, y: 0 };
    private joystickVector: Vector2 = { x: 0, y: 0 };
    // FIX: Add isSprinting property to be managed by the TouchHandler.
    public isSprinting: boolean = false;

    private buttons: Map<TouchButtonType, TouchButton> = new Map();
    private buttonTouchIds: Map<number, TouchButtonType> = new Map();
    private joystickActivationZone: { x: number; y: number; w: number; h: number; };

    // Generic UI registration
    private tappableRects: Map<string, TappableRect> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.joystickActivationZone = { x: 0, y: 0, w: 0, h: 0 }; // Initialized in updateButtonLayout
        this.updateButtonLayout();
        this.addEventListeners();
    }

    private initializeButtons() {
        const { width, height } = this.canvas;
        const settings = SettingsManager.instance.settings;
        const guiScale = settings.graphics.guiScale;
        const size = TOUCH_BUTTON_SIZE * settings.controls.touchButtonSize;
        const margin = TOUCH_BUTTON_MARGIN;

        this.joystickActivationZone = {
            x: 0,
            y: height / 3,
            w: width / 3,
            h: height * 2/3
        };

        const hotbarSlotsWidth = HOTBAR_SLOTS * HOTBAR_SLOT_SIZE * guiScale;
        const hotbarSlotSize = HOTBAR_SLOT_SIZE * guiScale;
        const hotbarStartX = (width - hotbarSlotsWidth) / 2;
        const hotbarY = height - hotbarSlotSize - (20 * guiScale);
        const invButtonX = hotbarStartX + hotbarSlotsWidth + margin / 2;

        const buttonDefs: { id: TouchButtonType, pos: Vector2, customSize?: Vector2 }[] = [
            // Right-side main buttons
            { id: 'jump', pos: { x: width - size - margin, y: height - size - margin } },
            { id: 'sneak', pos: { x: width - size * 2 - margin * 2, y: height - size - margin } },
            { id: 'action', pos: { x: width - size - margin, y: height - size * 2 - margin * 2 } },
            { id: 'swapHands', pos: { x: width - size * 2 - margin * 2, y: height - size * 2 - margin * 2 } },
            
            // Inventory button next to hotbar
            { id: 'inventory', pos: { x: invButtonX, y: hotbarY }, customSize: { x: hotbarSlotSize, y: hotbarSlotSize } },

            // Left-side buttons
            { id: 'sprint', pos: { x: this.joystickActivationZone.w + margin, y: height - size - margin } }
        ];

        this.buttons.clear();
        buttonDefs.forEach(def => {
            const buttonSizeW = def.customSize ? def.customSize.x : size;
            const buttonSizeH = def.customSize ? def.customSize.y : size;
            this.buttons.set(def.id, {
                id: def.id,
                rect: { x: def.pos.x, y: def.pos.y, w: buttonSizeW, h: buttonSizeH },
                isPressed: false,
                justPressed: false
            });
        });
    }

    public updateButtonLayout() {
        this.initializeButtons(); // Re-calculates positions and sizes
    }
    
    public update() {
        // Reset just pressed state for all buttons at the start of the frame
        this.buttons.forEach(button => button.justPressed = false);
    }
    
    public lateUpdate() {
        this.justStartedTouches = [];
        this.justEndedTouches = [];
    }
    
    // --- Generic UI Registration ---
    public registerTappableRect(id: string, rect: { x: number, y: number, w: number, h: number }, callback: () => void) {
        this.tappableRects.set(id, { id, rect, callback });
    }

    public unregisterTappableRect(id: string) {
        this.tappableRects.delete(id);
    }
    // ---

    public getJoystick(): Vector2 { return this.joystickVector; }
    
    public isButtonPressed(id: TouchButtonType, consume: boolean = false): boolean {
        const button = this.buttons.get(id);
        if (!button) return false;
        
        if (consume) {
            const wasJustPressed = button.justPressed;
            if (wasJustPressed) {
                button.justPressed = false; // Consume the press
            }
            return wasJustPressed;
        }
        return button.isPressed;
    }
    
    public getInteractionTap(): Vector2 | null {
        // Find a tap (touch that started and ended without moving much) that wasn't on a UI element.
        for (const touch of this.justEndedTouches) {
            const dx = touch.x - touch.startX;
            const dy = touch.y - touch.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (!touch.isUITouch && distance < 20) { // Threshold for tap vs drag
                return { x: touch.x, y: touch.y };
            }
        }
        return null;
    }

    public isJoystickActive(): boolean {
        return this.joystickTouchId !== null;
    }

    public getButtons(): TouchButton[] { return Array.from(this.buttons.values()); }
    
    public getPrimaryTouchPos(): Vector2 | null {
        if (this.activeTouches.size > 0) {
            // Find the first non-UI touch if possible
            for(const touch of this.activeTouches.values()) {
                if(!touch.isUITouch) return { x: touch.x, y: touch.y };
            }
            // Otherwise, just return the first touch
            return this.activeTouches.values().next().value;
        }
        return null;
    }

    public isPrimaryTouchStarting(): boolean {
        return this.justStartedTouches.length > 0;
    }
    
    public isPrimaryTouchEnding(): boolean {
        return this.justEndedTouches.length > 0;
    }

    dispose() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }

    private addEventListeners() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }

    private getTouchPos(touch: globalThis.Touch): Vector2 {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
        };
    }

    private handleTouchStart = (event: TouchEvent) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches)) {
            const pos = this.getTouchPos(touch);
            const newTouch: Touch = { id: touch.identifier, ...pos, startX: pos.x, startY: pos.y, isUITouch: false };
            this.activeTouches.set(touch.identifier, newTouch);
            this.justStartedTouches.push(newTouch);

            // Check custom tappable rects first
            for (const tappable of this.tappableRects.values()) {
                if (pos.x > tappable.rect.x && pos.x < tappable.rect.x + tappable.rect.w &&
                    pos.y > tappable.rect.y && pos.y < tappable.rect.y + tappable.rect.h) {
                    newTouch.isUITouch = true;
                    newTouch.uiElementId = tappable.id;
                    break; // A touch can only start on one thing
                }
            }
            if (newTouch.isUITouch) continue;

            // Check if touch is on a button
            for (const button of this.buttons.values()) {
                if (pos.x > button.rect.x && pos.x < button.rect.x + button.rect.w &&
                    pos.y > button.rect.y && pos.y < button.rect.y + button.rect.h) {
                    button.isPressed = true;
                    button.justPressed = true;
                    this.buttonTouchIds.set(touch.identifier, button.id);
                    newTouch.isUITouch = true;
                    newTouch.uiElementId = button.id;
                    break;
                }
            }
            if (newTouch.isUITouch) continue;

            // Check if touch is for joystick (in defined zone)
            const zone = this.joystickActivationZone;
            if (this.joystickTouchId === null && 
                pos.x > zone.x && pos.x < zone.x + zone.w &&
                pos.y > zone.y && pos.y < zone.y + zone.h) 
            {
                this.joystickTouchId = touch.identifier;
                this.joystickCenter = { ...pos };
                this.joystickKnob = { ...pos };
                newTouch.isUITouch = true;
            }
        }
    };
    
    private handleTouchMove = (event: TouchEvent) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches)) {
            const pos = this.getTouchPos(touch);
            const activeTouch = this.activeTouches.get(touch.identifier);
            if (!activeTouch) continue;
    
            activeTouch.x = pos.x;
            activeTouch.y = pos.y;
            
            if (touch.identifier === this.joystickTouchId) {
                const dx = pos.x - this.joystickCenter.x;
                const dy = pos.y - this.joystickCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                // FIX: Add sprinting logic. Sprinting is active when the joystick is pushed to its maximum range.
                this.isSprinting = distance > TOUCH_JOYSTICK_RADIUS;

                if (distance > TOUCH_JOYSTICK_RADIUS) {
                    this.joystickKnob.x = this.joystickCenter.x + (dx / distance) * TOUCH_JOYSTICK_RADIUS;
                    this.joystickKnob.y = this.joystickCenter.y + (dy / distance) * TOUCH_JOYSTICK_RADIUS;
                } else {
                    this.joystickKnob = { ...pos };
                }
                
                let moveX = dx / TOUCH_JOYSTICK_RADIUS;
                if (Math.abs(moveX) > 1) moveX = Math.sign(moveX);
                this.joystickVector.x = moveX;
            }
    
            const buttonId = this.buttonTouchIds.get(touch.identifier);
            if (buttonId) {
                const button = this.buttons.get(buttonId);
                if (button) {
                    const isInside = (
                        pos.x > button.rect.x && pos.x < button.rect.x + button.rect.w &&
                        pos.y > button.rect.y && pos.y < button.rect.y + button.rect.h
                    );
                    button.isPressed = isInside;
                }
            }
        }
    };

    private handleTouchEnd = (event: TouchEvent) => {
        event.preventDefault();
        for (const touch of Array.from(event.changedTouches)) {
            const endedTouch = this.activeTouches.get(touch.identifier);
            if (endedTouch) {
                this.justEndedTouches.push({ ...endedTouch });
                
                // --- Handle Tappable Rect Logic ---
                const dx = endedTouch.x - endedTouch.startX;
                const dy = endedTouch.y - endedTouch.startY;
                const distanceSq = dx * dx + dy * dy;

                if (endedTouch.uiElementId && distanceSq < 20 * 20) { // It's a tap
                    const tappable = this.tappableRects.get(endedTouch.uiElementId);
                    tappable?.callback();
                }
                // ---
            }

            this.activeTouches.delete(touch.identifier);
            
            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.joystickVector.x = 0;
                this.joystickVector.y = 0;
                // FIX: Reset sprinting state when joystick is released.
                this.isSprinting = false;
            }

            const buttonId = this.buttonTouchIds.get(touch.identifier);
            if (buttonId) {
                const button = this.buttons.get(buttonId);
                if (button) button.isPressed = false;
                this.buttonTouchIds.delete(touch.identifier);
            }
        }
    };
}