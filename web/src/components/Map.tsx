import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios'; // For making API requests

// Fix Leaflet marker icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const StartIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const EndIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Custom ambulance icon
const ambulanceIcon = new L.Icon({
  iconUrl: '/ambulance-icon.png', // Ensure this image is placed in the public folder
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom traffic signal icon
const TrafficSignalIcon = new L.Icon({
  iconUrl: '/traffic.png', // Ensure this image is placed in the public folder
  iconSize: [30, 30], // Adjusted size for better visibility
  iconAnchor: [15, 15], // Center the icon
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  selectedRoute: {
    startPoint?: { lat: number; lng: number };
    endPoint?: { lat: number; lng: number };
    path?: { lat: number; lng: number }[];
    waypoints?: { lat: number; lng: number; timestamp?: string }[];
    name?: string;
  } | null;
  ambulancePosition: { lat: number; lng: number } | null; // Current position of the ambulance
}

const Map: React.FC<MapProps> = ({ selectedRoute, ambulancePosition }) => {
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default center (Bangalore)
  const [zoom, setZoom] = useState(13);
  const [calculatedRoute, setCalculatedRoute] = useState<[number, number][]>([]);
  const [trafficSignals, setTrafficSignals] = useState<[number, number][]>([]); // Traffic signal points
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRoute?.startPoint && selectedRoute?.endPoint) {
      const newCenter: [number, number] = [
        (selectedRoute.startPoint.lat + selectedRoute.endPoint.lat) / 2,
        (selectedRoute.startPoint.lng + selectedRoute.endPoint.lng) / 2,
      ];
      setCenter(newCenter);
      setZoom(12);

      // Calculate route and fetch traffic signals when a new route is selected
      const fetchRouteAndTrafficSignals = async () => {
        try {
          setRouteError(null);
          if (selectedRoute.path) {
            const routePoints: [number, number][] = selectedRoute.path.map((point) => [point.lat, point.lng]); // Explicitly type as [number, number][]
            setCalculatedRoute(routePoints);

            // Fetch traffic signals using Overpass API
            const bounds = getBoundsFromRoute(routePoints);
            const overpassQuery = `
              [out:json];
              (
                node["highway"="traffic_signals"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
              );
              out body;
            `;
            const response = await axios.post(
              'https://overpass-api.de/api/interpreter',
              overpassQuery,
              { headers: { 'Content-Type': 'text/plain' } }
            );

            const trafficSignalPoints: [number, number][] = response.data.elements.map((element: any) => [
              element.lat,
              element.lon,
            ]); // Explicitly type as [number, number][]
            setTrafficSignals(trafficSignalPoints);
          }
        } catch (error) {
          setRouteError(error instanceof Error ? error.message : 'Failed to fetch traffic signals');
          setCalculatedRoute([]);
          setTrafficSignals([]);
        }
      };

      fetchRouteAndTrafficSignals();
    }
  }, [selectedRoute]);

  const getBoundsFromRoute = (route: [number, number][]) => {
    const lats = route.map((point) => point[0]);
    const lngs = route.map((point) => point[1]);
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  };

  const getRoutePath = (): [number, number][] => {
    if (!selectedRoute) return [];
    if (calculatedRoute.length > 0) {
      return calculatedRoute;
    }
    if (selectedRoute.startPoint && selectedRoute.endPoint) {
      return [
        [selectedRoute.startPoint.lat, selectedRoute.startPoint.lng],
        ...(selectedRoute.waypoints?.map((point) => [point.lat, point.lng] as [number, number]) || []),
        [selectedRoute.endPoint.lat, selectedRoute.endPoint.lng],
      ];
    }
    return [];
  };

  return (
    <div className="flex-1 w-full h-full min-h-[400px] z-0 relative">
      {routeError && (
        <div className="absolute top-4 right-4 z-[1000] bg-rose-50 text-rose-700 px-4 py-2 rounded-lg shadow-sm border border-rose-200">
          {routeError}
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedRoute?.startPoint && (
          <Marker position={[selectedRoute.startPoint.lat, selectedRoute.startPoint.lng]} icon={StartIcon}>
            <Popup>
              <div>
                <h3 className="font-semibold text-slate-800">{selectedRoute.name || 'Start Point'}</h3>
                <p className="text-slate-600">Starting Point</p>
              </div>
            </Popup>
          </Marker>
        )}

        {selectedRoute?.endPoint && (
          <Marker position={[selectedRoute.endPoint.lat, selectedRoute.endPoint.lng]} icon={EndIcon}>
            <Popup>
              <div>
                <h3 className="font-semibold text-slate-800">{selectedRoute.name || 'End Point'}</h3>
                <p className="text-slate-600">Destination</p>
              </div>
            </Popup>
          </Marker>
        )}

        {selectedRoute?.waypoints?.map((point, index) => (
          <Marker key={index} position={[point.lat, point.lng]} icon={DefaultIcon}>
            <Popup>
              <div>
                <h3 className="font-semibold text-slate-800">Waypoint {index + 1}</h3>
                <p className="text-slate-600">
                  {point.timestamp && new Date(point.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <Polyline positions={getRoutePath()} color="blue" weight={5} />

        {/* Traffic Signal Markers */}
        {trafficSignals.map((point, index) => (
          <Marker key={index} position={point} icon={TrafficSignalIcon}>
            <Popup>
              <div>
                <h3 className="font-semibold text-slate-800">Traffic Signal</h3>
                <p className="text-slate-600">Lat: {point[0]}, Lng: {point[1]}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ambulance Marker */}
        {ambulancePosition && (
          <Marker position={ambulancePosition} icon={ambulanceIcon}>
            <Popup>Ambulance</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;