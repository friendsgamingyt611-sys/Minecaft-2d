
export class SoundManager {
    private static _instance: SoundManager;
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private music: HTMLAudioElement | null = null;
    private volume: number = 0.5;
    private musicVolume: number = 0.3;
    
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
            'block.break.grass': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/dirt_break.ogg', // FIX: Added grass sound
            'block.place': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/place.ogg',
            'ui.click': 'https://aicore-world-assets.web.app/minecraft-2d/sounds/ui_click.ogg',
        };

        for (const [key, path] of Object.entries(soundList)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            this.sounds.set(key, audio);
        }
    }

    playSound(soundKey: string, customVolume: number = 1.0) {
        const sound = this.sounds.get(soundKey);
        if (sound) {
            // Create a new audio element for each play to allow overlapping sounds
            const soundInstance = sound.cloneNode() as HTMLAudioElement;
            soundInstance.volume = this.volume * customVolume;
            soundInstance.play().catch(e => {}); // Ignore autoplay errors
        }
    }

    playMusic(musicKey: string, loop: boolean = true) {
        if (this.music && !this.music.paused) {
            this.music.pause();
        }
        this.music = new Audio(`https://aicore-world-assets.web.app/minecraft-2d/music/${musicKey}.ogg`);
        this.music.volume = this.musicVolume;
        this.music.loop = loop;
        document.addEventListener('click', () => {
             this.music?.play().catch(() => {});
        }, { once: true });
    }

    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music = null;
        }
    }
}