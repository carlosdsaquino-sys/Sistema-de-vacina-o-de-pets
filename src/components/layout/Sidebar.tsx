import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  LayoutDashboard,
  CalendarDays,
  CalendarPlus,
  Users,
  Dog,
  Syringe,
  Boxes,
  Stethoscope,
  BookOpen,
  MessageCircle,
  BarChart3,
  Settings,
  PawPrint,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/agenda',
    label: 'Agenda',
    icon: CalendarDays,
  },
  {
    to: '/novo-agendamento',
    label: 'Novo Agendamento',
    icon: CalendarPlus,
  },
  {
    to: '/tutores',
    label: 'Tutores',
    icon: Users,
  },
  {
    to: '/pets',
    label: 'Pets',
    icon: Dog,
  },
  {
    to: '/vacinas',
    label: 'Vacinas',
    icon: Syringe,
  },
  {
    to: '/estoque',
    label: 'Estoque',
    icon: Boxes,
  },
  {
    to: '/aplicacoes',
    label: 'Aplicações',
    icon: Stethoscope,
  },
  {
    to: '/caderneta',
    label: 'Caderneta Digital',
    icon: BookOpen,
  },

  // =========================================================
  // CENTRAL DE MENSAGENS
  // =========================================================
  {
    to: '/mensagens',
    label: 'Central de Mensagens',
    icon: MessageCircle,
  },

  {
    to: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
  },
  {
    to: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* =================================================== */}
      {/* DESKTOP */}
      {/* =================================================== */}

      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* =================================================== */}
      {/* MOBILE */}
      {/* =================================================== */}

      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />

            {/* Menu */}

            <motion.aside
              initial={{
                x: -300,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: -300,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shadow-2xl lg:hidden"
            >
              {/* Cabeçalho mobile */}

              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">

                <Logo />

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <SidebarContent
                onNavigate={onClose}
              />

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// =========================================================
// LOGO
// =========================================================

function Logo() {
  return (
    <div className="flex items-center gap-2.5">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">

        <PawPrint className="w-5 h-5" />

      </div>

      <div>

        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          VetFarm
        </span>

      </div>

    </div>
  );
}

// =========================================================
// CONTEÚDO DA SIDEBAR
// =========================================================

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* =================================================== */}
      {/* LOGO DESKTOP */}
      {/* =================================================== */}

      <div className="hidden lg:flex items-center px-5 py-5 border-b border-gray-100 dark:border-slate-800">

        <Logo />

      </div>

      {/* =================================================== */}
      {/* NAVEGAÇÃO */}
      {/* =================================================== */}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        {navItems.map(
          (item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({
                isActive,
              }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',

                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                )
              }
            >
              {({
                isActive,
              }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 shrink-0',

                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-slate-500'
                    )}
                  />

                  {item.label}
                </>
              )}
            </NavLink>
          )
        )}

      </nav>

      {/* =================================================== */}
      {/* RODAPÉ */}
      {/* =================================================== */}

      <div className="px-3 py-4 border-t border-gray-100 dark:border-slate-800">

        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-3 text-center">

          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            VetFarm v1.0
          </p>

          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
            Gestão Veterinária
          </p>

        </div>

      </div>
    </>
  );
}