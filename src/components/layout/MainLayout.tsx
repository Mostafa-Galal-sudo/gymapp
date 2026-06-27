import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Salad, User, Accessibility, CalendarDays } from 'lucide-react';
import styles from './MainLayout.module.css';
import { useT } from '../../hooks/useT';
import AmbientBackground from '../AmbientBackground';

const MainLayout = () => {
  const t = useT();
  const NAV = [
    { to: '/dashboard', labelKey: 'nav.dashboard', Icon: LayoutDashboard },
    { to: '/workout',   labelKey: 'nav.workout',   Icon: Dumbbell },
    { to: '/calendar',  labelKey: 'nav.calendar',  Icon: CalendarDays },
    { to: '/muscles',   labelKey: 'nav.muscles',   Icon: Accessibility },
    { to: '/nutrition', labelKey: 'nav.nutrition', Icon: Salad },
    { to: '/profile',   labelKey: 'nav.profile',   Icon: User },
  ] as const;

  return (
    <div className={styles.layout}>
      <AmbientBackground />
      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.nav}>
        {NAV.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>
              <Icon size={22} strokeWidth={2} />
            </span>
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default MainLayout;
