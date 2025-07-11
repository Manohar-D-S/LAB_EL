export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp?: string;
}

export interface Route {
  id: string;
  name: string;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  waypoints: RoutePoint[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  duration: number; // in seconds
  distance: number; // in kilometers
  createdAt: string;
}