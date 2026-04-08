import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './db/schema';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import machineRoutes from './routes/machines.routes';
import productRoutes from './routes/products.routes';
import productMapRoutes from './routes/productMaps.routes';
import warehouseRoutes from './routes/warehouses.routes';
import transferRoutes from './routes/transfers.routes';
import loadingRoutes from './routes/loadings.routes';
import countRoutes from './routes/counts.routes';
import routeRoutes from './routes/routes.routes';
import reportRoutes from './routes/reports.routes';
import firmRoutes from './routes/firms.routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Veritabanı başlat
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-maps', productMapRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/loadings', loadingRoutes);
app.use('/api/counts', countRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/firms', firmRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production: Serve frontend build
const frontendPath = path.join(__dirname, '../../web/dist');
app.use(express.static(frontendPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Efe Otomat API sunucusu ${PORT} portunda çalışıyor`);
});

export default app;
