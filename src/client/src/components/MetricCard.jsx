import React from 'react';

const MetricCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick
}) => {
  const variantStyles = {
    default: 'border-slate-200 bg-white text-slate-800',
    primary: 'border-blue-200 bg-blue-50/30 text-blue-900',
    warning: 'border-amber-200 bg-amber-50/40 text-amber-900',
    danger: 'border-rose-200 bg-rose-50/40 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
  };

  const iconColors = {
    default: 'text-slate-500 bg-slate-100',
    primary: 'text-blue-600 bg-blue-100',
    warning: 'text-amber-600 bg-amber-100',
    danger: 'text-rose-600 bg-rose-100',
    success: 'text-emerald-600 bg-emerald-100'
  };

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-lg border transition-all ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded-md ${iconColors[variant]}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value !== undefined ? value : '—'}
        </span>
        {subtitle && (
          <span className="text-xs text-slate-500 truncate">{subtitle}</span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
