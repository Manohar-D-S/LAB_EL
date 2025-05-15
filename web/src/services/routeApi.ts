import axios from 'axios';

interface RouteResponse {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    distance: number;
    duration: number;
  };
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
      `${API_BASE_URL}/api/v1/routes`, // Changed URL
      { // Added request body
        source_lat: startLat,
        source_lng: startLng,
        dest_lat: endLat,
        dest_lng: endLng
      }
    );

    if (!response.data || !response.data.geometry) {
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