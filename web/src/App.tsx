import React, { useState, useEffect } from 'react';
import { Navigation } from 'lucide-react';
import Header from './components/Header';
import Map from './components/Map';
import RouteList from './components/RouteList';
import RouteDetails from './components/RouteDetails';
import { getRoutes } from './services/api';
import { Route } from './types/route';

function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
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
                routes={routes} 
                selectedRouteId={selectedRoute?.id} 
                onRouteSelect={handleRouteSelect} 
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