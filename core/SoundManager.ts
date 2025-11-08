import { SettingsManager } from "./SettingsManager";

export class SoundManager {
    private static _instance: SoundManager;
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private music: HTMLAudioElement | null = null;
    
    private constructor() {}

    public static get instance(): SoundManager {
        if (!SoundManager._instance) {
            SoundManager._instance = new SoundManager();
        }
        return SoundManager._instance;
    }

    preloadSounds() {
        const soundList = {
            'player.hurt': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/player_hurt.ogg',
            'player.death': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/player_death.ogg',
            'block.break.stone': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/stone_break.ogg',
            'block.break.wood': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/wood_break.ogg',
            'block.break.dirt': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/dirt_break.ogg',
            'block.break.grass': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/dirt_break.ogg',
            'block.place': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/place.ogg',
            'ui.click': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/ui_click.ogg',
            'item.break': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/item_break.ogg',
            'item.break.warning': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/ui_click.ogg',
            'zombie.hurt': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/zombie_hurt.ogg',
            'zombie.death': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/zombie_death.ogg',
            'zombie.ambient': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/zombie_ambient.ogg',
        };

        for (const [key, path] of Object.entries(soundList)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            this.sounds.set(key, audio);
        }
    }

    private getVolume(type: 'block' | 'player' | 'ui' | 'ambient'): number {
        const audioSettings = SettingsManager.instance.settings.audio;
        const master = audioSettings.masterVolume / 100;
        let category = 1.0;
        if (type === 'block') category = audioSettings.blockSounds / 100;
        if (type === 'player') category = audioSettings.playerSounds / 100;
        if (type === 'ui') category = audioSettings.uiSounds / 100;
        if (type === 'ambient') category = audioSettings.ambientSounds / 100;
        return master * category;
    }

    playSound(soundKey: string) {
        const sound = this.sounds.get(soundKey);
        if (sound) {
            const soundInstance = sound.cloneNode() as HTMLAudioElement;
            let type: 'block' | 'player' | 'ui' | 'ambient' = 'block';
            if (soundKey.startsWith('player')) type = 'player';
            if (soundKey.startsWith('ui')) type = 'ui';
            
            soundInstance.volume = this.getVolume(type);
            soundInstance.play().catch(e => {});
        }
    }

    playMusic(musicKey: string, loop: boolean = true) {
        if (this.music && !this.music.paused) {
            this.music.pause();
        }
        this.music = new Audio(`https://aicore-world-assets.web.app/minecraft-2d/music/${musicKey}.ogg`);
        this.updateMusicVolume();
        this.music.loop = loop;
        document.addEventListener('click', () => {
             this.music?.play().catch(() => {});
        }, { once: true });
    }
    
    public updateMusicVolume() {
        if (this.music) {
            const audioSettings = SettingsManager.instance.settings.audio;
            this.music.volume = (audioSettings.masterVolume / 100) * (audioSettings.musicVolume / 100);
        }
    }

    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music = null;
        }
    }
}