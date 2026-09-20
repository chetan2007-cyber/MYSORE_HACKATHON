import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import SlaBadge from './SlaBadge';

// Fix leaflet default marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Custom SVG Pin for Leaflet based on Priority
const createCustomPin = (priority, isBreached) => {
  const colors = {
    P1: '#dc2626',
    P2: '#d97706',
    P3: '#2563eb',
    P4: '#64748b'
  };

  const color = colors[priority] || '#2563eb';
  const pulseClass = isBreached ? 'animate-bounce' : '';

  const svgHtml = `
    <div class="relative ${pulseClass}" style="transform: translate(-50%, -100%);">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="14" cy="14" r="6" fill="#ffffff"/>
      </svg>
      <div style="position:absolute; top:7px; left:0; width:28px; text-align:center; font-size:9px; font-weight:800; color:${color}; font-family:sans-serif;">
        ${priority}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-civic-pin',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36]
  });
};

const InteractiveMap = ({ issues = [], height = '450px', center = [12.3051, 76.6551], zoom = 13 }) => {
  const validIssues = issues.filter(
    (issue) =>
      issue.location &&
      issue.location.coordinates &&
      typeof issue.location.coordinates.lat === 'number' &&
      typeof issue.location.coordinates.lng === 'number'
  );

  return (
    <div className="w-full rounded-lg overflow-hidden border border-slate-200 shadow-2xs relative z-0" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validIssues.map((issue) => {
          const lat = issue.location.coordinates.lat;
          const lng = issue.location.coordinates.lng;
          const isBreached = issue.slaEvaluation?.status === 'BREACHED';
          const pin = createCustomPin(issue.priority || 'P3', isBreached);

          return (
            <Marker key={issue._id} position={[lat, lng]} icon={pin}>
              <Popup className="civic-map-popup">
                <div className="p-1 max-w-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-brand-600">
                      {issue.caseId}
                    </span>
                    <PriorityBadge priority={issue.priority} />
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-2">
                    {issue.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 truncate">
                    {issue.location.address}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <StatusBadge status={issue.status} />
                    {issue.slaEvaluation && (
                      <SlaBadge slaEvaluation={issue.slaEvaluation} />
                    )}
                  </div>

                  <div className="pt-2">
                    <Link
                      to={`/issues/${issue._id}`}
                      className="block w-full py-1 text-center text-xs font-medium text-white bg-slate-900 hover:bg-brand-600 rounded transition"
                    >
                      Open Case Details →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
