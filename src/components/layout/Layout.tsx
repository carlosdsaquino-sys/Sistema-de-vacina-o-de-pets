import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, actions, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} title={title} actions={actions} />
        <main className="flex-1 p-4 lg:p-6 bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
