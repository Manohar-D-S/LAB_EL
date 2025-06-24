import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface SidebarProps {
  onRouteSelect: (start: [number, number], end: [number, number]) => void;
  locations: Location[];
  selectedRoute?: any;
  calculatedDistance?: number;
  signalsOnRoute?: any[];
  greenSignalId?: string | null;
  isSimulationActive?: boolean;
  routeError?: string | null;
  ambulancePosition?: any;
}

const Sidebar: React.FC<SidebarProps> = ({
  onRouteSelect,
  locations,
  selectedRoute,
  calculatedDistance,
  signalsOnRoute = [],
  greenSignalId,
  isSimulationActive,
  routeError,
  ambulancePosition
}) => {
  const [sourceLocation, setSourceLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const sourceCoords = locations.find(loc => loc.id === sourceLocation);
    const destCoords = locations.find(loc => loc.id === destinationLocation);

    if (sourceCoords && destCoords) {
      onRouteSelect([sourceCoords.lat, sourceCoords.lng], [destCoords.lat, destCoords.lng]);
      setTimeout(() => setIsLoading(false), 1000);
    } else {
      alert('Please select valid locations');
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-6 z-10 max-w-sm w-full" style={{ width: 380 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-xl text-gray-800">Route Info</h3>
          <p className="text-sm text-gray-500">Active navigation</p>
        </div>
      </div>

      {/* Route Selection Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label htmlFor="source" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Source Location
          </label>
          <select
            id="source"
            value={sourceLocation}
            onChange={(e) => setSourceLocation(e.target.value)}
            className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            required
          >
            <option value="">Select source location</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="destination" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Destination
          </label>
          <select
            id="destination"
            value={destinationLocation}
            onChange={(e) => setDestinationLocation(e.target.value)}
            className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            required
          >
            <option value="">Select destination</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center items-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating Route...
            </span>
          ) : (
            <span className="flex items-center font-semibold">
              <Search className="mr-3 h-5 w-5" />
              Find Route
            </span>
          )}
        </button>
      </form>

      {/* Route Details */}
      {selectedRoute && (
        <>
          <div className="space-y-4">
            {selectedRoute.name && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Route Name</p>
                  <p className="font-semibold text-gray-800 truncate">{selectedRoute.name}</p>
                </div>
              </div>
            )}

            {calculatedDistance && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Distance</p>
                  <p className="font-bold text-xl text-gray-800">{calculatedDistance.toFixed(2)} <span className="text-sm font-normal">km</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-blue-800">Route Active</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <p className="text-lg font-bold text-blue-700">{signalsOnRoute.length}</p>
                <p className="text-xs text-blue-600 font-medium">Traffic Signals</p>
              </div>

              <div className="text-center p-2 bg-white/60 rounded-lg">
                <p className="text-lg font-bold text-blue-700">{greenSignalId ? '1' : '0'}</p>
                <p className="text-xs text-blue-600 font-medium">Signals Cleared</p>
              </div>
            </div>

            {greenSignalId && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-green-100 rounded-lg border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">🟢 Signal cleared ahead</span>
              </div>
            )}

            {isSimulationActive && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-red-100 rounded-lg border border-red-200">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-red-700">🚨 Emergency Response Active</span>
              </div>
            )}
          </div>

          {/* Error Section */}
          {routeError && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Route Error</p>
                  <p className="text-xs text-red-600 mt-1">{routeError}</p>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default Sidebar;