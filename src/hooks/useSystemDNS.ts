// src/hooks/useSystemDNS.ts
import { useState, useCallback, useEffect } from 'react';

interface SystemDNSInfo {
    adapter: string;
    dns: string[];
    isDHCP: boolean;
}

export function useSystemDNS() {
    const [systemDNS, setSystemDNS] = useState<SystemDNSInfo>({
        adapter: 'Detecting...',
        dns: ['Detecting...'],
        isDHCP: false,
    });
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!window.electronAPI) return;
        setIsLoading(true);
        try {
            const info = await window.electronAPI.getSystemDNS();
            setSystemDNS(info);
        } catch {
            setSystemDNS({
                adapter: 'Error',
                dns: ['Could not detect'],
                isDHCP: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { systemDNS, isLoading, refresh };
}
