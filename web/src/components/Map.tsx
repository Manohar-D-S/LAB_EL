//Map.tsx
// This component displays a map with a route, traffic signals, and an ambulance marker.

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios'; // For making API requests
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { library } from '@fortawesome/fontawesome-svg-core';
library.add(faCompass);

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
  iconUrl: '/ambulance.png', // Updated path to reflect public folder
  iconSize: [32, 32],
  iconAnchor: [16, 16],
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
  const [trafficSignals, setTrafficSignals] = useState<{ position: [number, number]; name: string; id: string; direction: string | null }[]>([]); // Traffic signal points with names
  const [routeError, setRouteError] = useState<string | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [previousPosition, setPreviousPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [ambulanceDirection, setAmbulanceDirection] = useState<number | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Helper function to send proximity log to Python server
  function sendProximityLog(signal: any, distance: number, ambulanceDirection: number | null) {
    fetch('http://localhost:8000/iot/proximity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signalId: String(signal.id || signal.name || ''), // Prefer OSM node id, fallback to name
        name: signal.name || '',
        lat: signal.position[0],
        lng: signal.position[1],
        distance: distance,
        signalDirection: signal.direction,
        ambulanceDirection: ambulanceDirection
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === "selected" && data.signal) {
          console.log("Selected signal data:", data.signal);
          setSelectedSignal(data.signal);
        } else {
          setSelectedSignal(null);
        }
      })
      .catch(err => console.error('Failed to send proximity log:', err));
  }

  useEffect(() => {
    if (selectedRoute?.startPoint && selectedRoute?.endPoint && selectedRoute.path) {
      const newCenter: [number, number] = [
        (selectedRoute.startPoint.lat + selectedRoute.endPoint.lat) / 2,
        (selectedRoute.startPoint.lng + selectedRoute.endPoint.lng) / 2,
      ];
      setCenter(newCenter);
      setZoom(12);

      const routePoints: [number, number][] = selectedRoute.path.map((point) => [point.lat, point.lng]);
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
      axios.post(
        'https://overpass-api.de/api/interpreter',
        overpassQuery,
        { headers: { 'Content-Type': 'text/plain' }, timeout: 10000 }
      ).then(response => {
        const trafficSignalPoints = response.data.elements.map((element: any) => ({
          position: [element.lat, element.lon] as [number, number],
          name: element.tags?.name || 'Unnamed',
          id: String(element.id),
          direction: element.tags?.direction || null
        }));
        setTrafficSignals(trafficSignalPoints);
        setRouteError(null);
      }).catch(() => {
        setRouteError('Failed to fetch traffic signals from Overpass API. Please try again later.');
        setCalculatedRoute([]);
        setTrafficSignals([]);
      });
    }
  }, [selectedRoute]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (ambulancePosition && !selectedSignal) {
        let ambulanceDirection = null;
        if (previousPosition) {
          ambulanceDirection = calculateBearing(previousPosition.lat, previousPosition.lng, ambulancePosition.lat, ambulancePosition.lng);
          setAmbulanceDirection(ambulanceDirection);
        }

        trafficSignals.forEach((signal) => {
          const distance = L.latLng(ambulancePosition.lat, ambulancePosition.lng).distanceTo(
            L.latLng(signal.position[0], signal.position[1])
          );
          if (distance <= 150) {
            const isCurrentlySelected = selectedSignal && selectedSignal.signalId === signal.id;
            console.log(
              `Detected near ${signal.name} (ID: ${signal.id}) - ${distance.toFixed(1)}m isSelected=${isCurrentlySelected}`
            );
            sendProximityLog(signal, distance, ambulanceDirection);
          }
        });
        setPreviousPosition({ ...ambulancePosition });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [ambulancePosition, trafficSignals, previousPosition, selectedSignal]);

  useEffect(() => {
    if (selectedRoute?.startPoint && selectedRoute?.endPoint) {
      const distance = calculateDistance(
        selectedRoute.startPoint.lat,
        selectedRoute.startPoint.lng,
        selectedRoute.endPoint.lat,
        selectedRoute.endPoint.lng
      );
      setCalculatedDistance(distance);
    } else {
      setCalculatedDistance(null);
    }
  }, [selectedRoute]);

  useEffect(() => {
    if (selectedSignal) {
      setNotification(`Selected Signal ID: ${selectedSignal.signalId}`);
      setTimeout(() => setNotification(null), 5000);
    }
  }, [selectedSignal]);

  // Revert feature: Unselect signal when ambulance leaves proximity
  useEffect(() => {
    if (!ambulancePosition || !selectedSignal) return;

    // Find the selected signal in the trafficSignals list
    const signal = trafficSignals.find(s => s.id === selectedSignal.signalId);
    if (!signal) return;

    const distance = L.latLng(ambulancePosition.lat, ambulancePosition.lng).distanceTo(
      L.latLng(signal.position[0], signal.position[1])
    );

    if (distance > 180) { // Add a small buffer to avoid flicker
      setSelectedSignal(null);
    }
  }, [ambulancePosition, selectedSignal, trafficSignals]);

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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
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
      {/* Notification */}
      {notification && (
        <div className="absolute top-12 left-4 z-[1000] bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-sm border border-green-200">
          {notification}
        </div>
      )}
      {/* Compass */}
      {ambulanceDirection !== null && (
        <div
          className="absolute bottom-4 left-4 z-[1000] bg-white text-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-200"
          style={{ transform: `rotate(${ambulanceDirection}deg)` }}
        >
          <FontAwesomeIcon icon="compass" size="lg" />
        </div>
      )}
      {/* Details Section */}
      <div className="absolute top-4 left-4 z-[1000] bg-white text-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-200">
        <h3 className="font-semibold">Details</h3>
        {calculatedDistance !== null ? (
          <p>Distance: {calculatedDistance.toFixed(2)} km</p>
        ) : (
          <p>No route selected</p>
        )}
      </div>

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
        {/* Ambulance Marker */}
        <Polyline positions={getRoutePath()} color="blue" weight={5} />
        {ambulancePosition && (
          <Marker position={[ambulancePosition.lat, ambulancePosition.lng]} icon={ambulanceIcon}>
            <Popup>Ambulance</Popup>
          </Marker>
        )}
        {/* Traffic Signal Markers */}
        {trafficSignals.map((signal, index) => {
          const isCurrentlySelected = selectedSignal && selectedSignal.signalId === signal.id;
          // Adjust the icon size and add a shadow for the pop-up effect
          const iconSize: [number, number] = isCurrentlySelected ? [45, 45] : [35, 35];
          const iconAnchor: [number, number] = isCurrentlySelected ? [23, 45] : [18, 18];

          const dynamicIcon = new L.Icon({
            iconUrl: '/traffic.png',
            iconSize: iconSize,
            iconAnchor: iconAnchor,
            shadowUrl: undefined,
            className: isCurrentlySelected ? 'selected-signal' : ''
          });

          return (
            <Marker
              key={index}
              position={signal.position}
              icon={dynamicIcon}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold text-slate-800">Traffic Signal</h3>
                  <p className="text-slate-600">{signal.name}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <style>
        {`
          .selected-signal {
            z-index: 1000;
          }
          .selected-signal .leaflet-marker-icon {
            transform: scale(1.5);
            z-index: 1000;
          }
        `}
      </style>
    </div>
  );
};

export default Map;