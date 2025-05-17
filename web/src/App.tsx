import React, { useState, useEffect } from 'react';
import { Navigation } from 'lucide-react';
import Header from './components/Header';
import Map from './components/Map';
import RouteList from './components/RouteList';
import RouteDetails from './components/RouteDetails';
import { getRoutes } from './services/api';
import { Route } from './types/route';

type RouteListProps = {
  routes: Route[]; // Add the missing 'routes' property
  selectedRouteId: string | undefined;
  onRouteSelect: (route: Route | null) => void;
  locations: { id: string; name: string; lat: number; lng: number }[];
  onSearch: (source: string, destination: string) => Promise<void>;
  isSearching: boolean;
};

function App() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false); // New state for search button animation

  const locations = [
    { id: 'M G ROAD', name: 'M G ROAD', lat: 12.9746530, lng: 77.6064850 },
    { id: 'NIMHANS', name: 'NIMHANS', lat: 12.941593, lng: 77.59632 },
    { id: 'VIDHANA SOUDHA', name: 'VIDHANA SOUDHA', lat: 12.9791198, lng: 77.5912997 },
    { id: 'BTM LAYOUT', name: 'BTM LAYOUT', lat: 12.9165757, lng: 77.6101166 },
    { id: 'JAYADEVA HOSPITAL', name: 'JAYADEVA HOSPITAL', lat: 12.906071, lng: 77.610116 },
    { id: 'DEVIHALLI', name: 'DEVIHALLI', lat: 13.012345, lng: 77.678901 },
    { id: 'KAMAKSHIPALYA', name: 'KAMAKSHIPALYA', lat: 12.987654, lng: 77.543210 },
    { id: 'LAKSHMI HOSPITAL', name: 'LAKSHMI HOSPITAL', lat: 12.934567, lng: 77.654321 },
  ];

  const handleSearch = async (source: string, destination: string) => {
    setIsSearching(true); // Start the loading animation
    try {
      const payload = {
        source_lat: locations.find((loc) => loc.id === source)?.lat,
        source_lng: locations.find((loc) => loc.id === source)?.lng,
        dest_lat: locations.find((loc) => loc.id === destination)?.lat,
        dest_lng: locations.find((loc) => loc.id === destination)?.lng,
      };
      console.log('Payload:', payload);

      if (!payload.source_lat || !payload.source_lng || !payload.dest_lat || !payload.dest_lng) {
        console.error('Invalid source or destination');
        setIsSearching(false);
        return;
      }

      const response = await fetch(`http://localhost:8000/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch route');
      }

      const routeData = await response.json();
      console.log('Route Data:', routeData);

      // Pass the route data to the Map component to highlight the route
      setSelectedRoute(routeData);
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setIsSearching(false); // Stop the loading animation
    }
  };

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        const data = await getRoutes();
        setLoading(false);
      } catch (err) {
        console.error('Error fetching routes:', err);
        setError('Failed to load routes. Please try again later.');
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header />
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <aside className="w-full md:w-80 bg-white shadow-sm z-10 overflow-y-auto border-r border-slate-200">
          <div className="p-4">
            <div className="flex items-center mb-4">
              <Navigation className="h-5 w-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-slate-800">Ambulance Routes</h2>
            </div>
            
            {loading ? (
              <div className="py-4 text-center text-slate-500">Loading routes...</div>
            ) : error ? (
              <div className="py-4 text-center text-rose-500">{error}</div>
            ) : (
              <RouteList 
                locations={locations} 
                onSearch={handleSearch} 
                isSearching={isSearching} 
              />
            )}
          </div>
        </aside>
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <Map selectedRoute={selectedRoute} />
          
          {selectedRoute && (
            <RouteDetails route={selectedRoute} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;