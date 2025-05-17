import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationInput from '@/components/LocationInput';
import MapView from '@/components/MapView';
import EmergencyModeToggle from '@/components/EmergencyModeToggle';
import RouteDetails from '@/components/RouteDetails';
import NavHeader from '@/components/NavHeader';
import { useLocation, LocationType } from '@/hooks/useLocation';
import { useRoutes } from '@/hooks/useRoutes';
import { useRouteHistory } from '@/hooks/useRouteHistory';
import { ArrowRight } from 'lucide-react-native';

export default function NavigationScreen() {
  const { location, errorMsg, isLoading, geocodeAddress, requestPermissions } = useLocation();
  const { route, isLoading: isLoadingRoute, error: routeError, fetchRoute } = useRoutes();
  const { addRouteToHistory } = useRouteHistory();
  
  const [source, setSource] = useState<LocationType | null>(null);
  const [destination, setDestination] = useState<LocationType | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isRouteDetailsExpanded, setIsRouteDetailsExpanded] = useState(false);

  useEffect(() => {
    if (location && !source) {
      setSource(location);
    }
  }, [location]);

  const handleSourceSearch = async (address: string) => {
    setSourceError(null);
    const result = await geocodeAddress(address);
    if (result) {
      setSource(result);
    } else {
      setSourceError('Could not find this location. Please try a different address.');
    }
  };

  const handleDestinationSearch = async (address: string) => {
    setDestinationError(null);
    const result = await geocodeAddress(address);
    if (result) {
      setDestination(result);
    } else {
      setDestinationError('Could not find this location. Please try a different address.');
    }
  };

  const resetSource = () => {
    if (location) {
      setSource(location);
    } else {
      requestPermissions();
    }
  };

  const handleGetRoute = async () => {
    if (source && destination) {
      await fetchRoute(source, destination, isEmergency);
      if (route) {
        addRouteToHistory(source, destination, isEmergency, route);
      }
    }
  };

  const toggleEmergencyMode = (value: boolean) => {
    setIsEmergency(value);
    if (source && destination && route) {
      fetchRoute(source, destination, value);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <NavHeader 
          title="Ambulance Navigation" 
          showMenu={true}
          showEmergencyCall={true}
        />

        <View style={styles.mapContainer}>
          <MapView 
            source={source} 
            destination={destination} 
            route={route}
            isEmergency={isEmergency}
          />
        </View>

        <ScrollView 
          style={styles.controlsContainer}
          keyboardShouldPersistTaps="handled"
        >
          <EmergencyModeToggle 
            isEmergency={isEmergency} 
            onToggle={toggleEmergencyMode} 
          />

          <View style={styles.inputsContainer}>
            <LocationInput
              label="Source Location"
              placeholder="Enter ambulance station"
              value={source}
              onChange={setSource}
              onSearch={handleSourceSearch}
              onReset={resetSource}
              error={sourceError}
              isLoading={isLoading}
              useCurrentLocation={true}
              locationType="source"
            />

            <LocationInput
              label="Destination Hospital"
              placeholder="Enter destination hospital"
              value={destination}
              onChange={setDestination}
              onSearch={handleDestinationSearch}
              error={destinationError}
              isLoading={isLoading}
              locationType="destination"
            />

            <TouchableOpacity 
              style={[
                styles.getRouteButton,
                (!source || !destination) && styles.getRouteButtonDisabled
              ]}
              onPress={handleGetRoute}
              disabled={!source || !destination || isLoadingRoute}
            >
              {isLoadingRoute ? (
                <Text style={styles.getRouteButtonText}>Calculating Route...</Text>
              ) : (
                <>
                  <Text style={styles.getRouteButtonText}>Get Route</Text>
                  <ArrowRight color="white" size={20} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {route && (
          <View style={styles.routeDetailsContainer}>
            <RouteDetails 
              route={route} 
              isExpanded={isRouteDetailsExpanded}
              onToggleExpand={() => setIsRouteDetailsExpanded(!isRouteDetailsExpanded)}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    zIndex: 1,
  },
  inputsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    paddingBottom: 24,
  },
  getRouteButton: {
    backgroundColor: '#E53935',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  getRouteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  getRouteButtonText: {
    color: 'white',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginRight: 8,
  },
  routeDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    maxHeight: '40%',
  },
});