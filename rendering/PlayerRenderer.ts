import { Player } from '../entities/Player';
import { PlayerPose, BodyPart, ToolInfo, ItemId, ArmorInfo } from '../types';
import { ItemRegistry } from '../inventory/ItemRegistry';
import { BLOCK_SIZE } from '../core/Constants';
import { getBlockType } from '../world/BlockRegistry';
import { SettingsManager } from '../core/SettingsManager';
import { ItemRenderer } from './ItemRenderer';

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
      
      const itemInfo = ItemRegistry.getItemInfo(heldItem.id);
      if (!itemInfo) return;
      
      const holdingArm = pose.rightArm.z > pose.leftArm.z ? pose.rightArm : pose.leftArm;
      
      ctx.save();
      
      const armPivotX = holdingArm.x - holdingArm.width/2;
      const armPivotY = holdingArm.y - holdingArm.height/2;

      ctx.translate(armPivotX, armPivotY);
      ctx.rotate(holdingArm.rotation);
      
      ctx.translate(0, holdingArm.height * 0.8);
      
      ctx.rotate(Math.PI / 4);
      
      const itemSize = BLOCK_SIZE * 0.7;
      ctx.translate(-itemSize / 2, -itemSize / 2);
      
      if (itemInfo.blockId) {
        const blockType = getBlockType(itemInfo.blockId);
        if (blockType) {
          if (blockType.texture) {
            blockType.texture(ctx, 0, 0, itemSize);
          } else {
            ctx.fillStyle = blockType.color;
            ctx.fillRect(0, 0, itemSize, itemSize);
          }
        }
      } else {
          ItemRenderer.drawItem(ctx, heldItem.id, 0, 0, itemSize);
      }
      
      ctx.restore();
    }

    private renderNametag(ctx: CanvasRenderingContext2D, player: Player) {
        const { gameplay } = SettingsManager.instance.settings;
    
        // Check visibility setting
        if (gameplay.nametagDistance === 'Never' || !player.profile.name) {
            return;
        }
        // Note: Distance check for '16 Blocks' is for multiplayer and is ignored in single player.
        // It will behave like 'Always' for now.
    
        const name = player.profile.name;
        const opacity = gameplay.nametagOpacity / 100;
        
        // Position above the player's bounding box
        const tagX = player.position.x + player.width / 2;
        const tagY = player.position.y - 20; // Raise nametag higher above the player model
    
        ctx.font = "16px Minecraftia";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        ctx.save();
        ctx.globalAlpha = opacity;
    
        if (gameplay.nametagBackground) {
            const textMetrics = ctx.measureText(name);
            const width = textMetrics.width + 10;
            const height = 22;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(tagX - width / 2, tagY - height, width, height);
        }
        
        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillText(name, tagX + 1, tagY + 1);
    
        // Main text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(name, tagX, tagY);
        
        ctx.restore();
    }

    public render(ctx: CanvasRenderingContext2D, player: Player, pose: PlayerPose): void {
        this.renderBody(ctx, player, pose);
        if (!player.isDead) {
            this.renderNametag(ctx, player);
        }
    }

    private renderArmor(ctx: CanvasRenderingContext2D, player: Player, pose: PlayerPose) {
        const armorItems = {
            helmet: player.armorInventory.getItem(0),
            chestplate: player.armorInventory.getItem(1),
            leggings: player.armorInventory.getItem(2),
            boots: player.armorInventory.getItem(3),
        };

        const getArmorColor = (item: ItemId | undefined): string | null => {
            if (!item) return null;
            if (item >= ItemId.LEATHER_HELMET && item <= ItemId.LEATHER_BOOTS) return '#7a4a35';
            if (item >= ItemId.IRON_HELMET && item <= ItemId.IRON_BOOTS) return '#c0c0c0';
            if (item >= ItemId.DIAMOND_HELMET && item <= ItemId.DIAMOND_BOOTS) return '#68ded1';
            return null;
        }
    
        const helmetColor = getArmorColor(armorItems.helmet?.id);
        if (helmetColor) {
            this.drawPart(ctx, { ...pose.head, color: helmetColor }, player, player.facingDirection);
        }

        const chestplateColor = getArmorColor(armorItems.chestplate?.id);
        if (chestplateColor) {
            this.drawPart(ctx, { ...pose.torso, color: chestplateColor }, player, player.facingDirection);
            this.drawPart(ctx, { ...pose.leftArm, color: chestplateColor, height: pose.leftArm.height * 0.7 }, player, player.facingDirection);
            this.drawPart(ctx, { ...pose.rightArm, color: chestplateColor, height: pose.rightArm.height * 0.7 }, player, player.facingDirection);
        }

        const leggingsColor = getArmorColor(armorItems.leggings?.id);
        if (leggingsColor) {
            this.drawPart(ctx, { ...pose.leftLeg, color: leggingsColor }, player, player.facingDirection);
            this.drawPart(ctx, { ...pose.rightLeg, color: leggingsColor }, player, player.facingDirection);
        }

        const bootsColor = getArmorColor(armorItems.boots?.id);
        if (bootsColor) {
            const leftBoot: BodyPart = { ...pose.leftLeg, y: pose.leftLeg.y + pose.leftLeg.height * 0.3, height: pose.leftLeg.height * 0.4, color: this.shadeColor(bootsColor, -0.2) };
            const rightBoot: BodyPart = { ...pose.rightLeg, y: pose.rightLeg.y + pose.rightLeg.height * 0.3, height: pose.rightLeg.height * 0.4, color: this.shadeColor(bootsColor, -0.2) };
            this.drawPart(ctx, leftBoot, player, player.facingDirection);
            this.drawPart(ctx, rightBoot, player, player.facingDirection);
        }
    }

    private renderBody(ctx: CanvasRenderingContext2D, player: Player, pose: PlayerPose): void {
        if (player.gamemode === 'spectator') {
            ctx.globalAlpha = 0.4;
        }

        ctx.save();
        ctx.translate(player.position.x + player.width / 2, player.position.y);
        ctx.scale(player.facingDirection, 1);

        const parts: BodyPart[] = [
            pose.head, pose.torso, pose.leftArm, pose.rightArm, pose.leftLeg, pose.rightLeg
        ];

        parts.sort((a, b) => a.z - b.z);

        // Render base body parts
        for (const part of parts) {
            this.drawPart(ctx, part, player, player.facingDirection);
        }
        
        // Render face details under armor
        this.drawFace(ctx, player, pose);
        
        // Render armor on top of the body
        this.renderArmor(ctx, player, pose);
        
        // Render held item on top of everything
        this.renderHeldItem(ctx, player, pose);

        ctx.restore();

        if (player.gamemode === 'spectator') {
            ctx.globalAlpha = 1.0;
        }
    }
}