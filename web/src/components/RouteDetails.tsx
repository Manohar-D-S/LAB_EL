import React, { useState } from 'react';
import { Route } from '../types/route';
import { 
  Clock, 
  Navigation, 
  MapPin, 
  MoreHorizontal, 
  Play, 
  Pause, 
  RotateCcw
} from 'lucide-react';

interface RouteDetailsProps {
  route: {
    distance?: number; // Ensure distance is optional to handle missing data
    duration?: number;
    startPoint?: { lat: number; lng: number };
    endPoint?: { lat: number; lng: number };
    waypoints?: { timestamp?: string }[]; // Add waypoints as an optional property
    status?: string; // Add status as an optional property
    name?: string; // Add name as an optional property
  };
}

const RouteDetails: React.FC<RouteDetailsProps> = ({ route }) => {
  const [playback, setPlayback] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  const formatDistance = (distance: number) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${distance.toFixed(2)} m`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-500';
      case 'in-progress': return 'text-indigo-500';
      case 'completed': return 'text-emerald-500';
      case 'cancelled': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };

  if (!route) {
    return <div>No route selected.</div>;
  }

  return (
    <div className={`bg-white shadow-sm transition-all duration-300 border-t border-slate-200 ${
      expanded ? 'h-80' : 'h-24'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-slate-800">{route.name}</h2>
            <span className={`ml-2 ${getStatusColor(route.status || 'unknown')}`}>
              ({route.status})
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setPlayback(!playback)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-600"
              title={playback ? "Pause playback" : "Start playback"}
            >
              {playback ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button 
              title="Reset route" 
              className="p-1 rounded-full hover:bg-slate-100 text-slate-600"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-600"
              title={expanded ? "Collapse details" : "Expand details"}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between text-sm mt-2">
          <div className="flex items-center text-slate-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>{route.duration !== undefined ? formatDuration(route.duration) : 'N/A'}</span>
          </div>
          <div className="flex items-center text-slate-600">
            <Navigation className="h-4 w-4 mr-1" />
            <span>{route.distance !== undefined ? formatDistance(route.distance) : 'N/A'}</span>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Route Details</h3>
              <div className="flex">
                <div className="w-1 bg-slate-200 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                </div>
                <div className="flex-1 ml-3">
                  <div className="mb-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                      <span className="text-sm font-medium text-slate-700">Start Point</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-5">
                      Lat: {route.startPoint?.lat?.toFixed(4) ?? 'N/A'}, Lng: {route.startPoint?.lng?.toFixed(4) ?? 'N/A'}
                    </p>
                  </div>
                  
                    {route.waypoints && route.waypoints.map((point: { timestamp?: string }, index: number) => (
                    <div className="mb-3" key={index}>
                      <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></div>
                      <span className="text-sm text-slate-600">Waypoint {index + 1}</span>
                      </div>
                      <p className="text-xs text-slate-500 ml-4">
                      {point.timestamp ? formatTime(point.timestamp) : 'No timestamp available'}
                      </p>
                    </div>
                    ))}
                  
                  <div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div>
                      <span className="text-sm font-medium text-slate-700">End Point</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-5">
                      {route.endPoint ? (
                        <>
                          Lat: {route.endPoint.lat.toFixed(4)}, Lng: {route.endPoint.lng.toFixed(4)}
                        </>
                      ) : (
                        'End Point not available'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteDetails;