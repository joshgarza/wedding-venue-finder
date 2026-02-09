import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);

// TODO: Add other routes as they are implemented
// import venuesRoutes from './venues.routes';
// import swipesRoutes from './swipes.routes';
// import tasteProfileRoutes from './taste-profile.routes';

// router.use('/venues', venuesRoutes);
// router.use('/swipes', swipesRoutes);
// router.use('/taste-profile', tasteProfileRoutes);

export default router;
