// src/hooks/useToast.ts
import { useState, useCallback, useRef } from 'react';

export interface Toast {
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
}

export function useToast() {
    const [toast, setToast] = useState<Toast>({
        message: '',
        type: 'info',
        visible: false,
    });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setToast({ message, type, visible: true });

        timeoutRef.current = setTimeout(() => {
            setToast((prev) => ({ ...prev, visible: false }));
        }, 4000);
    }, []);

    return { toast, showToast };
}
