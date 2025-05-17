import { useState } from 'react';
import { LocationType } from './useLocation';

export type RouteStep = {
  instruction: string;
  distance: string;
  duration: string;
};

export type RouteType = {
  distance: string;
  duration: string;
  steps: RouteStep[];
  polyline: [number, number][];
};

// Mock API service for demo purposes
export function useRoutes() {
  const [route, setRoute] = useState<RouteType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = async (
    source: LocationType,
    destination: LocationType,
    isEmergency: boolean = false
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll return mock data after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock response based on the actual locations
      const mockRoute: RouteType = {
        distance: '8.5 km',
        duration: '12 mins',
        steps: [
          {
            instruction: 'Start at your current location',
            distance: '0 m',
            duration: '0 min',
          },
          {
            instruction: 'Turn right onto Main Street',
            distance: '2.3 km',
            duration: '4 min',
          },
          {
            instruction: 'Continue straight onto Highway 1',
            distance: '3.7 km',
            duration: '5 min',
          },
          {
            instruction: 'Take exit 24 toward City Center',
            distance: '1.2 km',
            duration: '2 min',
          },
          {
            instruction: 'Turn left onto Hospital Road',
            distance: '1.3 km',
            duration: '1 min',
          },
          {
            instruction: 'Arrive at your destination',
            distance: '0 m',
            duration: '0 min',
          },
        ],
        // Create a route line between the two points with some variations
        polyline: generateMockPolyline(source, destination),
      };

      // If emergency, reduce the duration
      if (isEmergency) {
        mockRoute.duration = '8 mins'; // Faster route for emergency
      }

      setRoute(mockRoute);
    } catch (err) {
      console.error('Error fetching route:', err);
      setError('Failed to fetch route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    route, 
    isLoading, 
    error, 
    fetchRoute 
  };
}

// Helper function to generate mock route polyline
function generateMockPolyline(
  source: LocationType,
  destination: LocationType
): [number, number][] {
  const result: [number, number][] = [];
  const steps = 10; // Number of points in our line
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    
    // Linear interpolation between source and destination
    const lat = source.latitude + (destination.latitude - source.latitude) * ratio;
    const lng = source.longitude + (destination.longitude - source.longitude) * ratio;
    
    // Add some random variation to make it look like a real route
    // except for the first and last points
    const jitter = (i !== 0 && i !== steps) ? (Math.random() - 0.5) * 0.005 : 0;
    
    result.push([lat + jitter, lng + jitter]);
  }
  
  return result;
}