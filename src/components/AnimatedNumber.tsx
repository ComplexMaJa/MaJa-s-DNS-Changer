// src/components/AnimatedNumber.tsx
import React, { useEffect, useRef, useState, memo } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    suffix?: string;
    className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = memo(({
    value,
    duration = 600,
    suffix = '',
    className = '',
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (endValue - startValue) * eased);

            setDisplayValue(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = endValue;
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [value, duration]);

    return (
        <span className={className}>
            {displayValue}{suffix}
        </span>
    );
});

AnimatedNumber.displayName = 'AnimatedNumber';
