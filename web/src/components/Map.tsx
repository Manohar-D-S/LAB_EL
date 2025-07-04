//Map.tsx
// This component displays a map with a route, traffic signals, and an ambulance marker.

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import Sidebar from './Sidebar';
import { AlgorithmResult } from '../types/route';
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

const ambulanceIcon = new L.Icon({
  iconUrl: '/ambulance.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const trafficSignalIcon = L.divIcon({
  html: `<img src="/traffic.svg" alt="Traffic Signal" style="width:35px;height:35px;" />`,
  className: '',
  iconSize: [35, 35],
  iconAnchor: [18, 18],
});

const greenTrafficSignalIcon = L.divIcon({
  html: `<img src="/traffic-green.svg" alt="Green Traffic Signal" style="width:50px;height:50px;" />`,
  className: '',
  iconSize: [63, 63],
  iconAnchor: [31, 31],
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

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface MapProps {
  selectedRoute: Route | null;
  ambulancePosition: { lat: number; lng: number } | null;
  isSimulationActive?: boolean;
  locations?: Location[];
  onRouteSelect?: (
    source: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number }
  ) => void;
  onStartSimulation?: () => void;
  onResetRoute?: () => void;
  isLoading?: boolean;
  pickOnMapMode?: boolean;
  onPickOnMapEnd?: () => void;
  onPickOnMapStart?: () => void;
  onPickOnMapComplete?: (source: { lat: number; lng: number }, destination: { lat: number; lng: number }) => void;
  algorithmComparisonResults?: AlgorithmResult[];
  setShowComparisonModal?: (open: boolean) => void;
}


const defaultLocations: Location[] = [
  { id: "LakshmiHospital", name: "Lakshmi Hospital", lat: 12.988345, lng: 77.508878 },
  { id: "Kamakshipalya", name: "Kamakshipalya", lat: 12.982516, lng: 77.529095 },
  { id: "SanjeeviniHospital", name: "Sanjeevini Hospital", lat: 12.982157, lng: 77.598217 },
  { id: "MythicSociety", name: "Mythic Society", lat: 12.972791, lng: 77.586308 },
  { id: "VetCollege", name: "Vet College", lat: 12.907877, lng: 77.592391 },
  { id: "JayadevaHospital", name: "Jayadeva Hospital", lat: 12.917924, lng: 77.599245 },
  { id: "SparshHospital", name: "Sparsh Hospital", lat: 13.0277298, lng: 77.5428356 },
  { id: "Narayana Hrudayalaya", name: "Narayana Hrudayalaya", lat: 12.9238254, lng: 77.6508147 },
  { id: "NIMHANS", name: "NIMHANS", lat: 12.940071, lng: 77.593115 }
];

const MapComponent: React.FC<MapProps> = ({
  selectedRoute,
  ambulancePosition,
  isSimulationActive = false,
  locations = defaultLocations,
  onRouteSelect,
  onResetRoute,
  isLoading,
  pickOnMapMode,
  onPickOnMapComplete,
  algorithmComparisonResults,
  setShowComparisonModal,
  onPickOnMapEnd,
  onPickOnMapStart,
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
  const [clearedSignalIds, setClearedSignalIds] = useState<Set<string>>(new Set());

  // Source and destination states
  const [source, setSource] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedPoints, setPickedPoints] = useState<{ source: { lat: number; lng: number } | null, destination: { lat: number; lng: number } | null }>({ source: null, destination: null });
  // const [pickCount, setPickCount] = useState(0);
  // const [tempSource, setTempSource] = useState<{ lat: number; lng: number } | null>(null);
  // const [tempDestination, setTempDestination] = useState<{ lat: number; lng: number } | null>(null);

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
              id: element.id.toString(),
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
  function sendProximityLog(signal: any, distance: number, routeDistance?: number) {
    const payload = {
      signalId: signal.id || signal.name || 'unknown',
      name: signal.name || 'Unnamed Signal',
      lat: signal.position[0],
      lng: signal.position[1],
      distance: Math.round(distance),
      routeDistance: routeDistance ? Math.round(routeDistance) : undefined,
      timestamp: new Date().toISOString(),
      ambulancePosition: ambulancePosition ? {
        lat: ambulancePosition.lat,
        lng: ambulancePosition.lng
      } : null
    };

    // Send to both endpoints for compatibility
    fetch('http://localhost:8000/iot/proximity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('Failed to send IoT proximity log:', err));

    fetch('http://localhost:8000/proximity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('Failed to send proximity log:', err));
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (ambulancePosition) {
        trafficSignals.forEach((signal) => {
          const distance = L.latLng(ambulancePosition.lat, ambulancePosition.lng).distanceTo(
            L.latLng(signal.position[0], signal.position[1])
          );
          if (distance <= 150) {
            sendProximityLog(signal, distance);
          }
        });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [ambulancePosition, trafficSignals]);

  useEffect(() => {
    if (selectedRoute?.distance && selectedRoute?.distance > 0) {
      setCalculatedDistance(selectedRoute.distance);
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
          // Use the new clustering function
          const clusters = clusterSignals(signals, 120);
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
       
  // Cluster signals that are within a certain distance (e.g., 60m) of each other
  const clusterSignals = (signals: TrafficSignal[], maxDistance: number = 60): SignalCluster[] => {
    const clusters: SignalCluster[] = [];
    const used = new Set<string>();
    for (let i = 0; i < signals.length; i++) {
      if (used.has(signals[i].id)) continue;
      const clusterSignals: TrafficSignal[] = [signals[i]];
      used.add(signals[i].id);
      for (let j = i + 1; j < signals.length; j++) {
        if (used.has(signals[j].id)) continue;
        const dist = L.latLng(signals[i].position[0], signals[i].position[1])
          .distanceTo(L.latLng(signals[j].position[0], signals[j].position[1]));
        if (dist <= maxDistance) {
          clusterSignals.push(signals[j]);
          used.add(signals[j].id);
        }
      }
      // Compute cluster center
      const lat = clusterSignals.reduce((sum, s) => sum + s.position[0], 0) / clusterSignals.length;
      const lng = clusterSignals.reduce((sum, s) => sum + s.position[1], 0) / clusterSignals.length;
      clusters.push({
        id: clusterSignals.map(s => s.id).join('-'),
        position: [lat, lng],
        name: clusterSignals.length > 1
          ? `Cluster (${clusterSignals.length} signals)`
          : clusterSignals[0].name,
        count: clusterSignals.length,
        signals: clusterSignals,
      });
    }
    return clusters;
  };

  // --- Add this helper function for edge-based signal filtering ---
  function getEdgeFilteredClusters(
    route: RoutePoint[],
    clusters: SignalCluster[],
    maxDistance = 120
  ): SignalCluster[] {
    const usedSignalIds = new Set<string>();
    const filtered: SignalCluster[] = [];
    if (!route || route.length < 2) return filtered;

    for (let i = 0; i < route.length - 1; i++) {
      const start = route[i];
      const end = route[i + 1];
      let foundCluster: SignalCluster | null = null;
      let minDist = Infinity;

      for (const cluster of clusters) {
        // Skip if any signal in this cluster is already used
        if (cluster.signals.some(s => usedSignalIds.has(s.id))) continue;
        // Use cluster center for distance
        const dist = getDistancePointToSegment(cluster.position, start, end);
        if (dist <= maxDistance && dist < minDist) {
          foundCluster = cluster;
          minDist = dist;
        }
      }

      if (foundCluster) {
        filtered.push(foundCluster);
        foundCluster.signals.forEach(s => usedSignalIds.add(s.id));
      }
    }

    return filtered;
  }

  // 4. Updated isSignalOnRoute function with better logging
  const isSignalOnRoute = (signalPosition: [number, number], route: RoutePoint[]): boolean => {
    if (!route || route.length < 2) {
      return false;
    }

    let minDistance = Infinity;

    for (let i = 0; i < route.length - 1; i++) {
      const start = route[i];
      const end = route[i + 1];
      const distance = getDistancePointToSegment(signalPosition, start, end);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance <= 100; // 100m threshold
  };

  // 5. Updated getDistancePointToSegment with error handling
  function getDistancePointToSegment(
    point: [number, number],
    start: RoutePoint,
    end: RoutePoint
  ): number {
    try {
      const p = L.latLng(point[0], point[1]);
      const v = L.latLng(start.lat, start.lng);
      const w = L.latLng(end.lat, end.lng);

      const l2 = v.distanceTo(w) ** 2;
      if (l2 === 0) return p.distanceTo(v);

      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) /
            ((w.lat - v.lat) ** 2 + (w.lng - v.lng) ** 2)
        )
      );

      const proj = L.latLng(
        v.lat + t * (w.lat - v.lat),
        v.lng + t * (w.lng - v.lng)
      );

      return p.distanceTo(proj);
    } catch (error) {
      return Infinity;
    }
  }

  // Proximity logic: green breathing effect and log
  // Define filteredClusters at the top level of the component
  const filteredClusters = React.useMemo(
    () =>
      selectedRoute && signalClusters.length > 0
        ? getEdgeFilteredClusters(selectedRoute.path, signalClusters, 120)
        : [],
    [selectedRoute, signalClusters]
  );

  useEffect(() => {
    setClearedSignalIds(new Set());
  }, [selectedRoute]);

  useEffect(() => {
    if (greenSignalId && !clearedSignalIds.has(greenSignalId)) {
      setClearedSignalIds(prev => new Set(prev).add(greenSignalId));
    }
  }, [greenSignalId]);

  useEffect(() => {
    if (
      !ambulancePosition ||
      !selectedRoute ||
      filteredClusters.length === 0 ||
      signalsOnRoute.length === 0
    ) {
      setGreenSignalId(null);
      loggedSignalRef.current = null;
      return;
    }

    let closestCluster: SignalCluster | null = null;
    let closestDistance = Infinity;

    for (const cluster of filteredClusters) {
      if (!signalsOnRoute.includes(cluster.id)) continue;
      const distance = L.latLng(ambulancePosition.lat, ambulancePosition.lng)
        .distanceTo(L.latLng(cluster.position[0], cluster.position[1]));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCluster = cluster;
      }
    }

    if (closestCluster && closestDistance <= 200) {
      if (greenSignalId !== closestCluster.id) {
        setGreenSignalId(closestCluster.id);
        loggedSignalRef.current = closestCluster.id;
      }
    } else if ((!closestCluster || closestDistance > 250) && greenSignalId) {
      setGreenSignalId(null);
      loggedSignalRef.current = null;
    }
  }, [ambulancePosition, selectedRoute, filteredClusters, signalsOnRoute]);

  // Click handler component
  function ClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
    useMapEvent('click', (e) => {
      onClick(e.latlng);
    });
    return null;
  }

  // Handle map click to set source/destination (dynamic picking)
  const handleMapClick = (latlng: L.LatLng) => {
    const point = { lat: latlng.lat, lng: latlng.lng };
    if (pickOnMapMode) {
      if (!pickedPoints.source) {
        setPickedPoints({ source: point, destination: null });
      } else if (!pickedPoints.destination) {
        setPickedPoints(prev => ({ ...prev, destination: point }));
      }
      return;
    }
    // Block normal click if a route is already selected
    if (selectedRoute) {
      return;
    }
    if (!source) {
      setSource(point);
    } else if (!destination) {
      setDestination(point);
      if (onRouteSelect) onRouteSelect(source, point);
    } else {
      setSource(point);
      setDestination(null);
    }
  };

  // Reset pick state if mode is turned off
  React.useEffect(() => {
    if (!pickOnMapMode) {
      setPickedPoints({ source: null, destination: null });
    }
  }, [pickOnMapMode]);

  const handleSearch = (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    if (onRouteSelect) {
      // Clear any previous route data
      setSource(start);
      setDestination(end);
      onRouteSelect(start, end);
    }
  };

  // Sync picked points with parent component
  useEffect(() => {
    if (pickedPoints.source && pickedPoints.destination && onRouteSelect) {
      onRouteSelect(pickedPoints.source, pickedPoints.destination);
      if (onPickOnMapEnd) onPickOnMapEnd();
      setPickedPoints({ source: null, destination: null });
    }
  }, [pickedPoints.source, pickedPoints.destination]);

  // Reset source/destination when a route is selected
  useEffect(() => {
    if (selectedRoute) {
      setSource(null);
      setDestination(null);
    }
  }, [selectedRoute]);

  // Render
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

        {/* Click handler for selecting source/destination */}
        <ClickHandler onClick={handleMapClick} />

        {/* Temporary markers for pick-on-map mode */}
        {pickOnMapMode && pickedPoints.source && (
          <Marker position={[pickedPoints.source.lat, pickedPoints.source.lng]} icon={StartIcon}>
            <Popup>Picked Source</Popup>
          </Marker>
        )}
        {pickOnMapMode && pickedPoints.destination && (
          <Marker position={[pickedPoints.destination.lat, pickedPoints.destination.lng]} icon={EndIcon}>
            <Popup>Picked Destination</Popup>
          </Marker>
        )}

        {/* Start and End markers */}
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

        {/* Route polyline */}
        {selectedRoute?.path && selectedRoute.path.length > 0 && (
          <Polyline positions={selectedRoute.path.map(pt => [pt.lat, pt.lng])} color="blue" weight={5} />
        )}

        {/* Traffic Signal Markers */}
        {filteredClusters.map((cluster) => {
          if (selectedRoute && !signalsOnRoute.includes(cluster.id)) {
            return null;
          }
          const isGreen = greenSignalId === cluster.id;
          const icon = isGreen ? greenTrafficSignalIcon : trafficSignalIcon;

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
                  {selectedRoute && signalsOnRoute.includes(cluster.id) && (
                    <div className="text-xs text-blue-600 mt-1 font-semibold">On Route</div>
                  )}
                  {isGreen && (
                    <div className="text-xs text-green-600 mt-1 font-bold">
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
            <Popup>
              <div className="text-center">
                <strong>🚑 Ambulance</strong>
                <div className="text-xs text-gray-600 mt-1">
                  Lat: {ambulancePosition.lat.toFixed(6)}<br/>
                  Lng: {ambulancePosition.lng.toFixed(6)}
                </div>
                {isSimulationActive && (
                  <div className="text-xs text-red-600 mt-1 font-semibold">
                    Emergency Response Active
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Map view updater */}
        <MapUpdater center={center} zoom={zoom} />
      </MapContainer>
      <Sidebar
        onRouteSelect={(start, end) => {
          // Convert [lat, lng] arrays to { lat, lng } objects if needed
          const toLatLng = (val: any) =>
            Array.isArray(val) ? { lat: val[0], lng: val[1] } : val;
          handleSearch(toLatLng(start), toLatLng(end));
        }}
        onResetRoute={onResetRoute}
        locations={locations}
        selectedRoute={selectedRoute}
        calculatedDistance={calculatedDistance ?? undefined}
        signalsOnRoute={signalsOnRoute}
        greenSignalId={greenSignalId}
        isSimulationActive={isSimulationActive}
        routeError={routeError}
        onPickOnMapEnd={onPickOnMapEnd} // ✅ Use the prop, not setPickOnMapMode
        onPickOnMapStart={onPickOnMapStart} // (if you want to allow starting from Sidebar)
        pickOnMapMode={pickOnMapMode}
        ambulancePosition={ambulancePosition}
        signalsCleared={clearedSignalIds.size}
        isLoading={isLoading}
        algorithmComparisonResults={algorithmComparisonResults}
        setShowComparisonModal={setShowComparisonModal || (() => {})}
      />
{/* 
      <Sidebar
          onRouteSelect={(start: [number, number], end: [number, number]) => {
            handleSearch({ lat: start[0], lng: start[1] }, { lat: end[0], lng: end[1] });
          }}
          locations={locations}
          selectedRoute={selectedRoute}
          calculatedDistance={selectedRoute?.distance}
          signalsOnRoute={[]}
          greenSignalId={null}
          isSimulationActive={isSimulationActive}
          routeError={error}
          signalsCleared={0}
          isLoading={isSearching}
          onResetRoute={() => setSelectedRoute(null)}
          onPickOnMapStart={() => setPickOnMapMode(true)}
          pickOnMapMode={pickOnMapMode}
        /> */}
    </div>
  );
};

// Component to handle map view updates
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

export default MapComponent;

function getBoundsFromRoute(routePoints: [number, number][]) {
  if (!routePoints || routePoints.length === 0) {
    // Return default bounds for Bangalore if no points
    return {
      north: 13.0827,
      south: 12.8557,
      east: 77.7526,
      west: 77.4701
    };
  }

  // Initialize bounds with first point
  let north = routePoints[0][0];
  let south = routePoints[0][0];
  let east = routePoints[0][1];
  let west = routePoints[0][1];

  for (const [lat, lng] of routePoints) {
    north = Math.max(north, lat);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    west = Math.min(west, lng);
  }

  return { north, south, east, west };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Returns distance in kilometers
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
