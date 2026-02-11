import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  {
    path: '/swipe',
    label: 'Swipe',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 8l-4 8-4-8" />
      </svg>
    ),
  },
  {
    path: '/search',
    label: 'Search',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    path: '/shortlist',
    label: 'Saved',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#2563eb' : 'none'} stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              minWidth: 64,
            }}
          >
            {tab.icon(isActive)}
            <span
              style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#2563eb' : '#6b7280',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
