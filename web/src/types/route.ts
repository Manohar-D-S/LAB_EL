
export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp?: string;
}

export interface Route {
  id?: string;
  name?: string;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  waypoints?: RoutePoint[];
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  duration?: number; // in seconds
  distance?: number; // in kilometers
  time_mins?: number;
  createdAt?: string;
  path: { lat: number; lng: number }[]; // Array of coordinates representing the route
}

export interface AlgorithmResult {
  algorithm: string;
  time: number;
  nodes: number;
  distance: number;
  route?: [number, number][];
}