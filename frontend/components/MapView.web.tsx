import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationType } from '@/hooks/useLocation';
import { RouteType } from '@/hooks/useRoutes';

// Fix Leaflet marker icon issue on web
useEffect(() => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  
  // @ts-ignore
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}, []);

type MapViewProps = {
  source: LocationType | null;
  destination: LocationType | null;
  route: RouteType | null;
  isEmergency?: boolean;
};

// Component to fit bounds when markers change
function MapBounds({ source, destination }: { source: LocationType | null; destination: LocationType | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (source && destination) {
      const bounds = [
        [source.latitude, source.longitude],
        [destination.latitude, destination.longitude],
      ];
      map.fitBounds(bounds);
    } else if (source) {
      map.setView([source.latitude, source.longitude], 13);
    }
  }, [map, source, destination]);
  
  return null;
}

export default function MapView({ source, destination, route, isEmergency = false }: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>([37.7749, -122.4194]); // Default to SF
  
  useEffect(() => {
    if (source) {
      setCenter([source.latitude, source.longitude]);
    }
  }, [source]);
  
  // Style for the route line
  const routeOptions = {
    color: isEmergency ? '#E53935' : '#3388ff',
    weight: 5,
    opacity: 0.7,
  };
  
  return (
    <View style={styles.container}>
      <MapContainer
        center={center}
        zoom={13}
        style={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {source && (
          <Marker position={[source.latitude, source.longitude]}>
            <Popup>
              <Text>Source: {source.address || 'Current Location'}</Text>
            </Popup>
          </Marker>
        )}
        
        {destination && (
          <Marker position={[destination.latitude, destination.longitude]}>
            <Popup>
              <Text>Destination: {destination.address || 'Destination Location'}</Text>
            </Popup>
          </Marker>
        )}
        
        {route && route.polyline && (
          <Polyline positions={route.polyline} pathOptions={routeOptions} />
        )}
        
        {source && destination && (
          <MapBounds source={source} destination={destination} />
        )}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});