import { ItemId, ItemInfo, BlockId } from '../types';
import { ItemRegistry } from '../inventory/ItemRegistry';

export class ItemRenderer {

    public static drawItem(ctx: CanvasRenderingContext2D, itemId: ItemId, x: number, y: number, size: number) {
        const itemInfo = ItemRegistry.getItemInfo(itemId);
        if (!itemInfo) {
            this.drawMissingTexture(ctx, x, y, size);
            return;
        }

        if (itemInfo.toolInfo) {
            this.drawTool(ctx, itemInfo, x, y, size);
        } else if (itemInfo.armorInfo) {
            this.drawArmor(ctx, itemInfo, x, y, size);
        } else {
            switch (itemId) {
                case ItemId.STICK: this.drawStick(ctx, x, y, size); break;
                case ItemId.COAL: this.drawMaterial(ctx, x, y, size, '#363636'); break;
                case ItemId.DIAMOND: this.drawMaterial(ctx, x, y, size, '#68DED1'); break;
                case ItemId.EMERALD: this.drawMaterial(ctx, x, y, size, '#04d94f'); break;
                case ItemId.IRON_INGOT: this.drawMaterial(ctx, x, y, size, '#d8d8d8'); break;
                case ItemId.GOLD_INGOT: this.drawMaterial(ctx, x, y, size, '#fcee5a'); break;
                case ItemId.RAW_IRON: this.drawMaterial(ctx, x, y, size, '#d8a077'); break;
                case ItemId.RAW_GOLD: this.drawMaterial(ctx, x, y, size, '#f0d68b'); break;
                case ItemId.REDSTONE_DUST: this.drawMaterial(ctx, x, y, size, '#ff0000', 0.2); break;
                case ItemId.LAPIS_LAZULI: this.drawMaterial(ctx, x, y, size, '#1a4f91'); break;
                case ItemId.FLINT: this.drawMaterial(ctx, x, y, size, '#505050', 0.8); break;
                case ItemId.LEATHER: this.drawMaterial(ctx, x, y, size, '#965a38', 0.5, 0.7); break;
                case ItemId.ROTTEN_FLESH: this.drawMaterial(ctx, x, y, size, '#6a4d32', 0.9, 0.4, true); break;
                case ItemId.SHIELD: this.drawShield(ctx, x, y, size); break;
                case ItemId.ZOMBIE_SPAWN_EGG: this.drawSpawnEgg(ctx, x, y, size, '#5a7a5a', '#3e523e'); break;
                default:
                    this.drawMissingTexture(ctx, x, y, size);
            }
        }
    }

    private static drawMissingTexture(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.fillStyle = '#FF00FF'; // Bright pink for missing texture
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, size / 2, size / 2);
        ctx.fillRect(x + size / 2, y + size / 2, size / 2, size / 2);
    }
    
    private static drawTool(ctx: CanvasRenderingContext2D, itemInfo: ItemInfo, x: number, y: number, size: number) {
        if (!itemInfo.toolInfo) return;
        const tier = itemInfo.toolInfo.tier;
        const type = itemInfo.toolInfo.type;

        const colors = { wood: '#a37b4c', stone: '#9a9a9a', iron: '#d8d8d8', diamond: '#68ded1', none: '#888' };
        const materialColor = colors[tier] || '#888';
        const handleColor = '#805631';

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.translate(-size / 2, -size / 2);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.strokeStyle = handleColor;
        ctx.lineWidth = size * 0.15;
        ctx.beginPath();
        ctx.moveTo(size * 0.1, size * 0.9);
        ctx.lineTo(size * 0.9, size * 0.1);
        ctx.stroke();

        ctx.strokeStyle = materialColor;
        ctx.fillStyle = materialColor;
        ctx.lineWidth = size * 0.2;

        switch (type) {
            case 'pickaxe':
                ctx.beginPath();
                ctx.moveTo(size*0.9, size*0.1); ctx.lineTo(size * 0.6, size * 0.4);
                ctx.moveTo(size*0.75, size*0.25); ctx.lineTo(size * 0.4, -size*0.1);
                ctx.moveTo(size*0.75, size*0.25); ctx.lineTo(size * 1.1, size * 0.6);
                ctx.stroke();
                break;
            case 'axe':
                ctx.beginPath();
                ctx.moveTo(size*0.7, size*0.3);
                ctx.quadraticCurveTo(size*0.9, size*-0.1, size*0.4, size*0.4);
                ctx.quadraticCurveTo(size*0.8, size*0.8, size*0.7, size*0.3);
                ctx.fill();
                break;
            case 'sword':
                 ctx.beginPath(); ctx.moveTo(size * 0.5, size * 0.5); ctx.lineTo(size * 0.5, size * -0.1); ctx.stroke();
                 ctx.lineWidth = size * 0.1; ctx.strokeStyle = handleColor;
                 ctx.beginPath(); ctx.moveTo(size*0.3, size*0.7); ctx.lineTo(size*0.7, size*0.3); ctx.stroke();
                break;
            case 'shovel':
                ctx.fillRect(size*0.4, size*0.1, size*0.2, size*0.4);
                break;
            case 'hoe':
                ctx.beginPath();
                ctx.moveTo(size*0.6, size*0.4); ctx.lineTo(size*0.8, size*0.2); ctx.lineTo(size*1.0, size*0.2);
                ctx.stroke();
                break;
        }

        ctx.restore();
    }
    
    private static drawArmor(ctx: CanvasRenderingContext2D, itemInfo: ItemInfo, x: number, y: number, size: number) {
        if (!itemInfo.armorInfo) return;
        const type = itemInfo.armorInfo.type;
        let color = '#7a4a35'; // Leather
        if(itemInfo.name.includes('Iron')) color = '#d8d8d8';
        if(itemInfo.name.includes('Diamond')) color = '#68ded1';

        ctx.fillStyle = color;
        ctx.strokeStyle = this.shadeColor(color, -0.4);
        ctx.lineWidth = size * 0.08;
        ctx.lineJoin = 'round';
        const p = (n: number) => n * size;
        const sx = (n: number) => x + p(n);
        const sy = (n: number) => y + p(n);

        ctx.beginPath();
        switch(type) {
            case 'helmet': ctx.arc(sx(0.5), sy(0.6), p(0.3), Math.PI, 0); break;
            case 'chestplate':
                ctx.moveTo(sx(0.2), sy(0.2)); ctx.lineTo(sx(0.2), sy(0.8)); ctx.lineTo(sx(0.8), sy(0.8));
                ctx.lineTo(sx(0.8), sy(0.2)); ctx.lineTo(sx(0.6), sy(0.4)); ctx.lineTo(sx(0.4), sy(0.4));
                ctx.closePath(); break;
            case 'leggings':
                ctx.moveTo(sx(0.2), sy(0.2)); ctx.lineTo(sx(0.2), sy(0.8)); ctx.lineTo(sx(0.45), sy(0.8));
                ctx.lineTo(sx(0.45), sy(0.5)); ctx.lineTo(sx(0.55), sy(0.5)); ctx.lineTo(sx(0.55), sy(0.8));
                ctx.lineTo(sx(0.8), sy(0.8)); ctx.lineTo(sx(0.8), sy(0.2)); break;
            case 'boots':
                ctx.moveTo(sx(0.2), sy(0.4)); ctx.lineTo(sx(0.2), sy(0.8)); ctx.lineTo(sx(0.8), sy(0.8));
                ctx.lineTo(sx(0.8), sy(0.6)); break;
        }
        ctx.fill();
        ctx.stroke();
    }

    private static drawStick(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.translate(-size / 2, -size / 2);
        ctx.fillStyle = '#805631';
        ctx.fillRect(size * 0.4, size * 0.1, size * 0.2, size * 0.8);
        ctx.restore();
    }
    
    private static drawMaterial(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, w: number = 0.6, h: number = 0.6, isFlesh:boolean=false) {
        ctx.fillStyle = color;
        ctx.strokeStyle = this.shadeColor(color, -0.4);
        ctx.lineWidth = size * 0.05;
        const rectW = size * w;
        const rectH = size * h;
        const rectX = x + (size - rectW) / 2;
        const rectY = y + (size - rectH) / 2;
        if(isFlesh) {
            ctx.beginPath();
            ctx.moveTo(rectX, rectY + rectH/2);
            ctx.quadraticCurveTo(rectX + rectW/2, rectY - rectH/4, rectX + rectW, rectY + rectH/2);
            ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW/2, rectY + rectH*1.1);
            ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH/2);
            ctx.fill(); ctx.stroke();
        } else {
            ctx.fillRect(rectX, rectY, rectW, rectH);
            ctx.strokeRect(rectX, rectY, rectW, rectH);
        }
    }
    
    private static drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.fillStyle = '#a37b4c'; ctx.strokeStyle = '#5f4631'; ctx.lineWidth = size * 0.08;
        const p = (n: number) => n * size; const sx = (n: number) => x + p(n); const sy = (n: number) => y + p(n);
        ctx.beginPath();
        ctx.moveTo(sx(0.1), sy(0.1)); ctx.lineTo(sx(0.9), sy(0.1));
        ctx.lineTo(sx(0.9), sy(0.5)); ctx.lineTo(sx(0.5), sy(0.9));
        ctx.lineTo(sx(0.1), sy(0.5)); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d8d8d8'; ctx.strokeStyle = '#9a9a9a';
        ctx.fillRect(sx(0.2), sy(0.2), p(0.6), p(0.05)); ctx.strokeRect(sx(0.2), sy(0.2), p(0.6), p(0.05));
        ctx.fillRect(sx(0.2), sy(0.75), p(0.6), p(0.05)); ctx.strokeRect(sx(0.2), sy(0.75), p(0.6), p(0.05));
    }
    
    private static drawSpawnEgg(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, baseColor: string, spotColor: string) {
        ctx.fillStyle = baseColor;
        ctx.strokeStyle = this.shadeColor(baseColor, -0.4);
        ctx.lineWidth = size * 0.05;

        ctx.beginPath();
        ctx.ellipse(x + size / 2, y + size / 2, size * 0.35, size * 0.45, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spotColor;
        for (let i = 0; i < 5; i++) {
            const spotX = x + size/2 + (Math.random() - 0.5) * size * 0.4;
            const spotY = y + size/2 + (Math.random() - 0.5) * size * 0.6;
            const spotSize = size * (0.05 + Math.random() * 0.05);
            ctx.beginPath();
            ctx.arc(spotX, spotY, spotSize, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    private static shadeColor(color: string, percent: number): string {
        let R = parseInt(color.substring(1, 3), 16); let G = parseInt(color.substring(3, 5), 16); let B = parseInt(color.substring(5, 7), 16);
        R = Math.floor(R * (1 + percent)); G = Math.floor(G * (1 + percent)); B = Math.floor(B * (1 + percent));
        R = Math.min(255, Math.max(0, R)); G = Math.min(255, Math.max(0, G)); B = Math.min(255, Math.max(0, B));
        const RR = R.toString(16).padStart(2, '0'); const GG = G.toString(16).padStart(2, '0'); const BB = B.toString(16).padStart(2, '0');
        return "#" + RR + GG + BB;
    }
}