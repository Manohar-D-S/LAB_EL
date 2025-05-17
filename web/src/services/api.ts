import axios from 'axios';
import { Route } from '../types/route';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getRoutes = async (): Promise<Route[]> => {
  try {
    console.log('Fetching routes from:', `${API_URL}/routes`);
    const response = await api.get('/routes');
    console.log('Routes response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

export const getRouteById = async (id: string): Promise<Route> => {
  const response = await api.get(`/routes/${id}`);
  return response.data;
};

export const createRoute = async (routeData: Omit<Route, 'id' | 'createdAt'>): Promise<Route> => {
  const response = await api.post('/routes', routeData);
  return response.data;
};