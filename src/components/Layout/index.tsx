import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/divisions', label: 'Divisions' },
  { to: '/officers', label: 'Officers' },
  { to: '/schedules', label: 'Schedules' },
  { to: '/routes', label: 'Routes' },
  { to: '/configs', label: 'Configs' },
];

export default function Layout() {
  const { user, profile, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header-brand">Police Monitoring</span>
        <div className="app-header-right">
          <span className="app-header-user">
            {profile?.full_name ?? user?.email}&nbsp;&nbsp;<strong>{profile?.role}</strong>
          </span>
          <button onClick={logout} className="btn-logout">Sign out</button>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-sidebar">
          <span className="app-sidebar-label">Menu</span>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
