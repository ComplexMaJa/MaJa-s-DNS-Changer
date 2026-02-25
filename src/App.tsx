// src/App.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { DashboardCards } from './components/DashboardCards';
import { ScanVisualizer } from './components/ScanVisualizer';
import { LatencyBarChart } from './components/LatencyBarChart';
import { LatencyHistoryGraph } from './components/LatencyHistoryGraph';
import { ServerList } from './components/ServerList';
import { ActionButtons } from './components/ActionButtons';
import { SettingsPage } from './components/SettingsPage';
import { ToastNotification } from './components/Toast';
import { useDNSScanner } from './hooks/useDNSScanner';
import { useSystemDNS } from './hooks/useSystemDNS';
import { useSettings } from './hooks/useSettings';
import { useToast } from './hooks/useToast';
import notificationSound from '../assets/notification.mp3';

type TabView = 'dashboard' | 'settings';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabView>('dashboard');
    const [isApplying, setIsApplying] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const { providers, isScanning, progress, bestDNS, scanResults, startScan } = useDNSScanner();
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

    // Play the notification sound from assets
    const playCompletionSound = useCallback(() => {
        try {
            const audio = new Audio(notificationSound);
            audio.volume = 0.5;
            audio.play().catch(() => {
                // Audio playback blocked or not available; silently ignore
            });
        } catch {
            // Audio not available; silently ignore
        }
    }, []);

    const handleScan = useCallback(async () => {
        showToast('Starting DNS benchmark scan...', 'info');
        const best = await startScan(getTestCount());

        if (best) {
            // 1. Play completion chime
            playCompletionSound();

            // 2. Show in-app toast with actual result details
            showToast(
                `✅ Best DNS: ${best.providerName} (${best.averageLatency}ms, score: ${best.performanceScore}/100)`,
                'success'
            );

            // 3. Fire native desktop notification
            if (window.electronAPI?.showNotification) {
                window.electronAPI.showNotification(
                    '🎯 DNS Benchmark Complete',
                    `Best: ${best.providerName} — ${best.averageLatency}ms latency, ${best.performanceScore}/100 score`
                );
            }
        } else {
            showToast('Scan finished but no valid DNS providers found.', 'error');
        }
    }, [startScan, getTestCount, showToast, playCompletionSound]);

    const handleApply = useCallback(async () => {
        if (!bestDNS || !window.electronAPI) return;

        let targetDNS = bestDNS;
        if (settings.preferredProvider !== 'auto') {
            const preferred = scanResults.find(
                (r) => r.providerName === settings.preferredProvider && r.averageLatency < 9999
            );
            if (preferred) {
                targetDNS = preferred;
            }
        }

        setIsApplying(true);
        showToast(`Applying ${targetDNS.providerName} DNS...`, 'info');

        try {
            const result = await window.electronAPI.applyDNS(targetDNS.primary, targetDNS.secondary);
            if (result.success) {
                showToast(result.message, 'success');
                await refreshDNS();
            } else {
                showToast(result.message, 'error');
            }
        } catch {
            showToast('Failed to apply DNS. Please try again.', 'error');
        } finally {
            setIsApplying(false);
        }
    }, [bestDNS, scanResults, settings.preferredProvider, showToast, refreshDNS]);

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
        } catch {
            showToast('Failed to restore DNS. Please try again.', 'error');
        } finally {
            setIsRestoring(false);
        }
    }, [showToast, refreshDNS]);

    const handleApplySpecific = useCallback(async (primary: string, secondary: string, providerName: string) => {
        if (!window.electronAPI) return;

        setIsApplying(true);
        showToast(`Applying ${providerName} DNS...`, 'info');

        try {
            const result = await window.electronAPI.applyDNS(primary, secondary);
            if (result.success) {
                showToast(`✅ ${providerName} DNS applied successfully!`, 'success');
                await refreshDNS();
            } else {
                showToast(result.message, 'error');
            }
        } catch {
            showToast('Failed to apply DNS. Run as administrator.', 'error');
        } finally {
            setIsApplying(false);
        }
    }, [showToast, refreshDNS]);

    // Derived state
    const currentlyTesting = useMemo(
        () => providers.find((p) => p.status === 'testing'),
        [providers]
    );

    const completedCount = useMemo(
        () => providers.filter((p) => p.status === 'done' || p.status === 'error').length,
        [providers]
    );

    const hasScanResults = useMemo(
        () => providers.some((p) => p.status === 'done'),
        [providers]
    );

    return (
        <>
            <TitleBar />

            <div className="app-container">
                {/* Header */}
                <div className="app-header">
                    <h1>MaJa's DNS Changer</h1>
                    <p>Advanced DNS Benchmarking & Optimization</p>
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
                        <>
                            {/* Summary Cards */}
                            <DashboardCards
                                currentDNS={systemDNS.dns}
                                adapter={systemDNS.adapter}
                                isDHCP={systemDNS.isDHCP}
                                bestDNS={bestDNS}
                                isLoading={dnsLoading}
                            />

                            {/* Scan Visualizer (progress ring) */}
                            <AnimatePresence>
                                {(isScanning || (progress > 0 && progress < 100)) && (
                                    <ScanVisualizer
                                        isScanning={isScanning}
                                        progress={progress}
                                        currentProvider={currentlyTesting?.providerName || ''}
                                        completedCount={completedCount}
                                        totalCount={providers.length}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Latency Bar Chart */}
                            {hasScanResults && (
                                <LatencyBarChart
                                    providers={providers}
                                    bestProvider={bestDNS?.providerName || null}
                                    isScanning={isScanning}
                                />
                            )}

                            {/* Charts Grid: History Graph */}
                            {hasScanResults && !isScanning && (
                                <LatencyHistoryGraph
                                    providers={providers}
                                    bestProvider={bestDNS?.providerName || null}
                                />
                            )}

                            {/* Server List */}
                            {(hasScanResults || isScanning) && (
                                <ServerList
                                    providers={providers}
                                    bestProvider={bestDNS?.providerName || null}
                                    onApplyDNS={handleApplySpecific}
                                />
                            )}

                            {/* Empty State */}
                            {!isScanning && !hasScanResults && (
                                <div className="empty-state">
                                    <div className="empty-state-icon">🌐</div>
                                    <div className="empty-state-text">
                                        Click "Scan & Benchmark DNS" to evaluate all DNS providers using ICMP, DNS query, and HTTPS methods.
                                    </div>
                                </div>
                            )}
                        </>
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
