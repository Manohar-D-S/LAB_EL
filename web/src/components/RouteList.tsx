import React, { useState } from 'react';
import { Clock, Navigation, CheckCircle, AlertCircle, TimerOff } from 'lucide-react';

interface Location {
  id: string;
  name: string;
}

interface RouteListProps {
  locations: Location[];
  onSearch: (source: string, destination: string) => void;
  isSearching: boolean; // New prop for loading state
}

const RouteList: React.FC<RouteListProps> = ({ locations, onSearch, isSearching }) => {
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');

  const handleSearch = () => {
    if (source && destination) {
      onSearch(source, destination);
    } else {
      alert('Please select both source and destination.');
    }
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
    </div>
  );
};

export default RouteList;