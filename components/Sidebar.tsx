"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    History,
    Users,
    CalendarDays,
    Box,
    ChevronRight,
    LogOut,
} from 'lucide-react';

interface SidebarUser {
    name: string;
    role?: string;
}

interface SidebarProps {
    user: SidebarUser | null;
    privileges: string[];
    isMobileMenuOpen: boolean;
    onCloseMobileMenu: () => void;
}

const navItems = [
    { id: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard:view' },
    { id: '/inventory', icon: Package, label: 'Inventory', permission: 'product:view' },
    { id: '/transactions', icon: History, label: 'Transactions', permission: 'transaction:view' },
    { id: '/users', icon: Users, label: 'User Management', permission: 'user:view' },
    { id: '/shifts', icon: CalendarDays, label: 'Shift Schedule', permission: 'shift:view' },
];

const Sidebar: React.FC<SidebarProps> = ({ user, privileges, isMobileMenuOpen, onCloseMobileMenu }) => {
    const pathname = usePathname();
    const router = useRouter();

    const hasPrivilege = (permission: string) => privileges.includes(permission);

    const handleLogout = async () => {
        try {
            localStorage.removeItem('accessToken');
            const { logout } = await import('../store/slices/authSlice');
            const { store } = await import('../store');
            store.dispatch(logout());
            window.location.href = '/login';
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = '/login';
        }
    };

    const isActive = (id: string) => {
        return pathname === id;
    };

    const handleNav = (id: string) => {
        onCloseMobileMenu();
        router.push(id);
    };

    return (
        <>
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onCloseMobileMenu}
                />
            )}

            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#CAF0F8] flex flex-col transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-10">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 leading-none">PRABS</h1>
                            <span className="text-xs font-semibold text-slate-600 tracking-widest uppercase">Inventory</span>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        {navItems
                            .filter(item => item.permission === null || hasPrivilege(item.permission))
                            .map((item) => {
                                const active = isActive(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNav(item.id)}
                                        className={`
                                            w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group
                                            ${active
                                                ? 'bg-white text-slate-800 shadow-md shadow-black/5'
                                                : 'text-slate-700 hover:bg-white/50'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={20} className={active ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-700'} />
                                            {item.label}
                                        </div>
                                        {active && <ChevronRight size={16} className="text-slate-400" />}
                                    </button>
                                );
                            })}
                    </nav>
                </div>

                <div className="mt-auto p-6 m-4 bg-white/40 backdrop-blur-sm rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-700 font-bold shadow-sm">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-600">{user?.role || 'Role'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/60 hover:bg-white text-slate-600 hover:text-rose-600 rounded-xl text-sm font-semibold transition-all"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
