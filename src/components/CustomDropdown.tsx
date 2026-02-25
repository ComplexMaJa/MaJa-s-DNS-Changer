// src/components/CustomDropdown.tsx
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';

interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
}

interface CustomDropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    id?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = memo(({
    options,
    value,
    onChange,
    id,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value) || options[0];

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('.dropdown-option');
            const item = items[highlightedIndex] as HTMLElement;
            if (item) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    // Reset highlighted index when opening
    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex((o) => o.value === value);
            setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, options, value]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                    onChange(options[highlightedIndex].value);
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
        }
    }, [isOpen, highlightedIndex, options, onChange]);

    const handleSelect = useCallback((optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    }, [onChange]);

    return (
        <div
            className="custom-dropdown"
            ref={containerRef}
            id={id}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
        >
            {/* Trigger */}
            <button
                className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                aria-label="Select provider"
            >
                <span className="dropdown-trigger-text">
                    {selectedOption?.icon && <span className="dropdown-trigger-icon">{selectedOption.icon}</span>}
                    {selectedOption?.label || 'Select...'}
                </span>
                <svg
                    className={`dropdown-chevron ${isOpen ? 'rotated' : ''}`}
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                >
                    <path d="M3.5 5.5L7 9L10.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="dropdown-menu" ref={listRef} role="listbox">
                    <div className="dropdown-menu-inner">
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            const isHighlighted = index === highlightedIndex;

                            return (
                                <div
                                    key={option.value}
                                    className={`dropdown-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                    onClick={() => handleSelect(option.value)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    {option.icon && <span className="dropdown-option-icon">{option.icon}</span>}
                                    <span className="dropdown-option-label">{option.label}</span>
                                    {isSelected && (
                                        <svg className="dropdown-check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

CustomDropdown.displayName = 'CustomDropdown';
