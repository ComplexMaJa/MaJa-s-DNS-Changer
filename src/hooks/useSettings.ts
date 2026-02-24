// src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
    autoOptimize: boolean;
    preferredProvider: string;
    scanIntensity: 'fast' | 'normal' | 'deep';
}

const STORAGE_KEY = 'majas-dns-settings';

const DEFAULT_SETTINGS: AppSettings = {
    autoOptimize: false,
    preferredProvider: 'auto',
    scanIntensity: 'normal',
};

export function useSettings() {
    const [settings, setSettingsState] = useState<AppSettings>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch {
            // ignore
        }
        return DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSettings = useCallback((partial: Partial<AppSettings>) => {
        setSettingsState((prev) => ({ ...prev, ...partial }));
    }, []);

    const getTestCount = useCallback((): number => {
        switch (settings.scanIntensity) {
            case 'fast': return 3;
            case 'normal': return 5;
            case 'deep': return 10;
            default: return 5;
        }
    }, [settings.scanIntensity]);

    return { settings, updateSettings, getTestCount };
}
