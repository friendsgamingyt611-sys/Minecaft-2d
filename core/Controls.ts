

import { InputManager } from "../input/InputManager";
import { MouseHandler } from "../input/MouseHandler";
import { TouchHandler } from "../input/TouchHandler";
import { InputState } from "../types";
import { SettingsManager } from "./SettingsManager";

export class ControlManager {
    private inputState: InputState;
    private inputManager: InputManager;
    private mouseHandler: MouseHandler;
    private touchHandler: TouchHandler;
    
    private isSprintToggled: boolean = false;
    private isSneakToggled: boolean = false;

    // FEAT: Add state for double-tap to sprint
    private lastMoveKeyPress = { key: '', time: 0 };
    private readonly DOUBLE_TAP_TIME = 300; // ms

    constructor(inputManager: InputManager, mouseHandler: MouseHandler, touchHandler: TouchHandler) {
        this.inputManager = inputManager;
        this.mouseHandler = mouseHandler;
        this.touchHandler = touchHandler;
        this.inputState = {
            moveX: 0,
            jump: { pressed: false, justPressed: false },
            sneak: { pressed: false, justPressed: false },
            sprint: { pressed: false, justPressed: false },
            place: false,
            destroy: false,
            drop: false,
            pickBlock: false,
            swapHands: false,
            shift: false,
            inventory: false,
            gamemodeSwitch: false,
            pause: false,
            toggleDebug: false,
            screenshot: false,
            toggleFullscreen: false,
            openChat: false,
        };
    }

    public update(): InputState {
        // Reset single-frame "just pressed" and action states
        this.inputState.jump.justPressed = false;
        this.inputState.sneak.justPressed = false;
        this.inputState.sprint.justPressed = false;
        this.inputState.place = false;
        this.inputState.pickBlock = false;
        
        // Reset single-frame action flags
        this.inputState.drop = false;
        this.inputState.swapHands = false;
        this.inputState.inventory = false;
        this.inputState.gamemodeSwitch = false;
        this.inputState.pause = false;
        this.inputState.toggleDebug = false;
        this.inputState.screenshot = false;
        this.inputState.toggleFullscreen = false;
        this.inputState.openChat = false;


        const scheme = SettingsManager.instance.getEffectiveControlScheme();

        if (scheme === 'keyboard') {
            this.updateKeyboardState();
        } else {
            this.touchHandler.update();
            this.updateTouchState();
        }
        
        // Final state processing
        // FEAT: Sprint is cancelled when movement stops, just like Minecraft
        if (this.inputState.moveX === 0 && !this.inputState.jump.pressed) {
            this.isSprintToggled = false;
        }

        // Final state is derived from toggles and hold-states
        this.updateFinalSprintState();
        this.inputState.sneak.pressed = this.isSneakToggled;

        return this.inputState;
    }

    private updateKeyboardState() {
        const { controls } = SettingsManager.instance.settings;

        this.inputState.moveX = 0;
        if (this.inputManager.isKeyDown('a') || this.inputManager.isKeyDown('arrowleft')) this.inputState.moveX = -1;
        if (this.inputManager.isKeyDown('d') || this.inputManager.isKeyDown('arrowright')) this.inputState.moveX = 1;
        
        // FEAT: Double-tap detection
        let didDoubleTap = false;
        const now = Date.now();
        if (this.inputManager.isKeyPressed('a')) {
            if (this.lastMoveKeyPress.key === 'a' && now - this.lastMoveKeyPress.time < this.DOUBLE_TAP_TIME) {
                didDoubleTap = true;
            }
            this.lastMoveKeyPress = { key: 'a', time: now };
        }
        if (this.inputManager.isKeyPressed('d')) {
            if (this.lastMoveKeyPress.key === 'd' && now - this.lastMoveKeyPress.time < this.DOUBLE_TAP_TIME) {
                didDoubleTap = true;
            }
            this.lastMoveKeyPress = { key: 'd', time: now };
        }
        if (this.inputManager.isKeyPressed('w') || this.inputManager.isKeyPressed('arrowup')) {
            if (this.lastMoveKeyPress.key === 'w' && now - this.lastMoveKeyPress.time < this.DOUBLE_TAP_TIME) {
                didDoubleTap = true;
            }
            this.lastMoveKeyPress = { key: 'w', time: now };
        }

        if (didDoubleTap) {
            this.isSprintToggled = true;
        }

        // JUMP LOGIC
        const isJumpDown = this.inputManager.isKeyDown(' ') || this.inputManager.isKeyDown('w') || this.inputManager.isKeyDown('arrowup');
        // BUG FIX: The line below was removed. It incorrectly tied auto-jump to any horizontal movement,
        // causing the player to jump before walking. The physics engine's step-up provides the correct auto-jump behavior.
        // if (controls.autoJump) { ... }
        this.inputState.jump.justPressed = isJumpDown && !this.inputState.jump.pressed;
        this.inputState.jump.pressed = isJumpDown;

        // Sneak Logic
        const isSneakKeyDown = this.inputManager.isKeyDown('shift');
        this.inputState.shift = isSneakKeyDown;
        this.inputState.sneak.justPressed = this.inputManager.isKeyPressed('shift');
        if (controls.toggleCrouch) {
            if (this.inputState.sneak.justPressed) this.isSneakToggled = !this.isSneakToggled;
        } else {
            this.isSneakToggled = isSneakKeyDown;
        }

        // Sprint Logic (just for ctrl key state)
        this.inputState.sprint.justPressed = this.inputManager.isKeyPressed('control');
        if (controls.toggleSprint && this.inputState.sprint.justPressed) {
            this.isSprintToggled = !this.isSprintToggled;
        }


        // Continuous actions
        this.inputState.destroy = this.mouseHandler.isLeftDown;

        // Single-frame actions
        this.inputState.place = this.mouseHandler.isRightClicked;
        this.inputState.pickBlock = this.mouseHandler.isMiddleClicked;
        this.inputState.drop = this.inputManager.isKeyReleased('q');
        this.inputState.swapHands = this.inputManager.isKeyReleased('f');
        this.inputState.inventory = this.inputManager.isKeyReleased('e');
        this.inputState.gamemodeSwitch = this.inputManager.isKeyReleased('m');
        this.inputState.pause = this.inputManager.isKeyReleased('escape');
        this.inputState.toggleDebug = this.inputManager.isKeyReleased('f3');
        this.inputState.screenshot = this.inputManager.isKeyReleased('f2');
        this.inputState.toggleFullscreen = this.inputManager.isKeyReleased('f11');
        this.inputState.openChat = this.inputManager.isKeyReleased('t');
    }

    private updateFinalSprintState() {
        const { controls } = SettingsManager.instance.settings;
        const scheme = SettingsManager.instance.getEffectiveControlScheme();

        if (scheme === 'keyboard') {
            const isSprintKeyDown = this.inputManager.isKeyDown('control');
            if (controls.toggleSprint) {
                // In toggle mode, only the toggled state matters
                this.inputState.sprint.pressed = this.isSprintToggled;
            } else {
                // In hold mode, either holding Ctrl OR having the toggle active will sprint
                this.inputState.sprint.pressed = isSprintKeyDown || this.isSprintToggled;
            }
        } else { // Touch
            if (controls.toggleSprint) {
                this.inputState.sprint.pressed = this.isSprintToggled;
            } else {
                this.inputState.sprint.pressed = this.touchHandler.isButtonPressed('sprint');
            }
        }
    }
    
    private updateTouchState() {
        const { controls } = SettingsManager.instance.settings;

        this.inputState.moveX = this.touchHandler.getJoystick().x;

        const isJumpDown = this.touchHandler.isButtonPressed('jump');
        // BUG FIX: Removed faulty auto-jump on move for touch controls.
        // if (controls.autoJump) { ... }
        this.inputState.jump.justPressed = isJumpDown && !this.inputState.jump.pressed;
        this.inputState.jump.pressed = isJumpDown;
        
        // Sneak Logic
        const isSneakBtnDown = this.touchHandler.isButtonPressed('sneak');
        this.inputState.sneak.justPressed = this.touchHandler.isButtonPressed('sneak', true);
        if (controls.toggleCrouch) {
            if (this.inputState.sneak.justPressed) this.isSneakToggled = !this.isSneakToggled;
        } else {
            this.isSneakToggled = isSneakBtnDown;
        }
        this.inputState.shift = isSneakBtnDown;

        // Sprint Logic
        this.inputState.sprint.justPressed = this.touchHandler.isButtonPressed('sprint', true);
        if (controls.toggleSprint) {
            if (this.inputState.sprint.justPressed) this.isSprintToggled = !this.isSprintToggled;
        }
        
        this.inputState.destroy = this.touchHandler.isButtonPressed('action');
        this.inputState.place = this.touchHandler.isButtonPressed('action', true);
        
        this.inputState.drop = this.touchHandler.isButtonPressed('drop', true);
        this.inputState.swapHands = this.touchHandler.isButtonPressed('swapHands', true);
        this.inputState.inventory = this.touchHandler.isButtonPressed('inventory', true);
    }
}