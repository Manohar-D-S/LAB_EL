import axios from 'axios';
import { Route } from '../types/route';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getRoutes = async (): Promise<Route[]> => {
  const response = await api.get('/routes');
  return response.data;
};

export const getRouteById = async (id: string): Promise<Route> => {
  const response = await api.get(`/routes/${id}`);
  return response.data;
};

export const createRoute = async (routeData: Omit<Route, 'id' | 'createdAt'>): Promise<Route> => {
  const response = await api.post('/routes', routeData);
  return response.data;
};