import React from 'react';
import { PRIORITY_CONFIG } from '../constants';

const PriorityBadge = ({ priority, showFull = false, className = '' }) => {
  const config = PRIORITY_CONFIG[priority] || {
    label: priority || 'P3',
    badge: priority || 'P3',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
      title={config.description}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showFull ? config.label : config.badge}
    </span>
  );
};

export default PriorityBadge;
