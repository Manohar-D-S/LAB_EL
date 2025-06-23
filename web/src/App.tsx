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
  const [routes, setRoutes] = useState<Route[]>([]);
  const [ambulancePosition, setAmbulancePosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        const data = await getRoutes();
        setRoutes(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching routes:', err);
        setError('Failed to load routes. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchRoutes();
  }, []);

  const locations = [
    { id: "LakshmiHospital", name: "Lakshmi Hospital", lat: 12.988345, lng: 77.508878 },
    { id: "Kamakshipalya", name: "Kamakshipalya", lat: 12.982516, lng: 77.529095 },
    { id: "SanjeeviniHospital", name: "Sanjeevini Hospital", lat: 12.982157, lng: 77.598217 },
    { id: "MythicSociety", name: "Mythic Society", lat: 12.972791, lng: 77.586308 },
    { id: "VetCollege", name: "Vet College", lat: 12.907877, lng: 77.592391 },
    { id: "JayadevaHospital", name: "Jayadeva Hospital", lat: 12.917924, lng: 77.599245 },
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

      if (
        payload.source_lat === undefined ||
        payload.source_lng === undefined ||
        payload.dest_lat === undefined ||
        payload.dest_lng === undefined
      ) {
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

      // Transform backend response to Route object expected by Map/RouteDetails
      if (routeData.route_coordinates && routeData.route_coordinates.length > 0) {
        const path = routeData.route_coordinates.map(
          ([lat, lng]: [number, number]) => ({ lat, lng })
        );
        const startPoint = path[0];
        const endPoint = path[path.length - 1];
        const route: Route = {
          id: 'dynamic',
          name: `${source} to ${destination}`,
          startPoint,
          endPoint,
          path,
          distance: routeData.distance_km,
          time_mins: routeData.time_mins,
          waypoints: [],
          status: 'in-progress',
          duration: Math.round((routeData.time_mins || 0) * 60),
          createdAt: new Date().toISOString(),
        };
        setSelectedRoute(route);
      } else {
        setSelectedRoute(null);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setSelectedRoute(null);
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

  const handleSliderChange = (position: { lat: number; lng: number }) => {
    setAmbulancePosition(position); // Update ambulance position
  };

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
          <Map selectedRoute={selectedRoute} ambulancePosition={ambulancePosition} />
          <RouteDetails route={selectedRoute || undefined} onSliderChange={handleSliderChange} />
        </main>
      </div>
    </div>
  );
}

export default App;