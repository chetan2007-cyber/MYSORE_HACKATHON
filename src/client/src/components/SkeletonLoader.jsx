import React from 'react';

export const SkeletonTable = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="h-10 bg-slate-100 rounded-t-lg border-b border-slate-200 mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5 px-4 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-slate-200 rounded ${j === 0 ? 'w-24' : j === 1 ? 'w-48' : 'w-20'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonCard = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 rounded-lg border border-slate-200 p-4">
          <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
          <div className="h-7 w-16 bg-slate-300 rounded" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonTimeline = ({ count = 4 }) => {
  return (
    <div className="space-y-4 animate-pulse p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-3 h-3 rounded-full bg-slate-300 mt-1" />
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
};
