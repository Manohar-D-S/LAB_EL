import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type LocationType = {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  type?: 'hospital' | 'station';
};

// Important locations in Bangalore
export const bangaloreLocations = {
  hospitals: [
    {
      name: 'Manipal Hospital Old Airport Road',
      address: 'Old Airport Road, Bengaluru, Karnataka 560017',
      latitude: 12.9583,
      longitude: 77.6408,
      type: 'hospital'
    },
    {
      name: 'Victoria Hospital',
      address: 'Fort Road, Near City Market, Bengaluru',
      latitude: 12.9647,
      longitude: 77.5742,
      type: 'hospital'
    },
    {
      name: 'Baptist Hospital',
      address: 'Bellary Road, Hebbal, Bengaluru',
      latitude: 13.0374,
      longitude: 77.5939,
      type: 'hospital'
    },
    {
      name: 'Columbia Asia Hospital Whitefield',
      address: 'Whitefield, Bengaluru',
      latitude: 12.9698,
      longitude: 77.7500,
      type: 'hospital'
    }
  ],
  stations: [
    {
      name: 'Bangalore City Fire Station',
      address: 'Residency Road, Bengaluru',
      latitude: 12.9716,
      longitude: 77.6019,
      type: 'station'
    },
    {
      name: 'Jayanagar Fire Station',
      address: '9th Block, Jayanagar, Bengaluru',
      latitude: 12.9252,
      longitude: 77.5938,
      type: 'station'
    },
    {
      name: 'Hebbal Fire Station',
      address: 'Hebbal, Bengaluru',
      latitude: 13.0355,
      longitude: 77.5939,
      type: 'station'
    }
  ]
};

export function useLocation() {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      setIsLoading(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      // Get the address if not on web
      if (Platform.OS !== 'web') {
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (addressResponse && addressResponse.length > 0) {
          const address = addressResponse[0];
          const formattedAddress = [
            address.name,
            address.street,
            address.city,
            address.region,
            address.postalCode,
            address.country
          ].filter(Boolean).join(', ');
          
          setLocation(prev => prev ? {...prev, address: formattedAddress} : null);
        }
      }
    } catch (err) {
      setErrorMsg('Could not get your location');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<LocationType | null> => {
    try {
      setIsLoading(true);
      const locations = await Location.geocodeAsync(address);
      
      if (locations && locations.length > 0) {
        return {
          latitude: locations[0].latitude,
          longitude: locations[0].longitude,
          address
        };
      }
      setErrorMsg('Could not find location for this address');
      return null;
    } catch (err) {
      setErrorMsg('Error geocoding address');
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Search through predefined locations
  const searchPredefinedLocations = (searchText: string): LocationType[] => {
    const normalizedSearch = searchText.toLowerCase();
    const results: LocationType[] = [];
    
    // Search through hospitals
    bangaloreLocations.hospitals.forEach(hospital => {
      if (
        hospital.name.toLowerCase().includes(normalizedSearch) ||
        hospital.address.toLowerCase().includes(normalizedSearch)
      ) {
        results.push(hospital);
      }
    });
    
    // Search through stations
    bangaloreLocations.stations.forEach(station => {
      if (
        station.name.toLowerCase().includes(normalizedSearch) ||
        station.address.toLowerCase().includes(normalizedSearch)
      ) {
        results.push(station);
      }
    });
    
    return results;
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  return { 
    location, 
    errorMsg, 
    isLoading, 
    requestPermissions, 
    geocodeAddress,
    searchPredefinedLocations
  };
}