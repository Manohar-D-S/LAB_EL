import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SidebarProps {
  onRouteSelect: (start: [number, number], end: [number, number]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onRouteSelect }) => {
  const [sourceLocation, setSourceLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Predefined locations (can be expanded)
  const locations: Record<string, [number, number]> = {
    'Hostuge Gate': [12.971599, 77.562665],
    'Main Gate': [12.987469, 77.571349],
    'Mini Circle': [12.985531, 77.572915],
    'Library': [12.975559, 77.568195],
    'Visvesvaraya Museum': [12.975359, 77.596478]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Get coordinates from location names
    const sourceCoords = locations[sourceLocation];
    const destCoords = locations[destinationLocation];
    
    if (sourceCoords && destCoords) {
      onRouteSelect(sourceCoords, destCoords);
      setTimeout(() => setIsLoading(false), 1000); // Simulate loading
    } else {
      alert('Please select valid locations');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border-r border-slate-200 w-80 h-full overflow-y-auto p-4 flex flex-col">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Route Planning</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-1">
            Source Location
          </label>
          <select
            id="source"
            value={sourceLocation}
            onChange={(e) => setSourceLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Select source location</option>
            {Object.keys(locations).map(loc => (
              <option key={`source-${loc}`} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-slate-700 mb-1">
            Destination
          </label>
          <select
            id="destination"
            value={destinationLocation}
            onChange={(e) => setDestinationLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Select destination</option>
            {Object.keys(locations).map(loc => (
              <option key={`dest-${loc}`} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        
        <button
          type="submit"
          className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating Route...
            </span>
          ) : (
            <span className="flex items-center">
              <Search className="mr-2 h-4 w-4" />
              Find Route
            </span>
          )}
        </button>
      </form>
    </div>
  );
};

export default Sidebar;
        