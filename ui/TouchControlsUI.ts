import { TOUCH_JOYSTICK_KNOB_RADIUS, TOUCH_JOYSTICK_RADIUS, TOUCH_JOYSTICK_STROKE_WIDTH } from '../core/Constants';
import { Player } from '../entities/Player';
import { SettingsManager } from '../core/SettingsManager';
import { TouchHandler } from '../input/TouchHandler';

export class TouchControlsUI {
    private touchHandler: TouchHandler;

    constructor(touchHandler: TouchHandler) {
        this.touchHandler = touchHandler;
    }

    public render(ctx: CanvasRenderingContext2D, player: Player) {
        this.renderJoystick(ctx);
        this.renderButtons(ctx, player);
    }

    private renderJoystick(ctx: CanvasRenderingContext2D) {
        if (!this.touchHandler.isJoystickActive()) return;

        const opacity = SettingsManager.instance.settings.controls.touchButtonOpacity;

        // Draw joystick base
        ctx.beginPath();
        ctx.arc(this.touchHandler.joystickCenter.x, this.touchHandler.joystickCenter.y, TOUCH_JOYSTICK_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
        ctx.lineWidth = TOUCH_JOYSTICK_STROKE_WIDTH;
        ctx.stroke();

        // Draw joystick knob
        ctx.beginPath();
        ctx.arc(this.touchHandler.joystickKnob.x, this.touchHandler.joystickKnob.y, TOUCH_JOYSTICK_KNOB_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
    }
    
    private renderButtons(ctx: CanvasRenderingContext2D, player: Player) {
        const { controls } = SettingsManager.instance.settings;

        this.touchHandler.getButtons().forEach(button => {
            const opacity = button.isPressed ? controls.touchButtonOpacity * 1.5 : controls.touchButtonOpacity;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.lineWidth = 4;
            
            ctx.beginPath();
            ctx.roundRect(button.rect.x, button.rect.y, button.rect.w, button.rect.h, 10);
            ctx.fill();
            ctx.stroke();

            this.drawIconForButton(ctx, button, player);
        });
    }

    private drawIconForButton(ctx: CanvasRenderingContext2D, button: any, player: Player) {
        const { x, y, w, h } = button.rect;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const size = w * 0.4;
        const { controls } = SettingsManager.instance.settings;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${controls.touchButtonOpacity * 1.2})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${controls.touchButtonOpacity * 1.2})`;
        ctx.lineWidth = Math.max(4, w * 0.1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        switch (button.id) {
            case 'jump':
                ctx.moveTo(cx - size, cy + size/2);
                ctx.lineTo(cx, cy - size/2);
                ctx.lineTo(cx + size, cy + size/2);
                ctx.stroke();
                break;
            case 'sneak':
                ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
                break;
            case 'swapHands':
                ctx.moveTo(cx - size, cy - size/2);
                ctx.lineTo(cx + size, cy - size/2);
                ctx.moveTo(cx + size*0.6, cy - size);
                ctx.lineTo(cx + size, cy - size/2);
                ctx.lineTo(cx + size*0.6, cy);

                ctx.moveTo(cx + size, cy + size/2);
                ctx.lineTo(cx - size, cy + size/2);
                ctx.moveTo(cx - size*0.6, cy);
                ctx.lineTo(cx - size, cy + size/2);
                ctx.lineTo(cx - size*0.6, cy + size);
                ctx.stroke();
                break;
            case 'action':
                ctx.lineWidth = Math.max(5, w * 0.12);
                // Handle
                ctx.moveTo(cx + size * 0.8, cy - size * 0.8);
                ctx.lineTo(cx - size * 0.8, cy + size * 0.8);
                // Head
                ctx.moveTo(cx + size, cy - size * 0.3);
                ctx.quadraticCurveTo(cx + size * 0.8, cy - size * 0.8, cx + size * 0.3, cy - size);
                ctx.stroke();
                break;
            case 'inventory':
                const dotRadius = size / 5;
                ctx.arc(cx - size*0.7, cy, dotRadius, 0, 2 * Math.PI);
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, dotRadius, 0, 2 * Math.PI);
                ctx.moveTo(cx + size*0.7, cy);
                ctx.arc(cx + size*0.7, cy, dotRadius, 0, 2 * Math.PI);
                ctx.fill();
                break;
            case 'sprint': // ">>" icon
                ctx.moveTo(cx - size, cy - size);
                ctx.lineTo(cx - size/4, cy);
                ctx.lineTo(cx - size, cy + size);
                ctx.moveTo(cx, cy - size);
                ctx.lineTo(cx + size*3/4, cy);
                ctx.lineTo(cx, cy + size);
                ctx.stroke();
                break;
        }
    }
}
