import { Vector2, Item, ItemId } from '../types';
import { PhysicsSystem } from './PhysicsSystem';
import { BLOCK_SIZE } from '../core/Constants';
import { BlockRenderer } from '../rendering/BlockRenderer';
import { CraftingSystem } from '../crafting/CraftingSystem';

export class ItemEntity {
    public position: Vector2;
    public velocity: Vector2 = { x: 0, y: 0 };
    public onGround: boolean = false;
    public item: Item;
    public width: number = BLOCK_SIZE * 0.5;
    public height: number = BLOCK_SIZE * 0.5;

    private lifetime: number = 300; // 5 minutes in frames at 60fps is 18000. Let's do 5 seconds for now.
    private pickupDelay: number = 30; // 0.5 seconds
    private collected: boolean = false;

    private bobTimer: number = 0;
    private rotationAngle: number = 0;
    private glowPulse: number = 0;

    constructor(position: Vector2, item: Item) {
        this.position = { 
            x: position.x - this.width / 2,
            y: position.y - this.height / 2
        };
        this.item = item;
        this.velocity.x = (Math.random() - 0.5) * 5;
        this.velocity.y = -Math.random() * 5;
    }

    update(deltaTime: number, physics: PhysicsSystem): void {
        this.lifetime -= deltaTime * 60;
        if (this.pickupDelay > 0) {
            this.pickupDelay -= deltaTime * 60;
        }

        // Bobbing animation
        this.bobTimer += deltaTime * 4;
        
        // Rotation animation
        this.rotationAngle += deltaTime * 2;
        
        // Glow pulse for rare items
        this.glowPulse = Math.sin(this.bobTimer * 2) * 0.5 + 0.5;

        physics.applyGravity(this);
        this.velocity.x *= 0.95; // Air/ground friction
        physics.updatePositionAndCollision(this);
    }
    
    public canBePickedUp(): boolean {
        return this.pickupDelay <= 0 && !this.collected;
    }

    public collect(): void {
        this.collected = true;
    }

    public shouldBeRemoved(): boolean {
        return this.collected || this.lifetime <= 0;
    }

    public render(ctx: CanvasRenderingContext2D, blockRenderer: BlockRenderer): void {
        const itemInfo = CraftingSystem.getItemInfo(this.item.id);
        if (!itemInfo || !itemInfo.blockId) return;
        
        // Calculate bob offset
        const bob = Math.sin(this.bobTimer) * 4;
        const x = this.position.x;
        const y = this.position.y + bob;
        
        ctx.save();
        
        // Glow effect for rare items (diamonds, etc.)
        if (this.item.id === ItemId.DIAMOND) {
          ctx.shadowColor = '#68ded1';
          ctx.shadowBlur = 20 * this.glowPulse;
        }
        
        // Center and rotate
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.rotate(this.rotationAngle);
        ctx.scale(0.5, 0.5); // Smaller than block size
        ctx.translate(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2);
        
        // Render the block/item
        blockRenderer.render(ctx, itemInfo.blockId, 0, 0);
        
        ctx.restore();
    }
}