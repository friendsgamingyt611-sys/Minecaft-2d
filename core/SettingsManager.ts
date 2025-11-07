
import { GlobalSettings, ControlScheme } from "../types";

export class SettingsManager {
    private static _instance: SettingsManager;
    public settings: GlobalSettings;

    private readonly SETTINGS_KEY = 'minecraft2d_global_settings_v3';
    private isMobileDevice: boolean;

    private constructor() {
        this.isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.settings = this.load();
    }

    public static get instance(): SettingsManager {
        if (!SettingsManager._instance) {
            SettingsManager._instance = new SettingsManager();
        }
        return SettingsManager._instance;
    }
    
    private get defaultSettings(): GlobalSettings {
        return {
            version: '3.0',
            graphics: {
                renderDistance: 8,
                viewBobbing: true,
                viewBobbingIntensity: 100,
                particleEffects: 'All',
                clouds: 'Fancy',
                guiScale: 1.0,
                brightness: 100,
                fullscreen: false,
                fpsLimit: 60,
                fov: 70,
                cameraShakeIntensity: 100,
            },
            audio: {
                masterVolume: 100,
                musicVolume: 50,
                ambientSounds: 100,
                blockSounds: 100,
                playerSounds: 100,
                uiSounds: 100,
            },
            controls: {
                controlScheme: 'auto',
                mouseSensitivity: 100,
                autoJump: true,
                toggleCrouch: false,
                toggleSprint: false,
                keyBindings: {}, // Future use
                touchButtonSize: 1.0,
                touchButtonOpacity: 0.7,
            },
            gameplay: {
                difficulty: 'Normal',
                showCoordinates: false,
                showFps: false,
                showBiome: false,
                autoSaveIndicator: true,
                renderInteractiveArea: false,
                nametagDistance: 'Always',
                nametagOpacity: 100,
                nametagBackground: true,
            },
            accessibility: {
                highContrast: false,
                largeText: false,
                reducedMotion: false,
            }
        };
    }

    public load(): GlobalSettings {
        try {
            const savedSettings = localStorage.getItem(this.SETTINGS_KEY);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // Deep merge to ensure all nested properties from defaults are present
                // This prevents crashes when new settings are added in an update.
                const mergedSettings = {
                    ...this.defaultSettings,
                    ...parsed,
                    graphics: { ...this.defaultSettings.graphics, ...parsed.graphics },
                    audio: { ...this.defaultSettings.audio, ...parsed.audio },
                    controls: { ...this.defaultSettings.controls, ...parsed.controls },
                    gameplay: { ...this.defaultSettings.gameplay, ...parsed.gameplay },
                    accessibility: { ...this.defaultSettings.accessibility, ...parsed.accessibility },
                };
                // Re-assign to ensure type correctness
                this.settings = mergedSettings;
                return mergedSettings;
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
        this.settings = this.defaultSettings;
        return this.settings;
    }

    public save(newSettings?: GlobalSettings): void {
        if (newSettings) {
            this.settings = newSettings;
        }
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (error)
        {
            console.error("Failed to save settings:", error);
        }
    }

    public resetToDefaults(): void {
        this.settings = this.defaultSettings;
        this.save();
    }
    
    public getEffectiveControlScheme(): 'touch' | 'keyboard' {
        if (this.settings.controls.controlScheme === 'auto') {
            return this.isMobileDevice ? 'touch' : 'keyboard';
        }
        return this.settings.controls.controlScheme as 'touch' | 'keyboard';
    }
}
