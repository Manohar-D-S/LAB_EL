import React, { useState } from 'react';
import { Route } from '../types/route';
import { Clock, Navigation, CheckCircle, AlertCircle, TimerOff } from 'lucide-react';

interface Location {
  id: string;
  name: string;
}

interface RouteListProps {
  routes: Route[];
  selectedRouteId: string | undefined;
  onRouteSelect: (route: Route) => void;
  locations: Location[];
  onSearch: (source: string, destination: string) => void;
  isSearching: boolean; // New prop for loading state
}

const RouteList: React.FC<RouteListProps> = ({ routes, selectedRouteId, onRouteSelect, locations, onSearch, isSearching }) => {
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');

  const handleSearch = () => {
    if (source && destination) {
      onSearch(source, destination);
    } else {
      alert('Please select both source and destination.');
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: <Clock className="h-4 w-4 text-amber-500" />, text: 'Pending', color: 'bg-amber-50 text-amber-700' };
      case 'in-progress':
        return { icon: <Navigation className="h-4 w-4 text-indigo-500" />, text: 'In Progress', color: 'bg-indigo-50 text-indigo-700' };
      case 'completed':
        return { icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, text: 'Completed', color: 'bg-emerald-50 text-emerald-700' };
      case 'cancelled':
        return { icon: <TimerOff className="h-4 w-4 text-rose-500" />, text: 'Cancelled', color: 'bg-rose-50 text-rose-700' };
      default:
        return { icon: <AlertCircle className="h-4 w-4 text-slate-500" />, text: 'Unknown', color: 'bg-slate-50 text-slate-700' };
    }
  };

  const formatDistance = (distance: number) => {
    return `${distance.toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredLocationsForDestination = locations.filter(
    (location) => location.id !== source
  );

  const filteredLocationsForSource = locations.filter(
    (location) => location.id !== destination
  );

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Select Route</h2>
      <div className="mb-4">
        <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-1">
          Source
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-2"
        >
          <option value="">Select Source</option>
          {filteredLocationsForSource.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label htmlFor="destination" className="block text-sm font-medium text-slate-700 mb-1">
          Destination
        </label>
        <select
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-2"
        >
          <option value="">Select Destination</option>
          {filteredLocationsForDestination.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSearch}
        className={`w-full py-2 rounded-lg transition ${
          isSearching
            ? 'bg-indigo-400 text-white cursor-not-allowed animate-pulse'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        disabled={isSearching} // Disable button while searching
      >
        {isSearching ? 'Searching...' : 'Search'}
      </button>

      <ul className="space-y-2 mt-4">
        {routes.length === 0 ? (
          <li className="text-slate-500 text-center py-4">No routes available</li>
        ) : (
          routes.map(route => {
            const statusInfo = getStatusInfo(route.status);
            
            return (
              <li 
                key={route.id}
                onClick={() => onRouteSelect(route)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedRouteId === route.id 
                    ? 'bg-indigo-50 border border-indigo-200 shadow-sm' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-slate-900">{route.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full flex items-center ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.text}</span>
                  </span>
                </div>
                
                <div className="text-sm text-slate-600 mb-2">
                  <div className="flex items-center justify-between">
                    <span>Distance:</span>
                    <span className="font-medium">{formatDistance(route.distance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{formatDuration(route.duration)}</span>
                  </div>
                </div>
                
                <div className="text-xs text-slate-400">
                  Created: {new Date(route.createdAt).toLocaleString()}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default RouteList;