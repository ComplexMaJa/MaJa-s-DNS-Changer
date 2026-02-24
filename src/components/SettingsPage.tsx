// src/components/SettingsPage.tsx
import React from 'react';
import type { AppSettings } from '../hooks/useSettings';

const DNS_PROVIDERS_LIST = [
    { value: 'auto', label: 'Auto (Best Latency)' },
    { value: 'Cloudflare', label: 'Cloudflare' },
    { value: 'Google DNS', label: 'Google DNS' },
    { value: 'Quad9', label: 'Quad9' },
    { value: 'OpenDNS', label: 'OpenDNS' },
    { value: 'AdGuard', label: 'AdGuard' },
    { value: 'NextDNS', label: 'NextDNS' },
    { value: 'Control D', label: 'Control D' },
    { value: 'Mullvad', label: 'Mullvad' },
    { value: 'CleanBrowsing', label: 'CleanBrowsing' },
    { value: 'Alternate DNS', label: 'Alternate DNS' },
];

interface SettingsPageProps {
    settings: AppSettings;
    onUpdate: (partial: Partial<AppSettings>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdate }) => {
    return (
        <div className="settings-container fade-in" id="settings-page">
            {/* General */}
            <div className="settings-section">
                <div className="settings-section-title">General</div>

                <div className="setting-item">
                    <div className="setting-label">
                        <span>Auto-optimize on launch</span>
                        <span>Automatically scan and apply the best DNS when the app starts</span>
                    </div>
                    <label className="toggle" id="toggle-auto-optimize">
                        <input
                            type="checkbox"
                            checked={settings.autoOptimize}
                            onChange={(e) => onUpdate({ autoOptimize: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                    </label>
                </div>

                <div className="setting-item">
                    <div className="setting-label">
                        <span>Preferred DNS Provider</span>
                        <span>Override auto-detection and always use this provider</span>
                    </div>
                    <div className="select-wrapper">
                        <select
                            className="select-input"
                            value={settings.preferredProvider}
                            onChange={(e) => onUpdate({ preferredProvider: e.target.value })}
                            id="select-preferred-provider"
                        >
                            {DNS_PROVIDERS_LIST.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Scan Configuration */}
            <div className="settings-section">
                <div className="settings-section-title">Scan Configuration</div>

                <div className="setting-item">
                    <div className="setting-label">
                        <span>Scan Intensity</span>
                        <span>More tests = more accurate results but takes longer</span>
                    </div>
                    <div className="radio-group" id="radio-scan-intensity">
                        {(['fast', 'normal', 'deep'] as const).map((intensity) => (
                            <label
                                key={intensity}
                                className={`radio-option ${settings.scanIntensity === intensity ? 'active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="scanIntensity"
                                    value={intensity}
                                    checked={settings.scanIntensity === intensity}
                                    onChange={() => onUpdate({ scanIntensity: intensity })}
                                />
                                {intensity === 'fast' ? 'Fast (3)' : intensity === 'normal' ? 'Normal (5)' : 'Deep (10)'}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* About */}
            <div className="settings-section">
                <div className="settings-section-title">About</div>
                <div className="setting-item">
                    <div className="setting-label">
                        <span>MaJa's DNS Changer</span>
                        <span>Version 1.0.0 · Smart DNS Optimization Tool</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
