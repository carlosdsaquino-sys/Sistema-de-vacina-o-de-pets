import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Layout({
  title,
  actions,
  children,
}: LayoutProps) {
  // =========================================================
  // MOBILE
  // =========================================================

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  // =========================================================
  // DESKTOP
  // =========================================================

  const [
    desktopCollapsed,
    setDesktopCollapsed,
  ] = useState(() => {
    return (
      localStorage.getItem(
        'vetfarm-sidebar-collapsed'
      ) === 'true'
    );
  });

  // =========================================================
  // SALVAR PREFERÊNCIA
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      'vetfarm-sidebar-collapsed',
      String(
        desktopCollapsed
      )
    );
  }, [
    desktopCollapsed,
  ]);

  // =========================================================
  // TOGGLE
  // =========================================================

  const toggleDesktopSidebar =
    () => {
      setDesktopCollapsed(
        (current) =>
          !current
      );
    };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">

      {/* =================================================== */}
      {/* SIDEBAR */}
      {/* =================================================== */}

      <Sidebar
        mobileOpen={
          mobileOpen
        }
        onClose={() =>
          setMobileOpen(
            false
          )
        }
        desktopCollapsed={
          desktopCollapsed
        }
        onToggleDesktop={
          toggleDesktopSidebar
        }
      />

      {/* =================================================== */}
      {/* CONTEÚDO */}
      {/* =================================================== */}

      <div className="flex flex-1 flex-col min-w-0">

        <Header
          onMenuClick={() =>
            setMobileOpen(
              true
            )
          }
          title={
            title
          }
          actions={
            actions
          }
        />

        <main
          className="
            flex-1
            p-4
            lg:p-6
            bg-gray-50
            dark:bg-slate-950
            transition-colors
            duration-200
          "
        >
          <div className="mx-auto max-w-7xl">

            {
              children
            }

          </div>
        </main>

      </div>

    </div>
  );
}