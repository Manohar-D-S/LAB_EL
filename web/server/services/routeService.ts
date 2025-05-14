import { Route, RoutePoint } from '../types/route.js';

// Mock data - in a real app, this would come from a database
const mockRoutes: Route[] = [
  {
    id: '1',
    name: 'Hospital to Accident Site',
    startPoint: { lat: 40.7128, lng: -74.006 },
    endPoint: { lat: 40.7308, lng: -73.9975 },
    waypoints: [
      { lat: 40.7168, lng: -74.0046, timestamp: new Date().toISOString() },
      { lat: 40.7208, lng: -74.0036, timestamp: new Date().toISOString() },
      { lat: 40.7248, lng: -74.0026, timestamp: new Date().toISOString() },
      { lat: 40.7278, lng: -74.0000, timestamp: new Date().toISOString() }
    ],
    status: 'completed',
    duration: 720, // seconds
    distance: 2.4, // kilometers
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Emergency Response Route',
    startPoint: { lat: 40.7580, lng: -73.9855 },
    endPoint: { lat: 40.7488, lng: -73.9680 },
    waypoints: [
      { lat: 40.7560, lng: -73.9830, timestamp: new Date().toISOString() },
      { lat: 40.7540, lng: -73.9800, timestamp: new Date().toISOString() },
      { lat: 40.7520, lng: -73.9760, timestamp: new Date().toISOString() },
      { lat: 40.7500, lng: -73.9720, timestamp: new Date().toISOString() }
    ],
    status: 'in-progress',
    duration: 540, // seconds
    distance: 1.8, // kilometers
    createdAt: new Date().toISOString()
  }
];

// Get all routes
export const getRoutes = async (): Promise<Route[]> => {
  // In a real app, this would fetch from a database
  return mockRoutes;
};

// Get route by ID
export const getRouteById = async (id: string): Promise<Route | undefined> => {
  // In a real app, this would fetch from a database with the ID
  return mockRoutes.find(route => route.id === id);
};

// Create new route
export const createRoute = async (routeData: Omit<Route, 'id' | 'createdAt'>): Promise<Route> => {
  // In a real app, this would save to a database
  const newRoute: Route = {
    ...routeData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  
  mockRoutes.push(newRoute);
  return newRoute;
};