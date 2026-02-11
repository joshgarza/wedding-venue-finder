import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Swipe from './pages/Swipe';
import Search from './pages/Search';
import Shortlist from './pages/Shortlist';
import Profile from './pages/Profile';
import VenueDetail from './pages/VenueDetail';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthenticatedLayout } from './components/layouts/AuthenticatedLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AuthenticatedLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/swipe',
        element: <Swipe />,
      },
      {
        path: '/search',
        element: <Search />,
      },
      {
        path: '/shortlist',
        element: <Shortlist />,
      },
      {
        path: '/profile',
        element: <Profile />,
      },
      {
        path: '/venues/:id',
        element: <VenueDetail />,
      },
    ],
  },
]);

export default router;
