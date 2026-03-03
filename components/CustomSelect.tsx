"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SelectOption {
    value: string | number;
    label: string | React.ReactNode;
}

interface CustomSelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    error?: boolean;
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    icon,
    disabled = false,
    error = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            {icon && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-400">
                    {icon}
                </div>
            )}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between py-3 pr-4 bg-slate-50 border rounded-xl text-left transition-all",
                    icon ? "pl-12" : "pl-4",
                    error ? "border-rose-500 focus:ring-rose-200" : "border-slate-200 focus:border-slate-400",
                    "focus:ring-2 focus:ring-slate-300 outline-none group",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-100",
                    className
                )}
            >
                <span className={cn("block truncate", !selectedOption && "text-slate-400")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={18}
                    className={cn(
                        "text-slate-400 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto"
                    >
                        {options.map((option, idx) => {
                            const isSelected = String(option.value) === String(value);
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                                        isSelected
                                            ? "bg-[#CAF0F8]/50 text-slate-800 font-semibold"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="block truncate">{option.label}</span>
                                    {isSelected && <Check size={16} className="text-[#90e0ef] font-bold" />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
