import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route } from '../types/route';
import { getRoute } from '../services/routeApi';

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

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  selectedRoute: Route | null;
}

const Map: React.FC<MapProps> = ({ selectedRoute }) => {
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [zoom, setZoom] = useState(13);
  const [calculatedRoute, setCalculatedRoute] = useState<[number, number][]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRoute) {
      const newCenter: [number, number] = [
        (selectedRoute.startPoint.lat + selectedRoute.endPoint.lat) / 2,
        (selectedRoute.startPoint.lng + selectedRoute.endPoint.lng) / 2
      ];
      setCenter(newCenter);
      setZoom(12);

      // Calculate route when a new route is selected
      const fetchRoute = async () => {
        try {
          setRouteError(null);
          const routeData = await getRoute(
            selectedRoute.startPoint.lat,
            selectedRoute.startPoint.lng,
            selectedRoute.endPoint.lat,
            selectedRoute.endPoint.lng
          );
          // The RouteResponse now has a 'path' property, not 'geometry'
          setCalculatedRoute(routeData.path);
        } catch (error) {
          setRouteError(error instanceof Error ? error.message : 'Failed to calculate route');
          setCalculatedRoute([]);
        }
      };

      fetchRoute();
    }
  }, [selectedRoute]);

  const getRoutePath = (): [number, number][] => {
    if (!selectedRoute) return [];
    
    // Ensure we're returning the correct type
    if (calculatedRoute.length > 0) {
      return calculatedRoute as [number, number][];
    } else {
      return [
        [selectedRoute.startPoint.lat, selectedRoute.startPoint.lng] as [number, number],
        ...selectedRoute.waypoints.map(point => [point.lat, point.lng] as [number, number]),
        [selectedRoute.endPoint.lat, selectedRoute.endPoint.lng] as [number, number]
      ];
    }
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
        
        {selectedRoute && (
          <>
            <Marker 
              position={[selectedRoute.startPoint.lat, selectedRoute.startPoint.lng]}
              icon={StartIcon}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold text-slate-800">{selectedRoute.name}</h3>
                  <p className="text-slate-600">Starting Point</p>
                </div>
              </Popup>
            </Marker>
            
            <Marker 
              position={[selectedRoute.endPoint.lat, selectedRoute.endPoint.lng]}
              icon={EndIcon}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold text-slate-800">{selectedRoute.name}</h3>
                  <p className="text-slate-600">Destination</p>
                </div>
              </Popup>
            </Marker>
            
            {selectedRoute.waypoints.map((point, index) => (
              <Marker 
                key={index}
                position={[point.lat, point.lng]}
                icon={DefaultIcon}
              >
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
            
            <Polyline 
              positions={getRoutePath()}
              color={selectedRoute.status === 'completed' ? '#10B981' : '#6366F1'}
              weight={4}
              opacity={0.7}
              dashArray={selectedRoute.status === 'in-progress' ? '10, 10' : undefined}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;