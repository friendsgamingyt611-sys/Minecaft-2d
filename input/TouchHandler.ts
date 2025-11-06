

import { TOUCH_JOYSTICK_RADIUS, TOUCH_JOYSTICK_KNOB_RADIUS, TOUCH_BUTTON_SIZE, TOUCH_BUTTON_MARGIN, HOTBAR_SLOT_SIZE } from '../core/Constants';
import { SettingsManager } from '../core/SettingsManager';
import { Vector2 } from '../types';

interface Touch {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    isUITouch?: boolean;
}

type TouchButtonType = 'jump' | 'sneak' | 'action' | 'inventory' | 'drop' | 'sprint';

interface TouchButton {
    id: TouchButtonType;
    rect: { x: number; y: number; w: number; h: number };
    isPressed: boolean;
    justPressed: boolean;
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

    private buttons: Map<TouchButtonType, TouchButton> = new Map();
    private buttonTouchIds: Map<number, TouchButtonType> = new Map();
    private joystickActivationZone: { x: number; y: number; w: number; h: number; };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.joystickActivationZone = { x: 0, y: 0, w: 0, h: 0 }; // Initialized in updateButtonLayout
        this.updateButtonLayout();
        this.addEventListeners();
    }

    private initializeButtons() {
        const { width, height } = this.canvas;
        const settings = SettingsManager.instance.settings;
        const size = TOUCH_BUTTON_SIZE * settings.touchButtonSize;
        const margin = TOUCH_BUTTON_MARGIN;

        // Define joystick zone first as other buttons may be relative to it
        this.joystickActivationZone = {
            x: 0,
            y: height / 2,
            w: width / 3,
            h: height / 2
        };

        const buttonDefs: { id: TouchButtonType, pos: Vector2, customSize?: number }[] = [
            // Right-side main buttons
            { id: 'jump', pos: { x: width - size - margin, y: height - size - margin } },
            { id: 'sneak', pos: { x: width - size * 2 - margin * 2, y: height - size - margin } },
            { id: 'action', pos: { x: width - size - margin, y: height - size * 2 - margin * 2 } },
            
            // Inventory button top-right
            { id: 'inventory', pos: { x: width - (size * 0.8) - margin, y: margin }, customSize: size * 0.8 },

            // Sprint button above joystick zone
            { id: 'sprint', pos: { x: this.joystickActivationZone.x + margin, y: this.joystickActivationZone.y - size - margin } }
        ];

        this.buttons.clear();
        buttonDefs.forEach(def => {
            const buttonSize = def.customSize || size;
            this.buttons.set(def.id, {
                id: def.id,
                rect: { x: def.pos.x, y: def.pos.y, w: buttonSize, h: buttonSize },
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

            // Check if touch is on a button
            for (const button of this.buttons.values()) {
                if (pos.x > button.rect.x && pos.x < button.rect.x + button.rect.w &&
                    pos.y > button.rect.y && pos.y < button.rect.y + button.rect.h) {
                    button.isPressed = true;
                    button.justPressed = true;
                    this.buttonTouchIds.set(touch.identifier, button.id);
                    newTouch.isUITouch = true;
                    continue; // A touch can only control one thing
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
            const activeTouch = this.activeTouches.get(touch.identifier);
            if (activeTouch) {
                this.justEndedTouches.push({ ...activeTouch });
            }

            this.activeTouches.delete(touch.identifier);
            
            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.joystickVector.x = 0;
                this.joystickVector.y = 0;
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