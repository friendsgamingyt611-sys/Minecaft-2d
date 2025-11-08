
export class ChatUI {
    public isOpen: boolean = false;

    public toggle() {
        this.isOpen = !this.isOpen;
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.isOpen) return;

        const chatH = 40;
        const chatY = ctx.canvas.height - chatH - 50; // Position it above the hotbar
        const chatW = ctx.canvas.width * 0.8;
        const chatX = (ctx.canvas.width - chatW) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(chatX, chatY, chatW, chatH);
        
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(chatX, chatY, chatW, chatH);

        // Simple placeholder text/cursor
        ctx.font = "20px Minecraftia";
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(">", chatX + 10, chatY + chatH / 2);

        // Blinking cursor
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillRect(chatX + 25, chatY + 8, 2, chatH - 16);
        }
    }
}
