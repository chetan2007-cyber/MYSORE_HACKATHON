import React from 'react';
import {
  FileText,
  UserCheck,
  Wrench,
  Camera,
  CheckCircle,
  XCircle,
  AlertOctagon,
  RotateCcw,
  MessageSquare,
  Clock
} from 'lucide-react';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';
import { getMediaUrl } from '../config/env';
import StatusBadge from './StatusBadge';

const CaseTimeline = ({ timeline = [], attachments = [] }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No chronological events recorded yet.
      </div>
    );
  }

  const getEventIcon = (update) => {
    switch (update.updateType) {
      case 'STATUS_CHANGE':
        if (update.newStatus === 'REPORTED') return <FileText className="w-3.5 h-3.5 text-slate-600" />;
        if (update.newStatus === 'IN_PROGRESS') return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
        if (update.newStatus === 'CLOSED') return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
        return <Clock className="w-3.5 h-3.5 text-slate-600" />;
      case 'ASSIGNMENT':
        return <UserCheck className="w-3.5 h-3.5 text-sky-600" />;
      case 'EVIDENCE':
        return <Camera className="w-3.5 h-3.5 text-purple-600" />;
      case 'VERIFICATION':
        if (update.newStatus === 'RESOLVED') return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'REOPEN':
        return <RotateCcw className="w-3.5 h-3.5 text-rose-600" />;
      case 'ESCALATION':
        return <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getIconContainerColor = (update) => {
    switch (update.updateType) {
      case 'EVIDENCE':
        return 'bg-purple-100 border-purple-200';
      case 'VERIFICATION':
        return update.newStatus === 'RESOLVED'
          ? 'bg-emerald-100 border-emerald-200'
          : 'bg-rose-100 border-rose-200';
      case 'REOPEN':
        return 'bg-rose-100 border-rose-300';
      case 'ESCALATION':
        return 'bg-amber-100 border-amber-300';
      case 'ASSIGNMENT':
        return 'bg-sky-100 border-sky-200';
      default:
        return 'bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {timeline.map((item, index) => (
        <div key={item._id || index} className="relative group">
          {/* Node Icon */}
          <div
            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center bg-white shadow-xs z-10 ${getIconContainerColor(
              item
            )}`}
          >
            {getEventIcon(item)}
          </div>

          {/* Event Content Box */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  {item.createdBy?.name || 'System'}
                </span>
                {item.createdBy?.role && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {item.createdBy.role.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span title={formatDateTime(item.timestamp)}>
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              {item.message}
            </p>

            {/* Status Transition Pill if any */}
            {item.newStatus && item.previousStatus && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                <StatusBadge status={item.previousStatus} />
                <span className="text-slate-400">→</span>
                <StatusBadge status={item.newStatus} />
              </div>
            )}

            {/* Attachments if any */}
            {item.attachments && item.attachments.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {item.attachments.map((att, attIdx) => (
                  <a
                    key={attIdx}
                    href={getMediaUrl(att.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="group/att block w-20 h-16 rounded border border-slate-200 overflow-hidden bg-slate-100 hover:border-brand-400 transition"
                  >
                    <img
                      src={getMediaUrl(att.path)}
                      alt={att.filename}
                      className="w-full h-full object-cover group-hover/att:scale-105 transition"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CaseTimeline;
