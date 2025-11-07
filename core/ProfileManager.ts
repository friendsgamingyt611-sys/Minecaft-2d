
import { PlayerProfile } from "../types";

export class ProfileManager {
    private static _instance: ProfileManager;
    private profiles: PlayerProfile[] = [];
    private activeProfileUUID: string | null = null;
    
    private readonly PROFILES_KEY = 'minecraft2d_player_profiles_v1';
    private readonly ACTIVE_PROFILE_KEY = 'minecraft2d_active_profile_v1';

    private constructor() {}

    public static get instance(): ProfileManager {
        if (!ProfileManager._instance) {
            ProfileManager._instance = new ProfileManager();
        }
        return ProfileManager._instance;
    }

    public loadProfiles() {
        try {
            const profilesData = localStorage.getItem(this.PROFILES_KEY);
            if (profilesData) {
                this.profiles = JSON.parse(profilesData);
            }
            const activeUUID = localStorage.getItem(this.ACTIVE_PROFILE_KEY);
            if (activeUUID && this.profiles.some(p => p.uuid === activeUUID)) {
                this.activeProfileUUID = activeUUID;
            } else if (this.profiles.length > 0) {
                this.activeProfileUUID = this.profiles[0].uuid;
            }
        } catch (e) {
            console.error("Failed to load profiles:", e);
            this.profiles = [];
            this.activeProfileUUID = null;
        }
    }

    public saveProfiles() {
        try {
            localStorage.setItem(this.PROFILES_KEY, JSON.stringify(this.profiles));
            if(this.activeProfileUUID) {
                localStorage.setItem(this.ACTIVE_PROFILE_KEY, this.activeProfileUUID);
            }
        } catch (e) {
            console.error("Failed to save profiles:", e);
        }
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    public createProfile(name: string, skin: PlayerProfile['skin']): PlayerProfile {
        const newProfile: PlayerProfile = {
            uuid: this.generateUUID(),
            name,
            skin,
            createdAt: Date.now(),
            lastPlayed: Date.now(),
        };
        this.profiles.push(newProfile);
        this.setActiveProfile(newProfile.uuid);
        this.saveProfiles();
        return newProfile;
    }

    public getActiveProfile(): PlayerProfile | null {
        if (!this.activeProfileUUID) return null;
        return this.profiles.find(p => p.uuid === this.activeProfileUUID) || null;
    }

    public setActiveProfile(uuid: string) {
        if (this.profiles.some(p => p.uuid === uuid)) {
            this.activeProfileUUID = uuid;
            this.saveProfiles();
        }
    }
}
