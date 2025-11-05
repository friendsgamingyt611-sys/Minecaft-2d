
import { Settings, ControlScheme } from "../types";

export class SettingsManager {
    private static _instance: SettingsManager;
    public settings: Settings;

    private readonly SETTINGS_KEY = 'minecraft2D_settings_v1';
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
    
    private get defaultSettings(): Settings {
        return {
            uiScale: 1.0,
            renderInteractiveArea: false,
            controlScheme: 'auto',
            touchButtonSize: 1.0,
            touchButtonOpacity: 0.6,
            autoJump: true,
        };
    }

    public load(): Settings {
        try {
            const savedSettings = localStorage.getItem(this.SETTINGS_KEY);
            if (savedSettings) {
                // Merge saved settings with defaults to ensure new settings are applied
                return { ...this.defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
        return this.defaultSettings;
    }

    public save(newSettings?: Settings): void {
        if (newSettings) {
            this.settings = newSettings;
        }
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    }

    public resetToDefaults(): void {
        this.settings = this.defaultSettings;
        this.save();
    }
    
    public getEffectiveControlScheme(): 'touch' | 'keyboard' {
        if (this.settings.controlScheme === 'auto') {
            return this.isMobileDevice ? 'touch' : 'keyboard';
        }
        return this.settings.controlScheme;
    }
}