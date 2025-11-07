

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
            inventory: false,
            drop: false,
        };
    }

    public update(): InputState {
        // Reset single-frame "just pressed" states
        this.inputState.jump.justPressed = false;
        this.inputState.sneak.justPressed = false;
        this.inputState.sprint.justPressed = false;
        this.inputState.inventory = false;
        this.inputState.drop = false;
        this.inputState.place = false;

        const scheme = SettingsManager.instance.getEffectiveControlScheme();

        if (scheme === 'keyboard') {
            this.updateKeyboardState();
        } else {
            this.touchHandler.update();
            this.updateTouchState();
        }
        
        // Final state processing
        if (this.inputState.moveX === 0) {
            this.isSprintToggled = false;
        }
        this.inputState.sprint.pressed = this.isSprintToggled;
        this.inputState.sneak.pressed = this.isSneakToggled;

        return this.inputState;
    }

    private updateKeyboardState() {
        const { controls } = SettingsManager.instance.settings;

        this.inputState.moveX = 0;
        if (this.inputManager.isKeyDown('a') || this.inputManager.isKeyDown('arrowleft')) this.inputState.moveX = -1;
        if (this.inputManager.isKeyDown('d') || this.inputManager.isKeyDown('arrowright')) this.inputState.moveX = 1;
        
        let isJumpDown = this.inputManager.isKeyDown(' ');
        if (controls.autoJump) {
            isJumpDown = isJumpDown || (this.inputState.moveX !== 0);
        }
        this.inputState.jump.justPressed = isJumpDown && !this.inputState.jump.pressed;
        this.inputState.jump.pressed = isJumpDown;

        // Sneak Logic
        const isSneakKeyDown = this.inputManager.isKeyDown('shift');
        this.inputState.sneak.justPressed = isSneakKeyDown && !this.inputState.sneak.pressed;
        if (controls.toggleCrouch) {
            if (this.inputState.sneak.justPressed) this.isSneakToggled = !this.isSneakToggled;
        } else {
            this.isSneakToggled = isSneakKeyDown;
        }

        // Sprint Logic
        const isSprintKeyDown = this.inputManager.isKeyDown('control');
        this.inputState.sprint.justPressed = isSprintKeyDown && !this.inputState.sprint.pressed;
        if (controls.toggleSprint) {
            if (this.inputState.sprint.justPressed) this.isSprintToggled = !this.isSprintToggled;
        } else {
            this.isSprintToggled = isSprintKeyDown;
        }

        this.inputState.destroy = this.mouseHandler.isLeftDown;
        this.inputState.place = this.mouseHandler.isRightClicked;
        this.inputState.inventory = this.inputManager.isKeyPressed('e');
        this.inputState.drop = this.inputManager.isKeyPressed('q');
    }
    
    private updateTouchState() {
        const { controls } = SettingsManager.instance.settings;

        this.inputState.moveX = this.touchHandler.getJoystick().x;

        let isJumpDown = this.touchHandler.isButtonPressed('jump');
        if (controls.autoJump) {
            isJumpDown = isJumpDown || (this.inputState.moveX !== 0);
        }
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

        // Sprint Logic
        this.inputState.sprint.justPressed = this.touchHandler.isButtonPressed('sprint', true);
        if (controls.toggleSprint) {
            if (this.inputState.sprint.justPressed) this.isSprintToggled = !this.isSprintToggled;
        } else {
            this.isSprintToggled = this.touchHandler.isButtonPressed('sprint');
        }
        
        this.inputState.destroy = this.touchHandler.isButtonPressed('action');
        this.inputState.place = this.touchHandler.isButtonPressed('action', true);
        
        this.inputState.inventory = this.touchHandler.isButtonPressed('inventory', true);
        this.inputState.drop = this.touchHandler.isButtonPressed('drop', true);
    }
}