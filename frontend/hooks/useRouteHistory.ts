import { useState, useEffect } from 'react';
import { LocationType } from './useLocation';
import { RouteType } from './useRoutes';

export type RouteHistoryItem = {
  id: string;
  source: LocationType;
  destination: LocationType;
  timestamp: number;
  isEmergency: boolean;
  route?: RouteType;
};

export function useRouteHistory() {
  const [history, setHistory] = useState<RouteHistoryItem[]>([]);
  
  // On a real app, this would fetch from AsyncStorage or a database
  useEffect(() => {
    // Mock data for demonstration
    const mockHistory: RouteHistoryItem[] = [
      {
        id: '1',
        source: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'San Francisco General Hospital'
        },
        destination: {
          latitude: 37.7694,
          longitude: -122.4862,
          address: 'UCSF Medical Center'
        },
        timestamp: Date.now() - 86400000, // 1 day ago
        isEmergency: true
      },
      {
        id: '2',
        source: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'San Francisco General Hospital'
        },
        destination: {
          latitude: 37.3352,
          longitude: -121.8811,
          address: 'Regional Medical Center'
        },
        timestamp: Date.now() - 172800000, // 2 days ago
        isEmergency: false
      }
    ];
    
    setHistory(mockHistory);
  }, []);
  
  const addRouteToHistory = (
    source: LocationType,
    destination: LocationType,
    isEmergency: boolean,
    route?: RouteType
  ) => {
    const newRoute: RouteHistoryItem = {
      id: Date.now().toString(),
      source,
      destination,
      timestamp: Date.now(),
      isEmergency,
      route
    };
    
    setHistory(prev => [newRoute, ...prev]);
  };
  
  return {
    history,
    addRouteToHistory
  };
}