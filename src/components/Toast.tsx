// src/components/Toast.tsx
import React from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
}

export const ToastNotification: React.FC<ToastProps> = ({ message, type, visible }) => {
    return (
        <div className={`toast ${type} ${visible ? 'visible' : ''}`} id="toast-notification">
            {message}
        </div>
    );
};
