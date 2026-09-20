import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  AlertOctagon,
  Building2,
  BarChart3,
  ShieldAlert,
  MapPin,
  PlusCircle,
  LogOut,
  User,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isCitizen, isWorker, isOfficer, isSupervisor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // Role-based Nav links strictly matching specification
  const getNavLinks = () => {
    if (isCitizen) {
      return [
        { to: '/my-reports', label: 'My Reports', icon: FileText },
        { to: '/report', label: 'Report Issue', icon: PlusCircle },
        { to: '/map', label: 'City Map', icon: MapPin }
      ];
    }

    if (isWorker) {
      return [
        { to: '/worker', label: 'My Work', icon: Briefcase },
        { to: '/issues', label: 'All Issues', icon: FileText },
        { to: '/map', label: 'Work Map', icon: MapPin }
      ];
    }

    if (isOfficer) {
      return [
        { to: '/officer', label: 'Operations Dashboard', icon: LayoutDashboard },
        { to: '/issues', label: 'Case Registry', icon: FileText },
        { to: '/escalations', label: 'Escalations Hub', icon: AlertOctagon },
        { to: '/map', label: 'City Map', icon: MapPin },
        { to: '/analytics', label: 'SLA Analytics', icon: BarChart3 }
      ];
    }

    if (isSupervisor) {
      return [
        { to: '/supervisor', label: 'Supervisory Hub', icon: LayoutDashboard },
        { to: '/departments', label: 'Department Overview', icon: Building2 },
        { to: '/issues', label: 'Case Registry', icon: FileText },
        { to: '/escalations', label: 'Escalations Queue', icon: AlertOctagon },
        { to: '/analytics', label: 'SLA Analytics', icon: BarChart3 },
        { to: '/audit-log', label: 'System Audit Log', icon: ShieldAlert }
      ];
    }

    // Admin
    return [
      { to: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
      { to: '/admin/staff', label: 'Staff Management', icon: UserPlus },
      { to: '/departments', label: 'Departments & SLAs', icon: Building2 },
      { to: '/issues', label: 'Global Case Registry', icon: FileText },
      { to: '/escalations', label: 'Escalations Hub', icon: AlertOctagon },
      { to: '/analytics', label: 'SLA Analytics', icon: BarChart3 },
      { to: '/audit-log', label: 'System Audit Log', icon: ShieldAlert }
    ];
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-xs font-bold text-sm tracking-tight">
              CT
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                CivicTrack
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-tight">
                From reported to resolved.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isCitizen ? 'Citizen Portal' : isWorker ? 'Field Workspace' : 'Operations & Triage'}
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border-l-2 border-sky-400 pl-2.5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile & Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-md bg-slate-900 border border-slate-800/80">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 text-xs font-semibold shrink-0">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || 'User'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-sky-400 font-medium">
                  {user?.role?.replace('_', ' ')}
                </span>
                {user?.department?.code && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    • {user.department.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
