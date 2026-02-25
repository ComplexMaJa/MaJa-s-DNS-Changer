// src/components/SettingsPage.tsx
import React from 'react';
import type { AppSettings } from '../hooks/useSettings';
import { CustomDropdown } from './CustomDropdown';

const DNS_PROVIDERS_LIST = [
    { value: 'auto', label: 'Auto (Best Score)', icon: '⚡' },
    { value: 'Cloudflare', label: 'Cloudflare', icon: '🟠' },
    { value: 'Google DNS', label: 'Google DNS', icon: '🔵' },
    { value: 'Quad9', label: 'Quad9', icon: '🛡️' },
    { value: 'OpenDNS', label: 'OpenDNS', icon: '🟡' },
    { value: 'AdGuard', label: 'AdGuard', icon: '🟢' },
    { value: 'NextDNS', label: 'NextDNS', icon: '🔷' },
    { value: 'ControlD', label: 'ControlD', icon: '🎮' },
    { value: 'Mullvad', label: 'Mullvad', icon: '🔒' },
    { value: 'CleanBrowsing', label: 'CleanBrowsing', icon: '🧹' },
    { value: 'Alternate DNS', label: 'Alternate DNS', icon: '🔀' },
    { value: 'Comodo Secure', label: 'Comodo Secure', icon: '🏰' },
    { value: 'DNS.SB', label: 'DNS.SB', icon: '📡' },
    { value: 'FreeDNS', label: 'FreeDNS', icon: '🆓' },
    { value: 'UncensoredDNS', label: 'UncensoredDNS', icon: '🌍' },
    { value: 'Yandex DNS', label: 'Yandex DNS', icon: '🔴' },
    { value: 'SafeDNS', label: 'SafeDNS', icon: '🛡️' },
    { value: 'OpenNIC', label: 'OpenNIC', icon: '🌐' },
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
                    <CustomDropdown
                        options={DNS_PROVIDERS_LIST}
                        value={settings.preferredProvider}
                        onChange={(val) => onUpdate({ preferredProvider: val })}
                        id="select-preferred-provider"
                    />
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
                <div className="setting-item about-item">
                    <div className="setting-label">
                        <span>MaJa's DNS Changer</span>
                        <span>Version 1.0.0 · Advanced DNS Benchmarking &amp; Optimization</span>
                    </div>
                    <img
                        src="https://img1.picmix.com/output/stamp/normal/9/3/7/9/2279739_8058d.gif"
                        alt="MaJa"
                        className="about-gif"
                    />
                </div>
            </div>
        </div>
    );
};
