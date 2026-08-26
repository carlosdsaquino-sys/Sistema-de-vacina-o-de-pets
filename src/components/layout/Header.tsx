import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  LogOut,
  UserCircle,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  actions?: ReactNode;
}

export function Header({ onMenuClick, title, actions }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/95 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {actions}

        {/* Botão de tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-gray-600" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </Button>

        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
          <UserCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">
            {profile?.nome || 'Admin'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
          title="Sair"
        >
          <LogOut className="w-5 h-5 text-gray-500" />
        </Button>
      </div>
    </header>
  );
}