import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { MapView as RNMapView, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LocationType } from '@/hooks/useLocation';
import { RouteType } from '@/hooks/useRoutes';

type MapViewProps = {
  source: LocationType | null;
  destination: LocationType | null;
  route: RouteType | null;
  isEmergency?: boolean;
};

export default function MapView({ source, destination, route, isEmergency = false }: MapViewProps) {
  const mapRef = useRef<RNMapView>(null);

  // Fit map to show both markers
  useEffect(() => {
    if (mapRef.current && source && destination) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: source.latitude, longitude: source.longitude },
          { latitude: destination.latitude, longitude: destination.longitude }
        ],
        {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true
        }
      );
    } else if (mapRef.current && source) {
      mapRef.current.animateToRegion({
        latitude: source.latitude,
        longitude: source.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  }, [source, destination]);

  // Convert polyline coordinates to React Native Maps format
  const getPolylineCoordinates = () => {
    if (!route || !route.polyline) return [];
    
    return route.polyline.map(coord => ({
      latitude: coord[0],
      longitude: coord[1]
    }));
  };

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: source?.latitude || 37.7749,
          longitude: source?.longitude || -122.4194,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {source && (
          <Marker
            coordinate={{
              latitude: source.latitude,
              longitude: source.longitude,
            }}
            title="Source"
            description={source.address || "Current Location"}
            pinColor="blue"
          />
        )}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="Destination"
            description={destination.address || "Destination"}
            pinColor="red"
          />
        )}

        {route && route.polyline && (
          <Polyline
            coordinates={getPolylineCoordinates()}
            strokeWidth={5}
            strokeColor={isEmergency ? '#E53935' : '#3388ff'}
          />
        )}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});