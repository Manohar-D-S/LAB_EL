import { useState, useEffect } from 'react';
import Header from './components/Header';
import Map from './components/Map';
import RouteDetails from './components/RouteDetails';
import Sidebar from './components/Sidebar';
import { getRoutes } from './services/api';
import { Route } from './types/route';

function App() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [ambulancePosition, setAmbulancePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [pickOnMapMode, setPickOnMapMode] = useState(false);
  const [algorithmComparisonResults, setAlgorithmComparisonResults] = useState<any[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

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

  const handleSearch = async (
    source: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number }
  ) => {
    setIsSearching(true);
    try {
      let payload: any = {};
      if (typeof source === 'string') {
        payload.source_lat = locations.find((loc) => loc.id === source)?.lat;
        payload.source_lng = locations.find((loc) => loc.id === source)?.lng;
      } else {
        payload.source_lat = source.lat;
        payload.source_lng = source.lng;
      }
      if (typeof destination === 'string') {
        payload.dest_lat = locations.find((loc) => loc.id === destination)?.lat;
        payload.dest_lng = locations.find((loc) => loc.id === destination)?.lng;
      } else {
        payload.dest_lat = destination.lat;
        payload.dest_lng = destination.lng;
      }
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

      const response = await fetch('http://localhost:8000/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const routeData = await response.json();

      if (routeData.results && routeData.results.length > 0) {
        setAlgorithmComparisonResults(routeData.results);
        
        const astarResult = routeData.results.find((r: any) => r.algorithm === "A*");
        if (astarResult && astarResult.route.length > 0) {
          const path = astarResult.route.map(([lat, lng]: [number, number]) => ({ lat, lng }));
          const startPoint = path[0];
          const endPoint = path[path.length - 1];
          const route: Route = {
            id: 'dynamic',
            name: `${source} to ${destination}`,
            startPoint,
            endPoint,
            path,
            distance: astarResult.distance,
            time_mins: astarResult.distance / 30 * 60,
            waypoints: [],
            status: 'in-progress',
            duration: Math.round((astarResult.distance / 30 * 60) * 60),
            createdAt: new Date().toISOString(),
          };
          setSelectedRoute(route);
        } else {
          setSelectedRoute(null);
        }
      } else {
        setSelectedRoute(null);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setSelectedRoute(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSliderChange = (position: { lat: number; lng: number }) => {
    setAmbulancePosition(position);
  };

  const handleSimulationStart = () => setIsSimulationActive(true);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header />
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <Map
            selectedRoute={selectedRoute}
            ambulancePosition={ambulancePosition}
            isSimulationActive={isSimulationActive}
            onStartSimulation={handleSimulationStart}
            locations={locations}
            onRouteSelect={handleSearch}
            onResetRoute={() => setSelectedRoute(null)}
            isLoading={isSearching}
            pickOnMapMode={pickOnMapMode}
            onPickOnMapEnd={() => setPickOnMapMode(false)}
            onPickOnMapStart={() => setPickOnMapMode(true)}
            algorithmComparisonResults={algorithmComparisonResults} // ✅ ADD THIS
            setShowComparisonModal={setShowComparisonModal}
          />
          <RouteDetails route={selectedRoute || undefined} onSliderChange={handleSliderChange} />
        </main>
      </div>

    </div>
  );
}

export default App;