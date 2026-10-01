// Sidebar.tsx — Linear/Raycast-inspired dark collapsible navigation sidebar
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Plus, Bell, Activity, BarChart2,
  Database, Settings, ChevronLeft, ChevronRight, Shield,
  Layers, Package, Zap, Cpu
} from 'lucide-react';
import { useAlerts } from '../hooks/useMonitoring';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  lastRunTime?: string;
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  lastRunTime,
}: SidebarProps) {
  const location = useLocation();
  const { data: alerts } = useAlerts(5000);
  const unreadAlerts = alerts?.filter((a) => !a.is_read && !a.is_dismissed).length || 0;

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/monitors', label: 'Monitors', icon: Layers },
        { to: '/products', label: 'Products', icon: Package },
        { to: '/history', label: 'Price History', icon: BarChart2 },
        { to: '/alerts', label: 'Alerts', icon: Bell, badge: unreadAlerts },
      ],
    },
    {
      title: 'AGENT',
      items: [
        { to: '/activity', label: 'Agent Activity', icon: Activity },
        { to: '/activity?tab=reasoning', label: 'Reasoning Logs', icon: Cpu },
        { to: '/sources', label: 'Sources & APIs', icon: Database },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { to: '/alerts?tab=notifications', label: 'Notifications', icon: Bell },
        { to: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#08090D] border-r border-white/8 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-[250px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 h-16">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 font-black text-sm">
            ◈
          </div>
          {!isCollapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-tight text-sm">PriceGuard</span>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-1 py-0.2 rounded">
                  AI
                </span>
              </div>
              <span className="text-[9px] font-semibold text-slate-500 tracking-widest block uppercase">
                AUTONOMOUS AGENT
              </span>
            </div>
          )}
        </NavLink>
        <button
          onClick={onToggleCollapse}
          className="text-slate-500 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                {group.title}
              </h4>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              // Handle active path matching
              const isActive = item.to.includes('?')
                ? location.pathname + location.search === item.to
                : location.pathname === item.to;

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-purple-600/15 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/4 border border-transparent'
                  }`}
                >
                  <Icon
                    size={16}
                    className={`flex-shrink-0 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-slate-500'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {/* Subtle active glowing bar */}
                  {isActive && !isCollapsed && (
                    <div className="absolute right-1.5 w-1 h-3.5 rounded-full bg-purple-400 shadow-[0_0_8px_#A855F7]" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Agent Status Card */}
      <div className="p-3 border-t border-white/8 bg-[#0B0D12]">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <span className="text-xs font-bold text-emerald-400 tracking-wide">
                  ONLINE
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">v2.4</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {lastRunTime ? `Last check ${lastRunTime}` : 'Scanning autonomously'}
            </p>
          </div>
        ) : (
          <div className="flex justify-center py-2" title="Agent Online">
            <span className="live-dot" />
          </div>
        )}
      </div>
    </aside>
  );
}
