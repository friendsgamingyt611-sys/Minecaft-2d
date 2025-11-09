import { Player } from '../entities/Player';
import { BodyPart, PlayerPose, Vector2 } from '../types';
import { BLOCK_SIZE, PLAYER_HEIGHT } from '../core/Constants';
import { SettingsManager } from '../core/SettingsManager';

export class AnimationSystem {
    private animationTimer: number = 0;
    private mineSwingTimer: number = 0;
    private landingTimer: number = 0;
    private hurtTimer: number = 0;
    private readonly LANDING_DURATION = 0.2;
    private readonly HURT_DURATION = 0.25;

    public update(deltaTime: number, player: Player): void {
        this.animationTimer += deltaTime * (player.isSprinting ? 1.5 : 1);
        if (player.isMining) this.mineSwingTimer += deltaTime;
        else this.mineSwingTimer = 0;
        
        if (player.justLanded) this.landingTimer = this.LANDING_DURATION;
        if (this.landingTimer > 0) this.landingTimer -= deltaTime;
        
        if (player.justTookDamage) this.hurtTimer = this.HURT_DURATION;
        if (this.hurtTimer > 0) this.hurtTimer -= deltaTime;
    }

    public getPose(player: Player): PlayerPose {
        let pose: PlayerPose;
        if (this.hurtTimer > 0) {
            pose = this.createHurtPose(player);
        } else if (player.placementAnimTimer > 0) {
            pose = this.createPlacementPose(player);
        } else if (this.landingTimer > 0) {
            pose = this.createLandingPose(player, this.landingTimer / this.LANDING_DURATION);
        } else {
            pose = this.getAnimationStatePose(player);
        }
        
        const localEyeOffsetX = player.eyeOffset.x * player.facingDirection;
        pose.head.rotation += localEyeOffsetX * 0.3 - pose.torso.rotation;
        pose.head.y += player.eyeOffset.y * (BLOCK_SIZE * 0.1);
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
            case 'dying':
                return this.createDyingPose(player);
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
            leftArm: { x: -torsoWidth/2 - armWidth/2, y: torsoBaseY - torsoHeight + armHeight/2, width: armWidth, height: armHeight, rotation: 0, color: skin, z: facingDirection === 1 ? 0 : 2 },
            rightArm: { x: torsoWidth/2 + armWidth/2, y: torsoBaseY - torsoHeight + armHeight/2, width: armWidth, height: armHeight, rotation: 0, color: skin, z: facingDirection === 1 ? 2 : 0 },
            leftLeg: { x: -torsoWidth/4, y: playerHeight - legHeight/2, width: legWidth, height: legHeight, rotation: 0, color: pants, z: facingDirection === 1 ? 0 : 2 },
            rightLeg: { x: torsoWidth/4, y: playerHeight - legHeight/2, width: legWidth, height: legHeight, rotation: 0, color: pants, z: facingDirection === 1 ? 2 : 0 },
            eyeOffset: player?.eyeOffset || { x: 0, y: 0 },
        };
    }

    private positionLimb(limb: BodyPart, torso: BodyPart, jointOffset: Vector2, angle: number) {
        const rotate = (p: Vector2, angle: number) => {
            const cos = Math.cos(angle); const sin = Math.sin(angle);
            return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
        };
        const rotatedJointOffset = rotate(jointOffset, torso.rotation);
        const jointPos = { x: torso.x + rotatedJointOffset.x, y: torso.y + rotatedJointOffset.y };
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
        const armSway = Math.sin(this.animationTimer * 0.8) * 0.05;
        pose.torso.y -= breath * BLOCK_SIZE * 0.2;
        pose.head.y -= breath * BLOCK_SIZE * 0.4;
        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, armSway);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, armSway);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0);
        return pose;
    }
    
    private createWalkingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const swingAngle = Math.sin(this.animationTimer * 10) * (player.isSprinting ? 0.9 : 0.6);
        
        const { viewBobbing, viewBobbingIntensity } = SettingsManager.instance.settings.graphics;
        const { reducedMotion } = SettingsManager.instance.settings.accessibility;
        let bob = 0;
        if (viewBobbing && !reducedMotion) {
            bob = Math.abs(Math.sin(this.animationTimer * 10)) * (player.isSprinting ? 0.12 : 0.08) * BLOCK_SIZE * (viewBobbingIntensity / 100);
        }

        pose.torso.y -= bob;
        pose.head.y -= bob;
        pose.torso.rotation = player.isSprinting ? 0.25 : 0.15;
        const torso = pose.torso;
        
        const rightArmAngle = -swingAngle;
        const leftArmAngle = swingAngle;
        const rightLegAngle = swingAngle;
        const leftLegAngle = -swingAngle;

        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, rightArmAngle);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, leftArmAngle);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, rightLegAngle);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, leftLegAngle);

        // Z-index layering: Higher z is in front. Torso is at z=1.
        let nearArm, farArm, nearLeg, farLeg;
        let nearArmAngle, farArmAngle, nearLegAngle, farLegAngle;

        if (player.facingDirection === 1) { // Facing right
            [nearArm, farArm] = [pose.rightArm, pose.leftArm];
            [nearLeg, farLeg] = [pose.rightLeg, pose.leftLeg];
            [nearArmAngle, farArmAngle] = [rightArmAngle, leftArmAngle];
            [nearLegAngle, farLegAngle] = [rightLegAngle, leftLegAngle];
        } else { // Facing left
            [nearArm, farArm] = [pose.leftArm, pose.rightArm];
            [nearLeg, farLeg] = [pose.leftLeg, pose.rightLeg];
            [nearArmAngle, farArmAngle] = [leftArmAngle, rightArmAngle];
            [nearLegAngle, farLegAngle] = [leftLegAngle, rightLegAngle];
        }

        nearArm.z = 2; farArm.z = 0;
        nearLeg.z = 2; farLeg.z = 0;
        
        // If the far arm is swinging forward (angle decreases), bring it in front.
        if (farArmAngle < -0.1) farArm.z = 3;
        
        // If the far leg is swinging forward (angle increases), bring it in front.
        if (farLegAngle > 0.1) farLeg.z = 3;
        
        return pose;
    }

    private createJumpingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const torso = pose.torso;
        const tuck = 0.4;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, -0.2);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, 0.2);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, tuck);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, tuck);
        pose.rightLeg.y -= 5;
        pose.leftLeg.y -= 5;
        return pose;
    }

    private createFallingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const fallSway = Math.sin(this.animationTimer * 3) * 0.1;
        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, 0.2);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, -0.2);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, 0.1 + fallSway);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0.1 - fallSway);
        return pose;
    }

    private createLandingPose(player: Player, progress: number): PlayerPose {
        const pose = this.createDefaultPose(player);
        const crouchAmount = Math.sin((1 - progress) * Math.PI) * 0.15 * BLOCK_SIZE;
        pose.torso.y += crouchAmount;
        pose.head.y += crouchAmount;
        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, crouchAmount * 0.03);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, -crouchAmount * 0.03);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, -crouchAmount * 0.02);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, crouchAmount * 0.02);
        return pose;
    }

    private createMiningPose(player: Player): PlayerPose {
        const pose = this.createIdlePose(player); // Start from a stable idle pose
        const swingProgress = (this.mineSwingTimer % 0.5) / 0.5; // Faster swing
        const swingAngle = Math.sin(swingProgress * Math.PI) * -2.2; // Swing down and up
        
        // Slight torso lean for effort
        pose.torso.rotation = 0.2;
        const torso = pose.torso;
        
        const frontArm = pose.leftArm.z > pose.rightArm.z ? pose.leftArm : pose.rightArm;
        const backArm = pose.leftArm.z > pose.rightArm.z ? pose.rightArm : pose.leftArm;

        // Position arms based on new torso rotation
        const frontArmShoulder = { x: (frontArm === pose.leftArm ? -torso.width / 2 : torso.width / 2), y: -torso.height / 2 };
        const backArmShoulder = { x: (backArm === pose.leftArm ? -torso.width / 2 : torso.width / 2), y: -torso.height / 2 };

        this.positionLimb(frontArm, torso, frontArmShoulder, swingAngle + 0.5);
        this.positionLimb(backArm, torso, backArmShoulder, 0.2); // Keep back arm stable
        
        // Keep legs stationary
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, 0);

        return pose;
    }
    
    private createPlacementPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const progress = player.placementAnimTimer / 0.3;
        const reach = Math.sin(progress * Math.PI);
        const torso = pose.torso;

        // FIX: Correctly identify the front arm to perform the placement animation.
        const frontArm = pose.leftArm.z > pose.rightArm.z ? pose.leftArm : pose.rightArm;
        const backArm = pose.leftArm.z > pose.rightArm.z ? pose.rightArm : pose.leftArm;
        
        const frontArmXOffset = (frontArm === pose.leftArm) ? -torso.width / 2 : torso.width / 2;
        const backArmXOffset = (backArm === pose.leftArm) ? -torso.width / 2 : torso.width / 2;

        this.positionLimb(frontArm, torso, { x: frontArmXOffset, y: -torso.height / 2 }, -1.0 * reach);
        this.positionLimb(backArm, torso, { x: backArmXOffset, y: -torso.height/2}, 0);
        
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height/2}, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height/2}, 0);
        return pose;
    }

    private createSneakingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const isMoving = Math.abs(player.velocity.x) > 0.1;
        const walkCycle = this.animationTimer * 6; // Slower cycle for sneaking
    
        // Add a forward lean to the torso
        pose.torso.rotation = 0.25;
    
        const torso = pose.torso;
    
        // Head looks forward, compensating for torso lean
        // The joint is at the top of the torso, so y offset is -torso.height/2
        this.positionLimb(pose.head, torso, { x: 0, y: -torso.height / 2 }, -torso.rotation);
        
        // Move arms forward, as if ready, with a slight swing when moving
        const armSwing = isMoving ? Math.sin(walkCycle) * 0.3 : 0;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height / 2 }, -0.6 - armSwing);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height / 2 }, -0.6 + armSwing);
    
        // Legs are bent and provide movement
        const legSwing = isMoving ? Math.sin(walkCycle) * 0.25 : 0;
        this.positionLimb(pose.rightLeg, torso, { x: torso.width / 4, y: torso.height / 2 }, legSwing);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width / 4, y: torso.height / 2 }, -legSwing);
    
        // Also apply z-indexing for sneaking walk
        if (isMoving) {
            // Use the leg swing to determine which side is "forward"
            if (legSwing * player.facingDirection > 0) { // Right leg is forward
                pose.leftArm.z = 2; pose.rightLeg.z = 2;
                pose.rightArm.z = 0; pose.leftLeg.z = 0;
            } else { // Left leg is forward
                pose.rightArm.z = 2; pose.leftLeg.z = 2;
                pose.leftArm.z = 0; pose.rightLeg.z = 0;
            }
        }
    
        return pose;
    }
    
    private createHurtPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        const progress = this.hurtTimer / this.HURT_DURATION;
        const knockback = Math.sin(progress * Math.PI) * 0.4; // Quick in-out motion
        
        pose.torso.rotation = -knockback * player.facingDirection;
        pose.head.rotation = knockback * 0.5 * player.facingDirection;

        const torso = pose.torso;
        this.positionLimb(pose.rightArm, torso, { x: torso.width / 2, y: -torso.height/2 }, -knockback);
        this.positionLimb(pose.leftArm, torso, { x: -torso.width / 2, y: -torso.height/2 }, -knockback);
        this.positionLimb(pose.rightLeg, torso, { x: torso.width/4, y: torso.height/2 }, 0);
        this.positionLimb(pose.leftLeg, torso, { x: -torso.width/4, y: torso.height/2 }, 0);
        return pose;
    }

    private createDyingPose(player: Player): PlayerPose {
        const pose = this.createDefaultPose(player);
        pose.torso.rotation = -Math.PI / 2; // Lie flat
        
        const fallOffset = player.height / 2;
        pose.torso.y += fallOffset;
        pose.head.y += fallOffset;
        pose.rightArm.y += fallOffset;
        pose.leftArm.y += fallOffset;
        pose.rightLeg.y += fallOffset;
        pose.leftLeg.y += fallOffset;

        return pose;
    }
}