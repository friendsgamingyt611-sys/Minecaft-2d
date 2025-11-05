
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

    constructor(inputManager: InputManager, mouseHandler: MouseHandler, touchHandler: TouchHandler) {
        this.inputManager = inputManager;
        this.mouseHandler = mouseHandler;
        this.touchHandler = touchHandler;
        this.inputState = {
            moveX: 0,
            jump: { pressed: false, justPressed: false },
            sneak: false,
            sprint: false,
            place: false,
            destroy: false,
            inventory: false,
            drop: false,
        };
    }

    public update(): InputState {
        // Reset single-frame "just pressed" states
        this.inputState.jump.justPressed = false;
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

        return this.inputState;
    }

    private updateKeyboardState() {
        this.inputState.moveX = 0;
        if (this.inputManager.isKeyDown('a') || this.inputManager.isKeyDown('arrowleft')) this.inputState.moveX = -1;
        if (this.inputManager.isKeyDown('d') || this.inputManager.isKeyDown('arrowright')) this.inputState.moveX = 1;
        
        const isJumpDown = this.inputManager.isKeyDown('w') || this.inputManager.isKeyDown(' ') || this.inputManager.isKeyDown('arrowup');
        this.inputState.jump.justPressed = isJumpDown && !this.inputState.jump.pressed;
        this.inputState.jump.pressed = isJumpDown;

        this.inputState.sneak = this.inputManager.isKeyDown('shift');
        this.inputState.sprint = this.inputManager.isKeyDown('control');
        this.inputState.destroy = this.mouseHandler.isLeftDown;
        this.inputState.place = this.mouseHandler.isRightClicked;
        this.inputState.inventory = this.inputManager.isKeyPressed('e');
        this.inputState.drop = this.inputManager.isKeyPressed('q');
    }
    
    private updateTouchState() {
        this.inputState.moveX = this.touchHandler.getJoystick().x;

        const isJumpDown = this.touchHandler.isButtonPressed('jump');
        this.inputState.jump.justPressed = isJumpDown && !this.inputState.jump.pressed;
        this.inputState.jump.pressed = isJumpDown;
        
        this.inputState.sneak = this.touchHandler.isButtonPressed('sneak');
        this.inputState.sprint = this.touchHandler.isButtonPressed('sprint');
        this.inputState.destroy = this.touchHandler.isButtonPressed('destroy');
        // FIX: Changed 'place' to be a single-press action to prevent rapid placing.
        this.inputState.place = this.touchHandler.isButtonPressed('place', true); // Consume press
        this.inputState.inventory = this.touchHandler.isButtonPressed('inventory', true); // Consume press
        this.inputState.drop = this.touchHandler.isButtonPressed('drop', true); // Consume press
    }
}