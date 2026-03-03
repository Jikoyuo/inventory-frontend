"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend: string;
    trendUp: boolean;
    delay: number;
    color?: 'cyan' | 'mint' | 'peach' | 'lavender';
}

const colorMap = {
    cyan: {
        bg: 'bg-[#e0f7fa]',
        iconBg: 'bg-[#b2ebf2]',
        iconText: 'text-[#00838f]',
    },
    mint: {
        bg: 'bg-[#e8f5e9]',
        iconBg: 'bg-[#c8e6c9]',
        iconText: 'text-[#2e7d32]',
    },
    peach: {
        bg: 'bg-[#fff3e0]',
        iconBg: 'bg-[#ffe0b2]',
        iconText: 'text-[#e65100]',
    },
    lavender: {
        bg: 'bg-[#f3e5f5]',
        iconBg: 'bg-[#e1bee7]',
        iconText: 'text-[#7b1fa2]',
    },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, delay, color = 'cyan' }) => {
    const colors = colorMap[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            whileHover={{ y: -4, boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.1)" }}
            className={`relative p-6 ${colors.bg} rounded-2xl overflow-hidden group`}
        >
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${colors.iconBg} ${colors.iconText}`}>
                    <Icon size={22} strokeWidth={2} />
                </div>
            </div>

            <div className="mt-4 flex items-center text-sm">
                <span className={`font-medium flex items-center ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {trendUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1 rotate-180" />}
                    {trend}
                </span>
                <span className="text-slate-400 ml-2 text-xs">vs last month</span>
            </div>
        </motion.div>
    );
};

export default StatCard;
