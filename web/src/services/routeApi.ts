import axios from 'axios';

const esp32_ip = "192.168.43.53";

interface RouteResponse {
  path: [number, number][];
  distance: number;  // in kilometers
  duration: number;  // in minutes
  road_types: Record<string, number>;  // road type distribution in meters
  visualization_url?: string;  // optional URL to visualization
}

const API_BASE_URL = 'http://localhost:8000';

/**
 * Fetches a route between two points
 * @param startLat Starting point latitude
 * @param startLng Starting point longitude
 * @param endLat Destination latitude
 * @param endLng Destination longitude
 * @returns GeoJSON route data
 * @throws Error if the request fails
 */
export async function getRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResponse> {
  try {
    const response = await axios.post<RouteResponse>( // Changed to POST
      // `${API_BASE_URL}/api/v1/routes`, // Changed URL
      `${API_BASE_URL}/routes`,
      { // Added request body
        source_lat: startLat,
        source_lng: startLng,
        dest_lat: endLat,
        dest_lng: endLng
      }
    );

    if (!response.data || !response.data.path) {
      throw new Error('Invalid route data received');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Route calculation failed: ${error.response.data.message || 'Server error'}`);
      } else if (error.request) {
        throw new Error('Could not reach routing server. Please check your connection.');
      }
      throw new Error('Failed to calculate route. Please try again.');
    }
    
    throw error;
  }
}

/**
 * Calculates the bearing (degrees) from point1 to point2.
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  const dLon = toRad(lng2 - lng1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

/**
 * Maps a bearing (degrees) to N/E/S/W.
 */
export function bearingToDirection(bearing: number): 'N' | 'E' | 'S' | 'W' {
  if (bearing >= 45 && bearing < 135) return 'E';
  if (bearing >= 135 && bearing < 225) return 'S';
  if (bearing >= 225 && bearing < 315) return 'W';
  return 'N';
}

/**
 * Notifies ESP32 when ambulance is within proximity.
 * @param positions Array of recent ambulance positions (at least 2)
 * @param jn_name Junction name
 * @param esp32_ip ESP32 IP address
 */
export async function notifyEsp32Proximity(
  jn_name: string,
  direction: string
): Promise<void> {
  const payload = { direction, jn_name };
  await fetch(`http://${esp32_ip}/proximity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export const notifyEsp32SetNormal = async (signalName: string, esp32Ip: string) => {
  return axios.post(`http://${esp32Ip}/setNormal`, {
    signal: signalName
  });
};