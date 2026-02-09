import { Router } from 'express';
import authRoutes from './auth.routes';
import swipesRoutes from './swipes.routes';
import tasteProfileRoutes from './taste-profile.routes';
import venuesRoutes from './venues.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/swipes', swipesRoutes);
router.use('/taste-profile', tasteProfileRoutes);
router.use('/venues', venuesRoutes);

export default router;
