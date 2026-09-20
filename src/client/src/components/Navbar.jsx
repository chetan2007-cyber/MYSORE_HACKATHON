import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatTimeAgo } from '../utils/formatters';
import ConnectivityStatus from './ConnectivityStatus';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/issues?search=${encodeURIComponent(quickSearch.trim())}`);
      setQuickSearch('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 shadow-2xs">
      {/* Left: Mobile hamburger & search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Case ID (e.g. CT-2026-000101) or address..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-200 pl-8 pr-3 py-1.5 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white transition"
          />
        </form>
      </div>

      {/* Center/Right: Authenticated Identity & Alerts */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Connectivity & Offline Queue Status */}
        <ConnectivityStatus />

        {/* Read-Only Authenticated Identity Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Live Authenticated Session" />
          <div className="text-left leading-tight min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[180px]">
              {user?.name || 'User'}
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="font-semibold font-mono text-brand-700 uppercase tracking-tight truncate max-w-[65px] sm:max-w-none">
                {user?.role?.replace('_', ' ')}
              </span>
              {user?.department?.name && user?.role !== 'CITIZEN' && (
                <span className="text-slate-400 hidden md:inline truncate max-w-[140px]">
                  • {user.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 font-mono px-2 py-1 bg-slate-50 rounded border border-slate-200">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>20 Sep 2026</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-slate-800">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-700">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        if (!n.isRead) markRead(n._id);
                        setShowNotifications(false);
                        if (n.link) navigate(n.link);
                      }}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition flex gap-2.5 ${
                        !n.isRead ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'SLA_BREACH' && (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        )}
                        {n.type === 'RESOLUTION' && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        )}
                        {n.type === 'ASSIGNMENT' && (
                          <UserCheck className="w-4 h-4 text-sky-600" />
                        )}
                        {!['SLA_BREACH', 'RESOLUTION', 'ASSIGNMENT'].includes(n.type) && (
                          <Bell className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span className="truncate">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No recent notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
