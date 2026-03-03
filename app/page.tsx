"use client";

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Box,
  AlertTriangle,
  Package,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../store/hooks';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';

// --- TYPE DEFINITIONS ---
interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_valuation: number;
}

interface StockMovementData {
  date: string;
  inbound: number;
  outbound: number;
}

interface FinanceStats {
  total_income: number;
  total_expense: number;
  total_valuation: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Preloader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <h1 className="text-2xl font-black tracking-tight text-slate-900">PRABS</h1>
        <p className="text-xs font-bold text-teal-600 tracking-widest uppercase mt-1">Inventory System</p>
        <div className="mt-8 h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-teal-500"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);
  const [stockMovement, setStockMovement] = useState<StockMovementData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const privileges = useAppSelector((state) => state.auth.privileges);
  const hasPrivilege = (permission: string) => privileges.includes(permission);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) setDashboardStats(await res.json());

      const finRes = await fetch(`${API_URL}/finance/stats?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (finRes.ok) setFinanceStats(await finRes.json());

      const moveRes = await fetch(`${API_URL}/dashboard/stock-movement?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (moveRes.ok) {
        const mData = await moveRes.json();
        setStockMovement(mData.data || []);
      }
    } catch (err) {
      console.error("Fetch stats error", err);
    }
  };

  useEffect(() => {
    if (accessToken && hasPrivilege('dashboard:view')) {
      fetchStats();
    }
  }, [accessToken, privileges, selectedPeriod]);

  if (showPreloader) return <Preloader onComplete={() => setShowPreloader(false)} />;

  return (
    <AppLayout pageTitle="Dashboard Overview">
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Products"
            value={dashboardStats?.total_products || 0}
            icon={Package}
            trend="+12%"
            trendUp={true}
            delay={0.1}
            color="cyan"
          />
          <StatCard
            title="Low Stock Items"
            value={dashboardStats?.low_stock_count || 0}
            icon={AlertTriangle}
            trend="-2"
            trendUp={false}
            delay={0.2}
            color="peach"
          />
          <StatCard
            title="Total Valuation"
            value={`Rp ${(dashboardStats?.total_valuation || 0).toLocaleString('id-ID')}`}
            icon={TrendingUp}
            trend="+5.4%"
            trendUp={true}
            delay={0.3}
            color="mint"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-slate-50 p-6 rounded-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Box size={18} className="text-slate-500" />
                Stock Movement
              </h3>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="bg-white text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#90e0ef]/40 border border-slate-200"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 3 Months</option>
              </select>
            </div>

            <div className="h-64 flex items-end gap-1 md:gap-2">
              {stockMovement.length > 0 ? (
                stockMovement.map((day, i) => {
                  const max = Math.max(...stockMovement.map(d => Math.max(d.inbound, d.outbound, 1)));
                  const inH = (day.inbound / max) * 100;
                  const outH = (day.outbound / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex gap-0.5 items-end h-full group relative">
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        In: {day.inbound} | Out: {day.outbound}
                      </div>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${inH}%` }} className="flex-1 bg-[#90e0ef] rounded-t-sm" />
                      <motion.div initial={{ height: 0 }} animate={{ height: `${outH}%` }} className="flex-1 bg-rose-300 rounded-t-sm" />
                    </div>
                  );
                })
              ) : (
                <div className="w-full flex items-center justify-center text-slate-400 text-sm italic">No data available</div>
              )}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {stockMovement.length > 0 && (
                <>
                  <span>{new Date(stockMovement[0].date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <span>{new Date(stockMovement[stockMovement.length - 1].date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Finance Summary Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-50 p-6 rounded-2xl"
          >
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <DollarSign size={18} className="text-slate-500" />
              Finance Summary
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Income</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-800">Rp {(financeStats?.total_income || 0).toLocaleString('id-ID')}</span>
                  <TrendingUp size={16} className="text-emerald-500" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expense</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-800">Rp {(financeStats?.total_expense || 0).toLocaleString('id-ID')}</span>
                  <TrendingDown size={16} className="text-rose-400" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#e0f7fa]">
                <p className="text-[10px] font-bold text-[#00838f] uppercase tracking-widest mb-1">Net Valuation</p>
                <p className="text-xl font-black text-slate-800">Rp {(financeStats?.total_valuation || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-6 text-center italic">Calculated based on selected period</p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}