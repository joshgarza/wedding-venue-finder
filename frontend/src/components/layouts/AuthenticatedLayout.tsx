import { Outlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';

export function AuthenticatedLayout() {
  return (
    <div style={{ paddingBottom: 72 }}>
      <Outlet />
      <BottomTabBar />
    </div>
  );
}
