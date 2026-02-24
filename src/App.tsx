// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { DashboardCards } from './components/DashboardCards';
import { ProgressBar } from './components/ProgressBar';
import { ServerList } from './components/ServerList';
import { ActionButtons } from './components/ActionButtons';
import { SettingsPage } from './components/SettingsPage';
import { ToastNotification } from './components/Toast';
import { useDNSScanner } from './hooks/useDNSScanner';
import { useSystemDNS } from './hooks/useSystemDNS';
import { useSettings } from './hooks/useSettings';
import { useToast } from './hooks/useToast';

type TabView = 'dashboard' | 'settings';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabView>('dashboard');
    const [isApplying, setIsApplying] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const { results, isScanning, progress, bestDNS, startScan } = useDNSScanner();
    const { systemDNS, isLoading: dnsLoading, refresh: refreshDNS } = useSystemDNS();
    const { settings, updateSettings, getTestCount } = useSettings();
    const { toast, showToast } = useToast();

    // Auto-optimize on launch
    useEffect(() => {
        if (settings.autoOptimize && window.electronAPI) {
            const timer = setTimeout(() => {
                handleScan();
            }, 1500);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScan = useCallback(async () => {
        showToast('Starting DNS scan...', 'info');
        await startScan(getTestCount());
        showToast('Scan complete! Best DNS provider found.', 'success');
    }, [startScan, getTestCount, showToast]);

    const handleApply = useCallback(async () => {
        if (!bestDNS || !window.electronAPI) return;

        // If the user has a preferred provider override, find it
        let targetDNS = bestDNS;
        if (settings.preferredProvider !== 'auto') {
            const preferred = results.find(
                (r) => r.provider === settings.preferredProvider && r.status === 'done'
            );
            if (preferred) {
                targetDNS = preferred;
            }
        }

        setIsApplying(true);
        showToast(`Applying ${targetDNS.provider} DNS...`, 'info');

        try {
            const result = await window.electronAPI.applyDNS(targetDNS.primaryIP, targetDNS.secondaryIP);
            if (result.success) {
                showToast(result.message, 'success');
                await refreshDNS();
            } else {
                showToast(result.message, 'error');
            }
        } catch (err) {
            showToast('Failed to apply DNS. Please try again.', 'error');
        } finally {
            setIsApplying(false);
        }
    }, [bestDNS, results, settings.preferredProvider, showToast, refreshDNS]);

    const handleRestore = useCallback(async () => {
        if (!window.electronAPI) return;

        setIsRestoring(true);
        showToast('Restoring default DNS (DHCP)...', 'info');

        try {
            const result = await window.electronAPI.restoreDNS();
            if (result.success) {
                showToast(result.message, 'success');
                await refreshDNS();
            } else {
                showToast(result.message, 'error');
            }
        } catch (err) {
            showToast('Failed to restore DNS. Please try again.', 'error');
        } finally {
            setIsRestoring(false);
        }
    }, [showToast, refreshDNS]);

    // Find which server is currently being tested
    const currentlyTesting = results.find((r) => r.status === 'testing');

    return (
        <>
            <TitleBar />

            <div className="app-container">
                {/* Header */}
                <div className="app-header">
                    <h1>MaJa's DNS Changer</h1>
                    <p>Smart DNS Optimization Tool</p>
                </div>

                {/* Navigation */}
                <div className="nav-tabs">
                    <button
                        className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                        id="tab-dashboard"
                    >
                        Dashboard
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                        id="tab-settings"
                    >
                        Settings
                    </button>
                </div>

                {/* Content */}
                <div className="app-content">
                    {activeTab === 'dashboard' ? (
                        <div className="fade-in">
                            <DashboardCards
                                currentDNS={systemDNS.dns}
                                adapter={systemDNS.adapter}
                                isDHCP={systemDNS.isDHCP}
                                bestDNS={bestDNS}
                                isLoading={dnsLoading}
                            />

                            <ProgressBar
                                progress={progress}
                                isScanning={isScanning}
                                currentTest={currentlyTesting?.provider || ''}
                            />

                            <ServerList
                                results={results}
                                bestProvider={bestDNS?.provider || null}
                            />

                            {!isScanning && progress === 0 && (
                                <div className="empty-state">
                                    <div className="empty-state-icon">🌐</div>
                                    <div className="empty-state-text">
                                        Click "Scan & Optimize DNS" to test all DNS providers and find the fastest one for your network.
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <SettingsPage
                            settings={settings}
                            onUpdate={updateSettings}
                        />
                    )}
                </div>

                {/* Action Buttons (only on dashboard) */}
                {activeTab === 'dashboard' && (
                    <ActionButtons
                        isScanning={isScanning}
                        hasBestDNS={bestDNS !== null}
                        onScan={handleScan}
                        onApply={handleApply}
                        onRestore={handleRestore}
                        isApplying={isApplying}
                        isRestoring={isRestoring}
                    />
                )}
            </div>

            <ToastNotification
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
            />
        </>
    );
};

export default App;
