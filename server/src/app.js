import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/healthRoutes.js';
import { folderRouter } from './routes/folderRoutes.js';
import { searchRouter } from './routes/searchRoutes.js';
import { documentRouter } from './routes/documentRoutes.js';
import { askRouter } from './routes/askRoutes.js';
import { settingsRouter } from './routes/settingsRoutes.js';

import { localhostOriginGuard } from './middleware/security.js';

export const app = express();

// Security: Enforce local-only request origin protection
app.use(localhostOriginGuard);

// Security: standard CORS middleware restricted to local clients
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or localhost origins
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS local privacy policy'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging (sanitized, zero document body logging for privacy)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
  }
  next();
});

// Mount API routes
app.use('/api/health', healthRouter);
app.use('/api/folders', folderRouter);
app.use('/api/search', searchRouter);
app.use('/api/documents', documentRouter);
app.use('/api/ask', askRouter);
app.use('/api/settings', settingsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'FileSense Local API',
    tagline: 'Your files. Your computer. Your search. Your privacy.',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[AppError]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});
