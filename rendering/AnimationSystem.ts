
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
        if (this.landingTimer > 0) {
            pose = this.createLandingPose(player, this.landingTimer / this.LANDING_DURATION);
        } else {
            pose = this.getAnimationStatePose(player);
        }
        
        // FIX: The `eyeOffset` is now correctly propagated from the player state into the pose.
        pose.eyeOffset = player.eyeOffset;
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

    private createDefaultPose(player?: Player): PlayerPose {
        const skin = player?.skinColor || '#c58c6b';
        const shirt = player?.shirtColor || '#4ca7a7';
        const pants = player?.pantsColor || '#3a3a99';
        
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
            leftArm: { x: -torsoWidth/2 - armWidth/2, y: torsoBaseY - torsoHeight + armHeight/2, width: armWidth, height: armHeight, rotation: 0, color: skin, z: 2 },
            rightArm: { x: torsoWidth/2 + armWidth/2, y: torsoBaseY - torsoHeight + armHeight/2, width: armWidth, height: armHeight, rotation: 0, color: skin, z: 0 },
            leftLeg: { x: -torsoWidth/4, y: playerHeight - legHeight/2, width: legWidth, height: legHeight, rotation: 0, color: pants, z: 2 },
            rightLeg: { x: torsoWidth/4, y: playerHeight - legHeight/2, width: legWidth, height: legHeight, rotation: 0, color: pants, z: 0 },
            eyeOffset: player?.eyeOffset || { x: 0, y: 0 },
        };
    }

    // New helper to correctly position a limb based on a joint on the torso
    private positionLimb(limb: BodyPart, torso: BodyPart, jointOffset: Vector2, angle: number) {
        limb.rotation = angle;
        const jointX = torso.x + jointOffset.x;
        const jointY = torso.y + jointOffset.y;
        const pivotToCenterY = limb.height / 2;
        const rotatedX = pivotToCenterY * Math.sin(angle);
        const rotatedY = pivotToCenterY * Math.cos(angle);
        limb.x = jointX + rotatedX;
        limb.y = jointY + rotatedY;
    }

    private createIdlePose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const breath = Math.sin(this.animationTimer * 2) * 0.02;
        pose.torso.y -= breath * BLOCK_SIZE * 0.2;
        pose.head.y -= breath * BLOCK_SIZE * 0.4;
        
        // Position limbs relative to the torso
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
        
        // Add torso bob
        const bob = Math.abs(Math.sin(this.animationTimer * 10)) * 0.05 * BLOCK_SIZE;
        pose.torso.y -= bob;
        pose.head.y -= bob;

        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, swingAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, -swingAngle);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, -swingAngle);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, swingAngle);
        
        return pose;
    }

    private createJumpingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const torso = pose.torso;
        
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, 0.5);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, -0.2);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, -0.3);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0.3);

        return pose;
    }

    private createFallingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const torso = pose.torso;
        
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, -0.2);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, 0.2);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, 0.1);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, -0.1);
        
        return pose;
    }

    private createLandingPose(player: Player, progress: number): PlayerPose {
        const pose = this.createDefaultPose(player);
        const crouchAmount = Math.sin((1 - progress) * Math.PI) * 0.15 * BLOCK_SIZE; // Use sin curve for smooth ease-in-out
        
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
        const swingProgress = (this.mineSwingTimer % 0.5) / 0.5; // 0.5 second swing
        const swingAngle = Math.sin(swingProgress * Math.PI) * 1.5; // Use half-circle for a better swing

        pose.torso.rotation = swingAngle * 0.1;

        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, swingAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, 0.2); // Bracing arm
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0);

        return pose;
    }

    private createSneakingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        
        // Lower the body
        const sneakOffset = BLOCK_SIZE * 0.2;
        pose.torso.y += sneakOffset;
        pose.head.y += sneakOffset;

        // Slight crouch
        pose.torso.rotation = 0.1;
        pose.head.rotation = -0.1;

        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, 0);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, 0);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, -0.2);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0.2);

        return pose;
    }
}