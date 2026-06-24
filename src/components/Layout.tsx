import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  History, 
  Users, 
  Truck, 
  Settings as SettingsIcon, 
  Database,
  Menu,
  X
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { settings, isOfflineMode } = useTransportStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Create Bill', href: '/create-bill', icon: FileText },
    { name: 'Bill History', href: '/bill-history', icon: History },
    { name: 'Party Master', href: '/party-master', icon: Users },
    { name: 'Truck Master', href: '/truck-master', icon: Truck },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
    { name: 'Backup & Export', href: '/backup-export', icon: Database },
  ];

  // Active state is now handled natively by NavLink

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col font-sans">
      {/* Offline/Local Mode Alert Banner */}
      {isOfflineMode && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1 px-4 text-center print:hidden flex items-center justify-center gap-2">
          <span>⚠️ Running in Local Offline Mode. Data is stored in your browser.</span>
          <Link to="/settings" className="underline hover:text-amber-100 font-bold">Configure Supabase Sync</Link>
        </div>
      )}

      {/* Main Header (Dense & Corporate) */}
      <header className="border-b border-[#E5E7EB] bg-white px-4 py-3 print:hidden select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Company Details */}
          <div className="flex items-start gap-3">
            <img 
              src={settings.logo_url || '/logo.png'} 
              alt="Logo" 
              className="w-16 h-16 object-contain rounded border border-[#E5E7EB] bg-slate-50 flex-shrink-0"
              onError={(e) => {
                // Fallback to text initials logo if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#111827] leading-tight">
                {settings.company_name}
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5 max-w-md">
                {settings.address}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 font-medium mt-1">
                <span>Email: {settings.email}</span>
                <span className="text-gray-400">|</span>
                <span>Phones: {[settings.phone_1, settings.phone_2, settings.phone_3].filter(Boolean).join(', ')}</span>
              </div>
            </div>
          </div>

          {/* GST & PAN Badges */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 md:items-end md:text-right text-xs text-gray-600">
            {settings.gstin && (
              <div className="bg-slate-100 px-2.5 py-1 rounded border border-[#E5E7EB]">
                <span className="font-semibold text-gray-500">GSTIN: </span>
                <span className="font-mono text-gray-800 font-bold">{settings.gstin}</span>
              </div>
            )}
            {settings.pan && (
              <div className="bg-slate-100 px-2.5 py-1 rounded border border-[#E5E7EB]">
                <span className="font-semibold text-gray-500">PAN: </span>
                <span className="font-mono text-gray-800 font-bold">{settings.pan}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Top Sticky Navigation Bar */}
      <nav className="border-b border-[#E5E7EB] bg-white sticky top-0 z-40 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-10">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 h-full">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) => `flex items-center gap-1.5 px-3 h-full border-b-2 text-xs font-semibold transition-colors ${
                    isActive 
                      ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/40' 
                      : 'border-transparent text-gray-600 hover:text-[#2563EB] hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>

          {/* Mobile Nav Toggle */}
          <div className="md:hidden flex items-center justify-between w-full h-full">
            <span className="text-xs font-bold text-gray-500">MENU</span>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="p-1 text-gray-600 hover:text-[#2563EB]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E7EB] bg-white px-2 py-3 space-y-1 shadow-md">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-[#2563EB]' 
                      : 'text-gray-600 hover:bg-slate-50 hover:text-[#2563EB]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-6">
        {children}
      </main>

      {/* Business Footer (Print Hidden) */}
      <footer className="border-t border-[#E5E7EB] bg-white py-3 text-center text-xs text-gray-400 print:hidden font-medium mt-auto">
        &copy; {new Date().getFullYear()} {settings.company_name}. All rights reserved. | Professional Transport Accounting Software
      </footer>
    </div>
  );
};
