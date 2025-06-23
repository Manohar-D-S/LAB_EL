//Map.tsx
// This component displays a map with a route, traffic signals, and an ambulance marker.

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

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

// Custom traffic signal icon
const TrafficSignalIcon = new L.Icon({
  iconUrl: '/traffic.png', // Ensure this image is placed in the public folder
  iconSize: [35, 35], // Adjusted size for better visibility
  iconAnchor: [18, 18], // Center the icon
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RoutePoint {
  lat: number;
  lng: number;
  timestamp?: string;
}
interface Route {
  path: RoutePoint[];
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  waypoints?: RoutePoint[];
  distance?: number;
  time_mins?: number;
  name?: string;
}
interface TrafficSignal {
  id: string;
  position: [number, number];
  name: string;
}
interface SignalCluster {
  id: string;
  position: [number, number];
  name: string;
  count: number;
  signals: TrafficSignal[];
}

interface MapProps {
  selectedRoute: Route | null;
  ambulancePosition: { lat: number; lng: number } | null;
  isSimulationActive?: boolean;
}

const MapComponent: React.FC<MapProps> = ({
  selectedRoute,
  ambulancePosition,
  isSimulationActive = false
}) => {
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default center (Bangalore)
  const [zoom, setZoom] = useState(13);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [trafficSignals, setTrafficSignals] = useState<TrafficSignal[]>([]);
  const [signalClusters, setSignalClusters] = useState<SignalCluster[]>([]);
  const [signalsOnRoute, setSignalsOnRoute] = useState<string[]>([]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [calculatedRoute, setCalculatedRoute] = useState<[number, number][]>([]);

  // Track which signal cluster is currently green/blinking
  const [greenSignalId, setGreenSignalId] = useState<string | null>(null);
  const loggedSignalRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedRoute?.startPoint && selectedRoute?.endPoint) {
      const newCenter: [number, number] = [
        (selectedRoute.startPoint.lat + selectedRoute.endPoint.lat) / 2,
        (selectedRoute.startPoint.lng + selectedRoute.endPoint.lng) / 2,
      ];
      setCenter(newCenter);
      setZoom(12);

      // Calculate route and fetch traffic signals when a new route is selected
      const fetchRouteAndTrafficSignals = async (retryCount = 0) => {
        try {
          setRouteError(null);
          if (selectedRoute.path) {
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
            const response = await axios.post(
              'https://overpass-api.de/api/interpreter',
              overpassQuery,
              { headers: { 'Content-Type': 'text/plain' }, timeout: 10000 }
            );

            const trafficSignalPoints = response.data.elements.map((element: any) => ({
              position: [element.lat, element.lon] as [number, number],
              name: element.tags?.name || 'Unnamed',
            }));
            setTrafficSignals(trafficSignalPoints);
          }
        } catch (error) {
          if (retryCount < 2) {
            // Retry up to 2 times with a delay
            setTimeout(() => fetchRouteAndTrafficSignals(retryCount + 1), 2000);
          } else {
            setRouteError('Failed to fetch traffic signals from Overpass API. Please try again later.');
            setCalculatedRoute([]);
            setTrafficSignals([]);
          }
        }
      };

      fetchRouteAndTrafficSignals();
    }
  }, [selectedRoute]);

  // Helper function to send proximity log to Python server
  function sendProximityLog(signal: any, distance: number) {
    fetch('http://localhost:8000/iot/proximity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signalId: signal.id || signal.name || '', // Prefer OSM node id, fallback to name
        name: signal.name || '',
        lat: signal.position[0],
        lng: signal.position[1],
        distance: distance // Send distance as a separate field
      })
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (ambulancePosition) {
        trafficSignals.forEach((signal) => {
          const distance = L.latLng(ambulancePosition.lat, ambulancePosition.lng).distanceTo(
            L.latLng(signal.position[0], signal.position[1])
          );
          if (distance <= 150) {
            console.log(
              `Ambulance within 150m of ${signal.name} signal. Distance: ${distance.toFixed(1)}m`
            );
            sendProximityLog(signal, distance);
          }
        });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [ambulancePosition, trafficSignals]);

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

  // Fetch traffic signals when a route is selected
  useEffect(() => {
    if (selectedRoute?.path && selectedRoute.path.length > 0) {
      const fetchTrafficSignals = async (retryCount = 0) => {
        try {
          setRouteError(null);
          const routePoints: [number, number][] = selectedRoute.path.map(point => [point.lat, point.lng]);
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
            { headers: { 'Content-Type': 'text/plain' }, timeout: 10000 }
          );
          const signals = response.data.elements.map((element: any) => ({
            id: element.id.toString(),
            position: [element.lat, element.lon] as [number, number],
            name: element.tags?.name || `Signal ${element.id}`
          }));
          setTrafficSignals(signals);
          const clusters = clusterSignals(signals);
          setSignalClusters(clusters);
          const onRouteClusterIds: string[] = clusters
            .filter(cluster =>
              cluster.signals.some(signal =>
                isSignalOnRoute(signal.position, selectedRoute.path)
              )
            )
            .map(cluster => cluster.id);
          setSignalsOnRoute(onRouteClusterIds);
        } catch (error) {
          if (retryCount < 2) {
            setTimeout(() => fetchTrafficSignals(retryCount + 1), 2000);
          } else {
            setRouteError('Failed to fetch traffic signals. Showing default signals instead.');
            const defaultSignals = [
              { id: "1", position: [12.9851, 77.5161] as [number, number], name: "Signal at Chord Road" },
              { id: "2", position: [12.9808, 77.5240] as [number, number], name: "Signal at Vijayanagar" },
              { id: "3", position: [12.9773, 77.5350] as [number, number], name: "Signal at Magadi Road" },
              { id: "4", position: [12.9772, 77.5348] as [number, number], name: "Signal at Magadi Road 2" },
              { id: "5", position: [12.9715, 77.5550] as [number, number], name: "Signal at Lalbagh" },
              { id: "6", position: [12.9684, 77.5650] as [number, number], name: "Signal at Richmond Road" },
            ];
            setTrafficSignals(defaultSignals);
            const clusters = clusterSignals(defaultSignals);
            setSignalClusters(clusters);
            const onRouteClusterIds: string[] = clusters
              .filter(cluster =>
                cluster.signals.some(signal =>
                  isSignalOnRoute(signal.position, selectedRoute.path)
                )
              )
              .map(cluster => cluster.id);
            setSignalsOnRoute(onRouteClusterIds);
          }
        }
      };
      fetchTrafficSignals();
      if (selectedRoute.path.length > 0) {
        const routePoints: [number, number][] = selectedRoute.path.map(point => [point.lat, point.lng]);
        const bounds = getBoundsFromRoute(routePoints);
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        setCenter([centerLat, centerLng]);
        setZoom(14);
      }
    }
  }, [selectedRoute]);
       
  // Helper: Get the next signal cluster on the route that the ambulance hasn't passed yet
  const getNextSignalCluster = () => {
    if (!ambulancePosition || !selectedRoute || signalsOnRoute.length === 0) return null;
    let minIndex = Infinity;
    let nextCluster: SignalCluster | null = null;
    for (const cluster of signalClusters) {
      if (!signalsOnRoute.includes(cluster.id)) continue;
      let closestIdx = 0;
      let minDist = Infinity;
      selectedRoute.path.forEach((pt, idx) => {
        const dist = L.latLng(pt.lat, pt.lng).distanceTo(L.latLng(cluster.position[0], cluster.position[1]));
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });
      let ambIdx = 0;
      let ambMinDist = Infinity;
      selectedRoute.path.forEach((pt, idx) => {
        const dist = L.latLng(pt.lat, pt.lng).distanceTo(L.latLng(ambulancePosition.lat, ambulancePosition.lng));
        if (dist < ambMinDist) {
          ambMinDist = dist;
          ambIdx = idx;
        }
      });
      if (closestIdx >= ambIdx && closestIdx < minIndex) {
        minIndex = closestIdx;
        nextCluster = cluster;
      }
    }
    return nextCluster;
  };

  // Helper: Calculate route distance from ambulance to signal along the path (signed)
  const getRouteDistanceToSignal = (
    ambulance: { lat: number; lng: number },
    signal: [number, number],
    path: RoutePoint[]
  ): number => {
    if (!path || path.length < 2) return 0;
    let ambIdx = 0, ambMinDist = Infinity;
    path.forEach((pt, idx) => {
      const d = L.latLng(pt.lat, pt.lng).distanceTo(L.latLng(ambulance.lat, ambulance.lng));
      if (d < ambMinDist) {
        ambMinDist = d;
        ambIdx = idx;
      }
    });
    let sigIdx = 0, sigMinDist = Infinity;
    path.forEach((pt, idx) => {
      const d = L.latLng(pt.lat, pt.lng).distanceTo(L.latLng(signal[0], signal[1]));
      if (d < sigMinDist) {
        sigMinDist = d;
        sigIdx = idx;
      }
    });
    if (ambIdx > sigIdx) {
      let dist = L.latLng(signal[0], signal[1]).distanceTo(L.latLng(path[sigIdx].lat, path[sigIdx].lng));
      for (let i = sigIdx; i < ambIdx; i++) {
        dist += L.latLng(path[i].lat, path[i].lng).distanceTo(L.latLng(path[i + 1].lat, path[i + 1].lng));
      }
      dist += L.latLng(path[ambIdx].lat, path[ambIdx].lng).distanceTo(L.latLng(ambulance.lat, ambulance.lng));
      return -dist;
    }
    let dist = L.latLng(ambulance.lat, ambulance.lng).distanceTo(L.latLng(path[ambIdx].lat, path[ambIdx].lng));
    for (let i = ambIdx; i < sigIdx; i++) {
      dist += L.latLng(path[i].lat, path[i].lng).distanceTo(L.latLng(path[i + 1].lat, path[i + 1].lng));
    }
    dist += L.latLng(path[sigIdx].lat, path[sigIdx].lng).distanceTo(L.latLng(signal[0], signal[1]));
    return dist;
  };

  // Effect: Handle green/blinking logic and logging
  useEffect(() => {
    if (!ambulancePosition || !selectedRoute || !isSimulationActive) {
      setGreenSignalId(null);
      loggedSignalRef.current = null;
      return;
    }
    const nextCluster = getNextSignalCluster();
    if (!nextCluster) {
      setGreenSignalId(null);
      loggedSignalRef.current = null;
      return;
    }
    const dist = getRouteDistanceToSignal(
      ambulancePosition,
      nextCluster.position,
      selectedRoute.path
    );
    if (dist >= 0 && dist <= 200 && greenSignalId !== nextCluster.id) {
      setGreenSignalId(nextCluster.id);
      if (loggedSignalRef.current !== nextCluster.id) {
        nextCluster.signals.forEach(signal => {
          const signalDist = getRouteDistanceToSignal(
            ambulancePosition,
            signal.position,
            selectedRoute.path
          );
          fetch('http://localhost:8000/proximity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signalId: signal.id,
              name: signal.name,
              lat: signal.position[0],
              lng: signal.position[1],
              distance: signalDist
            })
          }).catch(err => console.error('Failed to send proximity log:', err));
        });
        loggedSignalRef.current = nextCluster.id;
      }
    }
    if (greenSignalId) {
      const greenCluster = signalClusters.find(c => c.id === greenSignalId);
      if (greenCluster) {
        const distToGreen = getRouteDistanceToSignal(
          ambulancePosition,
          greenCluster.position,
          selectedRoute.path
        );
        if (distToGreen < -100) {
          setGreenSignalId(null);
          loggedSignalRef.current = null;
        }
      }
    }
  // eslint-disable-next-line
  }, [ambulancePosition, isSimulationActive, selectedRoute, signalClusters, signalsOnRoute, greenSignalId]);

  // Add blinking CSS
  useEffect(() => {
    const styleId = "blinking-signal-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .blinking-signal {
          animation: blink-signal 1s linear infinite;
          box-shadow: 0 0 16px 6px #22c55e, 0 2px 4px rgba(0,0,0,0.2);
          border-color: #22c55e !important;
        }
        @keyframes blink-signal {
          0% { filter: brightness(1.2); }
          50% { filter: brightness(2.5); }
          100% { filter: brightness(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
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

  const clusterSignals = (signals: TrafficSignal[]): SignalCluster[] => {
    const clusters: { [key: string]: SignalCluster } = {};
    signals.forEach(signal => {
      const clusterId = signal.position.toString();
      if (!clusters[clusterId]) {
        clusters[clusterId] = {
          id: clusterId,
          position: signal.position,
          name: signal.name,
          count: 0,
          signals: []
        };
      }
      clusters[clusterId].count++;
      clusters[clusterId].signals.push(signal);
    });
    return Object.values(clusters);
  };

  const isSignalOnRoute = (signalPosition: [number, number], route: RoutePoint[]): boolean => {
    if (!route || route.length < 2) return false;
    for (let i = 0; i < route.length - 1; i++) {
      const start = route[i];
      const end = route[i + 1];
      if (isPointNearLineSegment(signalPosition, start, end)) {
        return true;
      }
    }
    return false;
  };

  const getSignalIcon = (count: number) => {
    if (count === 1) {
      return TrafficSignalIcon;
    }
    return new L.Icon({
      iconUrl: `/traffic-${Math.min(count, 4)}.png`,
      iconSize: [35, 35],
      iconAnchor: [18, 18],
      className: '' // Add default empty className
    } as L.IconOptions);
  };

  const isPointNearLineSegment = (point: [number, number], start: RoutePoint, end: RoutePoint, tolerance = 0.0001): boolean => {
    const lat = point[0], lng = point[1];
    const lat1 = start.lat, lng1 = start.lng;
    const lat2 = end.lat, lng2 = end.lng;
    const d = Math.abs(
      (lat2 - lat1) * (lng - lng1) - (lat - lat1) * (lng2 - lng1)
    ) / Math.sqrt(
      (lat2 - lat1) ** 2 + (lng2 - lng1) ** 2
    );
    return d <= tolerance;
  };

  return (
    <div className="flex-1 w-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
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
        {signalClusters.map((cluster) => {
          if (isSimulationActive && !signalsOnRoute.includes(cluster.id)) {
            return null;
          }
          const isGreen = greenSignalId === cluster.id;
          const icon = getSignalIcon(cluster.count);
          if (isGreen && icon && 'options' in icon) {
            (icon.options as L.IconOptions).className = ((icon.options as L.IconOptions).className || "") + " blinking-signal";
          } else if (icon && 'options' in icon) {
            (icon.options as L.IconOptions).className = ((icon.options as L.IconOptions).className || "").replace("blinking-signal", "");
          }
          return (
            <Marker
              key={cluster.id}
              position={cluster.position}
              icon={icon}
            >
              <Popup>
                <div className="text-center">
                  <strong>{cluster.name}</strong>
                  {cluster.count > 1 && (
                    <div className="mt-1">
                      <div className="text-xs font-medium text-gray-700">Signals in this junction:</div>
                      <ul className="list-disc text-left text-xs pl-5 mt-1">
                        {cluster.signals.map(signal => (
                          <li key={signal.id}>{signal.name}</li>
                        )).slice(0, 5)}
                        {cluster.signals.length > 5 && (
                          <li className="text-gray-500">...and {cluster.signals.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {isSimulationActive && signalsOnRoute.includes(cluster.id) && (
                    <div className="text-xs text-blue-600 mt-1 font-semibold">On Route</div>
                  )}
                  {isGreen && (
                    <div className="text-xs text-green-600 mt-1 font-bold animate-pulse">
                      🚦 Green for Ambulance!
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulance Marker */}
        {ambulancePosition && (
          <Marker position={ambulancePosition} icon={ambulanceIcon}>
            <Popup>Ambulance</Popup>
          </Marker>
        )}
      </MapContainer>
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
    </div>
  );
};

export default MapComponent;