import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SLA_STATUS_CONFIG } from '../constants';

const SlaBadge = ({ slaEvaluation, className = '' }) => {
  if (!slaEvaluation) {
    return <span className="text-xs text-slate-400 font-mono">—</span>;
  }

  const { status, timeLabel, isBreached } = slaEvaluation;
  const config = SLA_STATUS_CONFIG[status] || SLA_STATUS_CONFIG.ON_TRACK;

  const renderIcon = () => {
    switch (status) {
      case 'BREACHED':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />;
      case 'AT_RISK':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium font-mono ${config.bg} ${config.text} ${config.border} ${className}`}>
      {renderIcon()}
      <span>{timeLabel || config.label}</span>
    </div>
  );
};

export default SlaBadge;
