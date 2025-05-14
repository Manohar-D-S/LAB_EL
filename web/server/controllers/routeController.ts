import { Router } from 'express';
import { getRoutes, getRouteById, createRoute } from '../services/routeService.js';

const router = Router();

// Get all routes
router.get('/', async (req, res) => {
  try {
    const routes = await getRoutes();
    res.status(200).json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ message: 'Failed to fetch routes' });
  }
});

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const route = await getRouteById(id);
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    res.status(200).json(route);
  } catch (error) {
    console.error(`Error fetching route ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to fetch route' });
  }
});

// Create new route
router.post('/', async (req, res) => {
  try {
    const routeData = req.body;
    const newRoute = await createRoute(routeData);
    res.status(201).json(newRoute);
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ message: 'Failed to create route' });
  }
});

export const routeController = router;