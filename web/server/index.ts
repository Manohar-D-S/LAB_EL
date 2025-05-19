import express from 'express';
import cors from 'cors';
import { routeController } from './controllers/routeController.js';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); 

// Routes
app.use('/api/routes', routeController);

// Log signal proximity events to file
app.post('/api/log-signal', (req, res) => {
  const { message } = req.body;
  if (typeof message === 'string') {
    // Ensure the directory exists
    const logPath = '/web/src/signals.log';
    fs.appendFile(logPath, message + '\n', (err) => {
      if (err) {
        console.error('Failed to write to signals.log:', err);
        return res.status(500).json({ error: 'Failed to write log' });
      }
      res.status(200).json({ status: 'logged' });
    });
  } else {
    res.status(400).json({ error: 'Invalid log message' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;