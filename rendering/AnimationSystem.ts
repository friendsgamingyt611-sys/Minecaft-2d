import { Player } from '../entities/Player';
import { BodyPart, PlayerPose, Vector2 } from '../types';
// FIX: Import PLAYER_HEIGHT constant.
import { BLOCK_SIZE, PLAYER_HEIGHT } from '../core/Constants';

export class AnimationSystem {
    private animationTimer: number = 0;
    private mineSwingTimer: number = 0;
    private landingTimer: number = 0;
    private readonly LANDING_DURATION = 0.2; // 200ms

    public update(deltaTime: number, player: Player): void {
        this.animationTimer += deltaTime * (player.isSprinting ? 1.5 : 1);
        if (player.isMining) {
            this.mineSwingTimer += deltaTime;
        } else {
            this.mineSwingTimer = 0;
        }
        
        if (player.justLanded) {
            this.landingTimer = this.LANDING_DURATION;
        }
        if (this.landingTimer > 0) {
            this.landingTimer -= deltaTime;
        }
    }

    public getPose(player: Player): PlayerPose {
        let pose: PlayerPose;
        if (player.placementAnimTimer > 0) {
            pose = this.createPlacementPose(player);
        } else if (this.landingTimer > 0) {
            pose = this.createLandingPose(player, this.landingTimer / this.LANDING_DURATION);
        } else {
            pose = this.getAnimationStatePose(player);
        }
        
        // Convert world-relative eye offset to local-relative for the model pose
        const localEyeOffsetX = player.eyeOffset.x * player.facingDirection;
        
        // Apply head turn based on eye direction for a more natural look
        // The head rotation is now additive with the torso rotation from the animation pose.
        pose.head.rotation += localEyeOffsetX * 0.3 - pose.torso.rotation; // Counter-rotate from torso lean
        pose.head.y += player.eyeOffset.y * (BLOCK_SIZE * 0.1); // Nod up/down
        
        // Pass the local-space offset to the pose for the renderer to use
        pose.eyeOffset = { x: localEyeOffsetX, y: player.eyeOffset.y };
        return pose;
    }

    private getAnimationStatePose(player: Player): PlayerPose {
        switch (player.animationState) {
            case 'walking':
            case 'sprinting':
                return this.createWalkingPose(player);
            case 'jumping':
                return this.createJumpingPose(player);
            case 'falling':
                return this.createFallingPose(player);
            case 'mining':
                return this.createMiningPose(player);
            case 'sneaking':
                return this.createSneakingPose(player);
            case 'idle':
            default:
                return this.createIdlePose(player);
        }
    }

    private createDefaultPose(player: Player): PlayerPose {
        const skin = player?.skinColor || '#c58c6b';
        const shirt = player?.shirtColor || '#4ca7a7';
        const pants = player?.pantsColor || '#3a3a99';
        const facingDirection = player.facingDirection;
        
        const headSize = 8 / 16 * BLOCK_SIZE;
        const torsoHeight = 12 / 16 * BLOCK_SIZE;
        const torsoWidth = 8 / 16 * BLOCK_SIZE;
        const armWidth = 4 / 16 * BLOCK_SIZE;
        const armHeight = 12 / 16 * BLOCK_SIZE;
        const legWidth = 4 / 16 * BLOCK_SIZE;
        const legHeight = 12 / 16 * BLOCK_SIZE;
        const playerHeight = (player?.height || PLAYER_HEIGHT);
        
        const torsoBaseY = playerHeight - legHeight;
        
        return {
            head: { x: 0, y: torsoBaseY - torsoHeight - headSize / 2, width: headSize, height: headSize, rotation: 0, color: skin, z: 2 },
            torso: { x: 0, y: torsoBaseY - torsoHeight / 2, width: torsoWidth, height: torsoHeight, rotation: 0, color: shirt, z: 1 },
            leftArm: { x: -torsoWidth/2 - armWidth/2, y: torsoBaseY - torsoHeight + armHeight/2, width: armWidth, height: armHeight, rotation: 0, color: skin, z: facingDirection === 1 ? 2 : 0 },
            rightArm: { x: torsoWidth/2 + armWidth/2, y: torsoBaseY - torsoHeight + armHeight/2, width: armWidth, height: armHeight, rotation: 0, color: skin, z: facingDirection === 1 ? 0 : 2 },
            leftLeg: { x: -torsoWidth/4, y: playerHeight - legHeight/2, width: legWidth, height: legHeight, rotation: 0, color: pants, z: facingDirection === 1 ? 2 : 0 },
            rightLeg: { x: torsoWidth/4, y: playerHeight - legHeight/2, width: legWidth, height: legHeight, rotation: 0, color: pants, z: facingDirection === 1 ? 0 : 2 },
            eyeOffset: player?.eyeOffset || { x: 0, y: 0 },
        };
    }

    private positionLimb(limb: BodyPart, torso: BodyPart, jointOffset: Vector2, angle: number) {
        // Standard Counter-Clockwise rotation matrix. Produces Clockwise rotation in a Y-Down system.
        const rotate = (p: Vector2, angle: number) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return {
                x: p.x * cos - p.y * sin,
                y: p.x * sin + p.y * cos,
            };
        };

        const rotatedJointOffset = rotate(jointOffset, torso.rotation);
        const jointPos = {
            x: torso.x + rotatedJointOffset.x,
            y: torso.y + rotatedJointOffset.y
        };

        const finalAngle = torso.rotation + angle;
        limb.rotation = finalAngle;

        const pivotToCenter = { x: 0, y: limb.height / 2 };
        const rotatedPivotToCenter = rotate(pivotToCenter, finalAngle);
        
        limb.x = jointPos.x + rotatedPivotToCenter.x;
        limb.y = jointPos.y + rotatedPivotToCenter.y;
    }

    private createIdlePose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const breath = Math.sin(this.animationTimer * 2) * 0.02;
        pose.torso.y -= breath * BLOCK_SIZE * 0.2;
        pose.head.y -= breath * BLOCK_SIZE * 0.4;
        
        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, 0);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, 0);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0);
        
        return pose;
    }
    
    private createWalkingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const swingAngle = Math.sin(this.animationTimer * 10) * (player.isSprinting ? 0.8 : 0.6);

        const bob = Math.abs(Math.sin(this.animationTimer * 10)) * 0.05 * BLOCK_SIZE;
        pose.torso.y -= bob;
        pose.head.y -= bob;

        pose.torso.rotation = player.isSprinting ? 0.2 : 0.1;

        const torso = pose.torso;

        const rightLegAngle = swingAngle;
        const leftLegAngle = -swingAngle;
        const rightArmAngle = -swingAngle;
        const leftArmAngle = swingAngle;
        
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, rightArmAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, leftArmAngle);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, rightLegAngle);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, leftLegAngle);
        
        return pose;
    }

    private createJumpingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const torso = pose.torso;
        
        const armAngle = -0.4;
        const legAngle = 0.2;

        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, armAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, armAngle);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, legAngle);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, legAngle);

        return pose;
    }

    private createFallingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const torso = pose.torso;
        
        const armAngle = -0.2;
        const legAngle = 0.1;

        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, armAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, armAngle);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, legAngle);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, legAngle);
        
        return pose;
    }

    private createLandingPose(player: Player, progress: number): PlayerPose {
        const pose = this.createDefaultPose(player);
        const crouchAmount = Math.sin((1 - progress) * Math.PI) * 0.15 * BLOCK_SIZE;
        
        pose.torso.y += crouchAmount;
        pose.head.y += crouchAmount;
        
        const torso = pose.torso;
        const legAngle = crouchAmount * 0.02;
        const armAngle = crouchAmount * 0.03;

        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, armAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, -armAngle);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, -legAngle);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, legAngle);

        return pose;
    }

    private createMiningPose(player: Player): PlayerPose {
      const pose = this.createDefaultPose(player);
      
      const swingProgress = (this.mineSwingTimer % 0.6) / 0.6;
      const swingAngle = Math.sin(swingProgress * Math.PI) * 1.8;
      
      pose.torso.rotation = swingAngle * 0.15;
      
      const torso = pose.torso;
      
      const miningArm = player.facingDirection === 1 ? pose.rightArm : pose.leftArm;
      this.positionLimb(miningArm, torso, 
        { x: torso.width / 2 * (player.facingDirection === 1 ? 1 : -1), y: -torso.height / 2 }, 
        swingAngle - 0.3
      );
      
      const supportArm = player.facingDirection === 1 ? pose.leftArm : pose.rightArm;
      this.positionLimb(supportArm, torso,
        { x: -torso.width / 2 * (player.facingDirection === 1 ? 1 : -1), y: -torso.height / 2 },
        0.3 + swingAngle * 0.1
      );
      
      this.positionLimb(pose.rightLeg, torso, 
        { x: torso.width / 4, y: torso.height / 2 }, 
        swingAngle * 0.1
      );
      this.positionLimb(pose.leftLeg, torso, 
        { x: -torso.width / 4, y: torso.height / 2 }, 
        -swingAngle * 0.1
      );
      
      return pose;
    }
    
    private createPlacementPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const progress = player.placementAnimTimer / 0.3;
        const reach = Math.sin(progress * Math.PI); // Smooth out-and-in motion

        const frontArm = player.facingDirection === 1 ? pose.rightArm : pose.leftArm;
        const backArm = player.facingDirection === 1 ? pose.leftArm : pose.rightArm;
        
        const torso = pose.torso;

        this.positionLimb(frontArm, torso, 
          { x: torso.width / 2 * (player.facingDirection === 1 ? 1 : -1), y: -torso.height / 2 }, 
          -1.0 * reach // Reach forward
        );
        this.positionLimb(backArm, torso, { x: -torso.width / 2 * (player.facingDirection === 1 ? 1 : -1), y: -torso.height/2}, 0);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height/2}, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height/2}, 0);
        
        return pose;
    }


    private createSneakingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        
        const sneakOffsetY = (PLAYER_HEIGHT - player.height);
        pose.torso.y += sneakOffsetY;
        pose.head.y += sneakOffsetY;
        
        pose.torso.rotation = 0.5; 
        const torso = pose.torso;
        
        if (Math.abs(player.velocity.x) > 0.1) {
            const swingAngle = Math.sin(this.animationTimer * 7) * 0.35;

            const rightLegAngle = swingAngle;
            const leftLegAngle = -swingAngle;
    
            this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, rightLegAngle);
            this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, leftLegAngle);
            
            this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, 0.2 - rightLegAngle * 0.5);
            this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, 0.2 - leftLegAngle * 0.5);
        } else { 
            const legAngle = 0.6;
            this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, legAngle);
            this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, legAngle);
            
            const armAngle = 0.4;
            this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, armAngle);
            this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, armAngle);
        }
    
        return pose;
    }
}