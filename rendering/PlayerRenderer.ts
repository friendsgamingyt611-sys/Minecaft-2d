import { Player } from '../entities/Player';
import { PlayerPose, BodyPart, ToolInfo, ItemId } from '../types';
import { CraftingSystem } from '../crafting/CraftingSystem';
import { BLOCK_SIZE } from '../core/Constants';
import { getBlockType } from '../world/BlockRegistry';

export class PlayerRenderer {

    private drawPart(ctx: CanvasRenderingContext2D, part: BodyPart, player: Player, facingDirection: number): void {
        const darkerColor = this.shadeColor(part.color, -0.3);
        const lighterColor = this.shadeColor(part.color, 0.1);

        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.rotate(part.rotation); // Rotation is now pre-calculated in model space
        ctx.translate(-part.width / 2, -part.height / 2);

        // Main Fill
        ctx.fillStyle = part.color;
        ctx.fillRect(0, 0, part.width, part.height);

        // 3D effect shading
        ctx.fillStyle = darkerColor;
        ctx.beginPath();
        ctx.moveTo(0, part.height);
        ctx.lineTo(part.width * 0.2, part.height * 0.8);
        ctx.lineTo(part.width, part.height * 0.8);
        ctx.lineTo(part.width, part.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = lighterColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(part.width * 0.2, part.height * 0.2);
        ctx.lineTo(part.width, part.height * 0.2);
        ctx.lineTo(part.width, 0);
        ctx.closePath();
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = this.shadeColor(part.color, -0.5);
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, part.width, part.height);
        
        ctx.restore();
    }
    
    private shadeColor(color: string, percent: number): string {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = Math.floor(R * (1 + percent));
        G = Math.floor(G * (1 + percent));
        B = Math.floor(B * (1 + percent));

        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;

        R = Math.round(R);
        G = Math.round(G);
        B = Math.round(B);

        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }

    private drawFace(ctx: CanvasRenderingContext2D, player: Player, pose: PlayerPose): void {
        const { head, eyeOffset } = pose;
    
        ctx.save();
        // Apply the same transformations as the head part itself
        ctx.translate(head.x, head.y);
        ctx.rotate(head.rotation);
        ctx.translate(-head.width / 2, -head.height / 2);
    
        const hairHeight = head.height * 0.4;
        const eyeY = head.height * 0.5;
        const eyeWidth = head.width * 0.2;
        let eyeHeight = head.height * 0.25; // Base height
        const pupilSize = eyeWidth * 0.6;
    
        // Draw Hair
        ctx.fillStyle = player.hairColor;
        ctx.fillRect(0, 0, head.width, hairHeight);
        // Hair shading
        ctx.fillStyle = this.shadeColor(player.hairColor, -0.2);
        ctx.fillRect(0, hairHeight, head.width, 2); // Shadow under hair
        ctx.fillStyle = this.shadeColor(player.hairColor, 0.2);
        ctx.fillRect(head.width * 0.1, 0, head.width * 0.8, 2); // Highlight
    
        // Draw Eyes
        const leftEyeX = head.width * 0.2;
        const rightEyeX = head.width * 0.6;
    
        if (player.isBlinking) {
            ctx.fillStyle = this.shadeColor(player.skinColor, -0.4); // Eyelid color
            ctx.fillRect(leftEyeX, eyeY + eyeHeight * 0.4, eyeWidth, 2);
            ctx.fillRect(rightEyeX, eyeY + eyeHeight * 0.4, eyeWidth, 2);
        } else {
            // Expressive eyes based on animation state
            if (player.animationState === 'sprinting' || player.animationState === 'mining') {
                eyeHeight *= 0.6; // Squint
            } else if (player.animationState === 'jumping') {
                eyeHeight *= 1.2; // Widen
            }
    
            // Whites of the eyes
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(leftEyeX, eyeY, eyeWidth, eyeHeight);
            ctx.fillRect(rightEyeX, eyeY, eyeWidth, eyeHeight);
    
            // Pupils
            ctx.fillStyle = '#000000';
            const pupilXOffset = eyeOffset.x * (eyeWidth - pupilSize);
            let pupilYOffset = eyeOffset.y * (eyeHeight - pupilSize);
    
            if (player.isSneaking) {
                pupilYOffset += eyeHeight * 0.2;
            }
    
            ctx.fillRect(
                leftEyeX + (eyeWidth - pupilSize) / 2 + pupilXOffset, 
                eyeY + (eyeHeight - pupilSize) / 2 + pupilYOffset, 
                pupilSize, 
                pupilSize
            );
            ctx.fillRect(
                rightEyeX + (eyeWidth - pupilSize) / 2 + pupilXOffset, 
                eyeY + (eyeHeight - pupilSize) / 2 + pupilYOffset, 
                pupilSize, 
                pupilSize
            );
        }
    
        ctx.restore();
    }

    private renderHeldItem(ctx: CanvasRenderingContext2D, player: Player, pose: PlayerPose): void {
      const heldItem = player.inventory.getItem(player.activeHotbarSlot);
      if (!heldItem || player.animationState === 'sprinting') return;
      
      const itemInfo = CraftingSystem.getItemInfo(heldItem.id);
      if (!itemInfo) return;
      
      const frontArm = pose.leftArm.z > pose.rightArm.z ? pose.leftArm : pose.rightArm;
      
      ctx.save();
      
      // We are in a coordinate system where (0,0) is the player's root (center of feet)
      // and has been scaled by facingDirection. We need to find the end of the arm in this space.
      const armPivotX = frontArm.x - frontArm.width/2;
      const armPivotY = frontArm.y - frontArm.height/2;

      ctx.translate(armPivotX, armPivotY);
      ctx.rotate(frontArm.rotation);
      
      // Move to the "hand" position, near the end of the arm
      ctx.translate(0, frontArm.height * 0.8);
      
      // Rotate item to a natural angle
      ctx.rotate(Math.PI / 4);
      
      const itemSize = BLOCK_SIZE * 0.7;
      ctx.translate(-itemSize / 2, -itemSize / 2);
      
      if (itemInfo.toolInfo) {
        // FIX: Pass the `toolInfo` property of the `itemInfo` object, not the `itemInfo` object itself.
        this.drawToolIcon(ctx, itemInfo.toolInfo, itemSize);
      } else if (itemInfo.blockId) {
        const blockType = getBlockType(itemInfo.blockId);
        if (blockType) {
          if (blockType.texture) {
            blockType.texture(ctx, 0, 0, itemSize);
          } else {
            ctx.fillStyle = blockType.color;
            ctx.fillRect(0, 0, itemSize, itemSize);
          }
        }
      }
      
      ctx.restore();
    }

    private drawToolIcon(ctx: CanvasRenderingContext2D, toolInfo: ToolInfo, size: number): void {
      const colors = {
        wood: '#8B4513',
        stone: '#808080',
        iron: '#C0C0C0',
        diamond: '#68DED1',
        none: '#888'
      };
      
      const materialColor = colors[toolInfo.tier] || '#888';
      const handleColor = '#8B4513';
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw based on tool type
      switch (toolInfo.type) {
        case 'pickaxe':
            // Handle
            ctx.strokeStyle = handleColor;
            ctx.lineWidth = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(size * 0.8, size * 0.2);
            ctx.lineTo(size * 0.2, size * 0.8);
            ctx.stroke();
            // Head
            ctx.strokeStyle = materialColor;
            ctx.lineWidth = size * 0.15;
            ctx.beginPath();
            ctx.moveTo(size * 0.9, size * 0.1);
            ctx.lineTo(size * 0.7, size * 0.3);
            ctx.moveTo(size * 0.7, size * 0.1);
            ctx.lineTo(size * 0.9, size * 0.3);
            ctx.stroke();
          break;
        case 'axe':
            // Handle
            ctx.strokeStyle = handleColor;
            ctx.lineWidth = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(size * 0.8, size * 0.2);
            ctx.lineTo(size * 0.2, size * 0.8);
            ctx.stroke();
            // Head
            ctx.fillStyle = materialColor;
            ctx.beginPath();
            ctx.moveTo(size * 0.9, size * 0.1);
            ctx.quadraticCurveTo(size * 0.6, size * 0.0, size * 0.5, size * 0.4);
            ctx.quadraticCurveTo(size * 0.4, size * 0.0, size * 0.7, size * 0.3);
            ctx.closePath();
            ctx.fill();
          break;
        case 'shovel':
            // Handle
            ctx.strokeStyle = handleColor;
            ctx.lineWidth = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(size * 0.8, size * 0.2);
            ctx.lineTo(size * 0.2, size * 0.8);
            ctx.stroke();
            // Head
            ctx.fillStyle = materialColor;
            ctx.beginPath();
            ctx.moveTo(size*0.9, size*0.1);
            ctx.quadraticCurveTo(size*0.7, -size*0.1, size*0.6, size*0.3);
            ctx.lineTo(size*0.8, size*0.4);
            ctx.closePath();
            ctx.fill();
          break;
      }
    }


    public render(ctx: CanvasRenderingContext2D, player: Player, pose: PlayerPose): void {
        ctx.save();
        // Center the drawing operations on the player's base position and handle facing direction
        ctx.translate(player.position.x + player.width / 2, player.position.y);
        ctx.scale(player.facingDirection, 1);

        const parts: BodyPart[] = [
            pose.head, pose.torso, pose.leftArm, pose.rightArm, pose.leftLeg, pose.rightLeg
        ];

        // The animation system is now responsible for providing the correct z-indices.
        // The renderer just sorts and draws.
        parts.sort((a, b) => a.z - b.z);

        for (const part of parts) {
            this.drawPart(ctx, part, player, player.facingDirection);
        }
        
        // Add held item rendering AFTER body parts but BEFORE face
        this.renderHeldItem(ctx, player, pose);
        
        // Draw face details on top of the head
        this.drawFace(ctx, player, pose);

        ctx.restore();
    }
}