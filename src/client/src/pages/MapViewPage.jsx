import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Filter } from 'lucide-react';
import { issueService } from '../services/api';
import InteractiveMap from '../components/InteractiveMap';
import { SkeletonCard } from '../components/SkeletonLoader';

const MapViewPage = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchIssuesForMap = async () => {
    try {
      setLoading(true);
      const res = await issueService.getIssues({ limit: 100 });
      setIssues(res.data.data || []);
    } catch (err) {
      console.error('Failed to load issues for map:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuesForMap();
  }, []);

  const filteredIssues = selectedCategory
    ? issues.filter((i) => i.category === selectedCategory)
    : issues;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              City Geographic Issue Map
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time geospatial distribution of active civic issues across Mysuru municipal wards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Quick Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs rounded-md border border-slate-200 px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs"
          >
            <option value="">All Categories ({issues.length})</option>
            <option value="Sanitation & Waste">Sanitation &amp; Waste</option>
            <option value="Roads & Infrastructure">Roads &amp; Infrastructure</option>
            <option value="Drainage & Sewage">Drainage &amp; Sewage</option>
            <option value="Streetlights & Electrical">Streetlights &amp; Electrical</option>
          </select>

          <button
            onClick={fetchIssuesForMap}
            disabled={loading}
            className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Refresh Map Points"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      {loading ? (
        <div className="h-[600px] bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-xs text-slate-400">
          Loading geographic markers from MongoDB...
        </div>
      ) : (
        <InteractiveMap issues={filteredIssues} height="650px" />
      )}
    </div>
  );
};

export default MapViewPage;
