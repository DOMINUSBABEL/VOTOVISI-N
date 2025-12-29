import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { LocationData } from '../types';

interface VoteMapProps {
  data: LocationData[];
}

const VoteMap: React.FC<VoteMapProps> = ({ data }) => {
  const centerPosition: [number, number] = [6.2442, -75.5812]; // Medellín center

  // Adjusted Radius for Polling Places (smaller counts than communes)
  const getRadius = (votes: number) => {
    if (votes > 300) return 12;
    if (votes > 150) return 10;
    if (votes > 80) return 8;
    if (votes > 40) return 6;
    return 4;
  };

  // Adjusted Color Intensity for Polling Places
  const getColor = (votes: number) => {
    if (votes > 300) return '#7f0000'; // High density
    if (votes > 150) return '#b30000';
    if (votes > 80) return '#d7301f';
    if (votes > 40) return '#fc8d59';
    return '#fdcc8a'; // Low density
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-xl border border-gray-200">
      <MapContainer 
        // Cast props to any to avoid TypeScript errors with missing type definitions for center/zoom
        {...({ center: centerPosition, zoom: 12 } as any)} 
        style={{ height: '100%', width: '100%', background: '#e5e7eb' }}
      >
        <TileLayer
          // Cast props to any to avoid TypeScript errors for attribution
          {...({ attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } as any)}
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {data.map((loc, idx) => (
          <CircleMarker
            key={idx}
            center={[loc.lat, loc.lng]}
            pathOptions={{
              color: getColor(loc.totalVotes),
              fillColor: getColor(loc.totalVotes),
              fillOpacity: 0.7, // Slightly higher opacity for points
              weight: 1
            }}
            // Cast radius to any to avoid TypeScript errors
            {...({ radius: getRadius(loc.totalVotes) } as any)}
          >
            <Tooltip 
              // Cast direction and offset to any to avoid TypeScript errors
              {...({ direction: "top", offset: [0, -5] } as any)}
              opacity={1}
            >
              <div className="text-center font-semibold text-xs">
                {loc.name}
              </div>
            </Tooltip>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="mb-2 border-b pb-1">
                   <p className="text-xs text-slate-500 uppercase tracking-wide">{loc.parentLocation}</p>
                   <h3 className="font-bold text-sm">{loc.name}</h3>
                </div>
                <p className="text-xs font-semibold mb-2 bg-slate-100 p-1 rounded inline-block">
                  Votos en Puesto: {loc.totalVotes}
                </p>
                <div className="space-y-1 mt-1">
                  {Object.entries(loc.candidates)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 3)
                    .map(([name, count]) => (
                      <div key={name} className="flex justify-between text-xs items-center">
                        <span className="truncate max-w-[130px] text-slate-700" title={name}>{name}</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-50 px-1 rounded">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default VoteMap;