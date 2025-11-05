

import { TOUCH_JOYSTICK_RADIUS, TOUCH_JOYSTICK_KNOB_RADIUS, TOUCH_BUTTON_SIZE, TOUCH_BUTTON_MARGIN } from '../core/Constants';
import { SettingsManager } from '../core/SettingsManager';
import { Vector2 } from '../types';

interface Touch {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
}

type TouchButtonType = 'jump' | 'sneak' | 'destroy' | 'place' | 'inventory' | 'drop' | 'sprint';

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

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.initializeButtons();
        this.addEventListeners();
    }

    private initializeButtons() {
        const { width, height } = this.canvas;
        const settings = SettingsManager.instance.settings;
        const size = TOUCH_BUTTON_SIZE * settings.touchButtonSize;
        const margin = TOUCH_BUTTON_MARGIN;

        const buttonDefs: { id: TouchButtonType, pos: Vector2 }[] = [
            // Right-side buttons
            { id: 'jump', pos: { x: width - size - margin, y: height - size * 2 - margin * 2 } },
            { id: 'sneak', pos: { x: width - size * 2 - margin * 2, y: height - size - margin } },
            { id: 'place', pos: { x: width - size - margin, y: height - size * 3 - margin * 3 } },
            { id: 'destroy', pos: { x: width - size * 2 - margin * 2, y: height - size * 2 - margin * 2} },
            { id: 'inventory', pos: { x: width - size * 3 - margin * 3, y: height - size - margin } },
            // Left-side sprint button
            { id: 'sprint', pos: { x: margin, y: height - size * 2 - margin * 2 } }
        ];

        this.buttons.clear();
        buttonDefs.forEach(def => {
            this.buttons.set(def.id, {
                id: def.id,
                rect: { x: def.pos.x, y: def.pos.y, w: size, h: size },
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

    public isJoystickActive(): boolean {
        return this.joystickTouchId !== null;
    }

    public getButtons(): TouchButton[] { return Array.from(this.buttons.values()); }
    
    public getPrimaryTouchPos(): Vector2 | null {
        if (this.activeTouches.size > 0) {
            const firstTouch = this.activeTouches.values().next().value;
            return { x: firstTouch.x, y: firstTouch.y };
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
            const newTouch = { id: touch.identifier, ...pos, startX: pos.x, startY: pos.y };
            this.activeTouches.set(touch.identifier, newTouch);
            this.justStartedTouches.push(newTouch);

            let touchHandled = false;

            // Check if touch is on a button
            for (const button of this.buttons.values()) {
                if (pos.x > button.rect.x && pos.x < button.rect.x + button.rect.w &&
                    pos.y > button.rect.y && pos.y < button.rect.y + button.rect.h) {
                    button.isPressed = true;
                    button.justPressed = true;
                    this.buttonTouchIds.set(touch.identifier, button.id);
                    touchHandled = true;
                    break;
                }
            }
            if (touchHandled) continue;

            // Check if touch is for joystick (left side)
            if (pos.x < this.canvas.width / 2 && this.joystickTouchId === null) {
                this.joystickTouchId = touch.identifier;
                this.joystickCenter = { ...pos };
                this.joystickKnob = { ...pos };
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