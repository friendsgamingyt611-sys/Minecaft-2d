import { Scene, SceneManager } from './SceneManager';
import { WorldCreateScene } from './WorldCreateScene';

export class TitleScene implements Scene {
  private sceneManager: SceneManager;
  private buttons: { label: string; x: number; y: number; width: number; height: number; action: () => void }[] = [];
  private title = "Minecraft 2D";
  
  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }
  
  enter(): void {
    const canvas = this.sceneManager.mouseHandler['canvas'] as HTMLCanvasElement;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    this.buttons = [
        {
            label: "Create World",
            x: canvasWidth / 2 - 150,
            y: canvasHeight / 2,
            width: 300,
            height: 50,
            action: () => this.sceneManager.pushScene(new WorldCreateScene(this.sceneManager))
        },
        {
            label: "Options",
            x: canvasWidth / 2 - 150,
            y: canvasHeight / 2 + 70,
            width: 300,
            height: 50,
            action: () => console.log("Options clicked!")
        }
    ];

    this.sceneManager.mouseHandler['canvas'].addEventListener('click', this.handleMouseClick);
  }
  
  exit(): void {
    this.sceneManager.mouseHandler['canvas'].removeEventListener('click', this.handleMouseClick);
  }
  
  private handleMouseClick = (event: MouseEvent) => {
    const mousePos = this.sceneManager.mouseHandler.position;
    for (const button of this.buttons) {
        if (mousePos.x >= button.x && mousePos.x <= button.x + button.width &&
            mousePos.y >= button.y && mousePos.y <= button.y + button.height) {
            button.action();
            break;
        }
    }
  };
  
  update(deltaTime: number): void {
     // No update logic needed for static title screen
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Background
    ctx.fillStyle = '#63a3ff'; // Sky blue
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Title
    ctx.font = "80px Minecraftia";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 8;
    ctx.strokeText(this.title, ctx.canvas.width / 2, 200);
    ctx.fillText(this.title, ctx.canvas.width / 2, 200);

    // Buttons
    const mousePos = this.sceneManager.mouseHandler.position;
    this.buttons.forEach(button => {
        const isHovered = mousePos.x >= button.x && mousePos.x <= button.x + button.width &&
                          mousePos.y >= button.y && mousePos.y <= button.y + button.height;

        ctx.fillStyle = isHovered ? '#a0a0a0' : '#7f7f7f';
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 4;
        ctx.fillRect(button.x, button.y, button.width, button.height);
        ctx.strokeRect(button.x, button.y, button.width, button.height);

        ctx.font = "30px Minecraftia";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
    });
  }
}
