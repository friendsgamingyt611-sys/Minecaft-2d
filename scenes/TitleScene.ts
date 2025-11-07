

import { Scene, SceneManager } from './SceneManager';
import { SettingsScene } from './SettingsScene';
import { WorldListScene } from './WorldListScene';
import { SoundManager } from '../core/SoundManager';
import { ProfileManager } from '../core/ProfileManager';

export class TitleScene implements Scene {
  private sceneManager: SceneManager;
  private buttons: { label: string; x: number; y: number; width: number; height: number; action: () => void }[] = [];
  private title = "Minecraft 2D";
  private splashText = "Settings Update!";
  private hoveredButton: any = null;
  private cloudOffset: number = 0;
  private playerName: string = '';
  
  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    const profile = ProfileManager.instance.getActiveProfile();
    if (profile) {
        this.playerName = profile.name;
    }
  }
  
  enter(): void {
    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const buttonWidth = 400;
    const buttonHeight = 60;
    const spacing = 25;
    const startY = canvasHeight / 2;
    
    this.buttons = [
        {
            label: "Singleplayer",
            x: canvasWidth / 2 - buttonWidth / 2,
            y: startY,
            width: buttonWidth,
            height: buttonHeight,
            action: () => {
                SoundManager.instance.playSound('ui.click');
                this.sceneManager.pushScene(new WorldListScene(this.sceneManager));
            }
        },
        {
            label: "Settings",
            x: canvasWidth / 2 - buttonWidth / 2,
            y: startY + buttonHeight + spacing,
            width: buttonWidth,
            height: buttonHeight,
            action: () => {
                SoundManager.instance.playSound('ui.click');
                this.sceneManager.pushScene(new SettingsScene(this.sceneManager));
            }
        }
    ];
    SoundManager.instance.playMusic('calm1');
  }
  
  exit(): void {}
  
  private checkAndTriggerButton(pos: { x: number, y: number }): boolean {
    for (const button of this.buttons) {
        if (pos.x >= button.x && pos.x <= button.x + button.width &&
            pos.y >= button.y && pos.y <= button.y + button.height) {
            button.action();
            return true;
        }
    }
    return false;
  }
  
  update(deltaTime: number): void {
     this.cloudOffset += deltaTime * 10;
     const canvasWidth = this.sceneManager.mouseHandler['canvas'].width;
     if (this.cloudOffset > canvasWidth + 200) {
         this.cloudOffset = -200;
     }

     const mousePos = this.sceneManager.mouseHandler.position;
     this.hoveredButton = null;
     for (const button of this.buttons) {
        if (mousePos.x >= button.x && mousePos.x <= button.x + button.width &&
            mousePos.y >= button.y && mousePos.y <= button.y + button.height) {
            this.hoveredButton = button;
            break;
        }
     }

     if (this.sceneManager.mouseHandler.isLeftClicked) {
         if (this.checkAndTriggerButton(mousePos)) return;
     }

     for (const touch of this.sceneManager.touchHandler.justEndedTouches) {
         if (this.checkAndTriggerButton(touch)) return;
     }
  }

  private renderClouds(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = '#ffffff';
      const drawCloud = (x: number, y: number, size: number) => {
          ctx.fillRect(x, y, size, size/3);
          ctx.fillRect(x - size/4, y + size/6, size*1.5, size/2);
      }
      drawCloud(this.cloudOffset, 150, 200);
      drawCloud(this.cloudOffset - 500, 200, 160);
      drawCloud(this.cloudOffset + 400, 120, 240);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    
    ctx.fillStyle = '#63a3ff'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.renderClouds(ctx);

    const groundHeight = canvasHeight * 0.3;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
    ctx.fillStyle = '#6a9b3d';
    ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, canvasHeight - groundHeight + 20, canvasWidth, 5);


    ctx.font = "100px Minecraftia";
    ctx.textAlign = 'center';
    ctx.lineWidth = 10;
    ctx.fillStyle = '#3e3e3e';
    ctx.fillText(this.title, canvasWidth / 2 + 6, 256);
    const gradient = ctx.createLinearGradient(0, 150, 0, 250);
    gradient.addColorStop(0, '#d8d8d8');
    gradient.addColorStop(1, '#a0a0a0');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#383838';
    ctx.strokeText(this.title, canvasWidth / 2, 250);
    ctx.fillText(this.title, canvasWidth / 2, 250);

    ctx.save();
    ctx.translate(canvasWidth / 2 + 250, 280);
    ctx.rotate(0.3);
    ctx.font = "40px Minecraftia";
    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 5;
    ctx.strokeText(this.splashText, 0, 0);
    ctx.fillText(this.splashText, 0, 0);
    ctx.restore();


    this.buttons.forEach(button => {
        const isHovered = button === this.hoveredButton;
        ctx.fillStyle = '#383838';
        ctx.fillRect(button.x, button.y, button.width, button.height);
        
        const inset = 4;
        ctx.fillStyle = isHovered ? '#b0b0b0' : '#7f7f7f';
        ctx.fillRect(button.x + inset, button.y + inset, button.width - inset * 2, button.height - inset * 2);

        ctx.font = "36px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(button.label, button.x + button.width / 2 + 2, button.y + button.height / 2 + 2);
        ctx.fillStyle = isHovered ? '#ffffa0' : '#ffffff';
        ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
    });

    if (this.playerName) {
        ctx.font = "24px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`Welcome, ${this.playerName}`, canvasWidth / 2, canvasHeight - 20);
    }
  }
}
