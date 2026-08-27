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
  Menu,
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

// =========================================================
// PROPS
// =========================================================

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;

  desktopCollapsed?: boolean;
  onToggleDesktop?: () => void;
}

// =========================================================
// SIDEBAR
// =========================================================

export function Sidebar({
  mobileOpen,
  onClose,
  desktopCollapsed = false,
  onToggleDesktop,
}: SidebarProps) {
  return (
    <>
      {/* =================================================== */}
      {/* DESKTOP */}
      {/* =================================================== */}

      <motion.aside
        initial={false}
        animate={{
          width: desktopCollapsed
            ? 72
            : 256,
        }}
        transition={{
          duration: 0.22,
          ease: 'easeInOut',
        }}
        className="
          hidden
          lg:flex
          flex-col
          shrink-0
          border-r
          border-gray-200
          dark:border-slate-800
          bg-white
          dark:bg-slate-900
          h-screen
          sticky
          top-0
          z-40
        "
      >
        <SidebarContent
          collapsed={
            desktopCollapsed
          }
          onToggleDesktop={
            onToggleDesktop
          }
        />
      </motion.aside>

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
              className="
                fixed
                inset-0
                z-50
                bg-gray-900/50
                dark:bg-black/70
                backdrop-blur-sm
                lg:hidden
              "
              onClick={
                onClose
              }
            />

            {/* Sidebar mobile */}

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
              className="
                fixed
                left-0
                top-0
                z-50
                flex
                h-full
                w-72
                flex-col
                bg-white
                dark:bg-slate-900
                border-r
                border-gray-200
                dark:border-slate-800
                shadow-2xl
                lg:hidden
              "
            >
              {/* Cabeçalho mobile */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  px-5
                  py-4
                  border-b
                  border-gray-100
                  dark:border-slate-800
                "
              >
                <Logo />

                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  aria-label="Fechar menu"
                  title="Fechar menu"
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    text-gray-500
                    dark:text-slate-400
                    hover:bg-gray-100
                    dark:hover:bg-slate-800
                    hover:text-gray-700
                    dark:hover:text-white
                    transition
                  "
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              <SidebarContent
                onNavigate={
                  onClose
                }
                mobile
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

      <div
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          bg-emerald-600
          text-white
          shadow-sm
          shadow-emerald-600/30
          shrink-0
        "
      >
        <PawPrint className="w-5 h-5" />
      </div>

      <span
        className="
          text-lg
          font-bold
          text-gray-900
          dark:text-white
          tracking-tight
          whitespace-nowrap
        "
      >
        VetFarm
      </span>

    </div>
  );
}

// =========================================================
// CONTEÚDO
// =========================================================

function SidebarContent({
  onNavigate,
  onToggleDesktop,
  collapsed = false,
  mobile = false,
}: {
  onNavigate?: () => void;
  onToggleDesktop?: () => void;
  collapsed?: boolean;
  mobile?: boolean;
}) {
  return (
    <>
      {/* =================================================== */}
      {/* HEADER DESKTOP */}
      {/* =================================================== */}

      {!mobile && (
        <div
          className={cn(
            'flex h-[73px] items-center border-b border-gray-100 dark:border-slate-800 transition-all',

            collapsed
              ? 'justify-center px-2'
              : 'justify-between px-5'
          )}
        >
          {!collapsed && (
            <Logo />
          )}

          <button
            type="button"
            onClick={
              onToggleDesktop
            }
            aria-label={
              collapsed
                ? 'Expandir menu lateral'
                : 'Recolher menu lateral'
            }
            title={
              collapsed
                ? 'Expandir menu'
                : 'Recolher menu'
            }
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-gray-500
              dark:text-slate-400
              hover:bg-gray-100
              dark:hover:bg-slate-800
              hover:text-emerald-600
              dark:hover:text-emerald-400
              transition
            "
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* =================================================== */}
      {/* NAVEGAÇÃO */}
      {/* =================================================== */}

      <nav
        className={cn(
          'flex-1 py-4 space-y-1',

          collapsed && !mobile
            ? 'px-2'
            : 'px-3'
        )}
      >
        {navItems.map(
          (item) => (
            <NavLink
              key={
                item.to
              }
              to={
                item.to
              }
              onClick={
                onNavigate
              }

              // Tooltip nativo quando recolhida
              title={
                collapsed &&
                !mobile
                  ? item.label
                  : undefined
              }

              className={({
                isActive,
              }) =>
                cn(
                  `
                    group
                    relative
                    flex
                    items-center
                    rounded-lg
                    py-2.5
                    text-sm
                    font-medium
                    transition-all
                    duration-200
                  `,

                  collapsed &&
                    !mobile
                    ? 'justify-center px-0'
                    : 'gap-3 px-3',

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

                  {/* Nome normal */}

                  {(!collapsed ||
                    mobile) && (
                    <span className="whitespace-nowrap">
                      {
                        item.label
                      }
                    </span>
                  )}

                  {/* Tooltip bonito */}

                  {collapsed &&
                    !mobile && (
                      <span
                        className="
                          pointer-events-none
                          absolute
                          left-full
                          ml-3
                          z-[100]
                          whitespace-nowrap
                          rounded-lg
                          bg-slate-900
                          dark:bg-white
                          px-2.5
                          py-1.5
                          text-xs
                          font-medium
                          text-white
                          dark:text-slate-900
                          opacity-0
                          translate-x-1
                          shadow-lg
                          transition-all
                          duration-150
                          group-hover:opacity-100
                          group-hover:translate-x-0
                        "
                      >
                        {
                          item.label
                        }

                        {/* Setinha */}

                        <span
                          className="
                            absolute
                            right-full
                            top-1/2
                            -translate-y-1/2
                            border-4
                            border-transparent
                            border-r-slate-900
                            dark:border-r-white
                          "
                        />
                      </span>
                    )}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* =================================================== */}
      {/* RODAPÉ */}
      {/* =================================================== */}

      {!collapsed ||
      mobile ? (
        <div
          className="
            px-3
            py-4
            border-t
            border-gray-100
            dark:border-slate-800
          "
        >
          <div
            className="
              rounded-lg
              bg-emerald-50
              dark:bg-emerald-950/40
              px-3
              py-3
              text-center
            "
          >
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              VetFarm v1.0
            </p>

            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
              Gestão Veterinária
            </p>
          </div>
        </div>
      ) : (
        <div
          className="
            flex
            justify-center
            py-4
            border-t
            border-gray-100
            dark:border-slate-800
          "
        >
          <div
            title="VetFarm v1.0"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              bg-emerald-50
              dark:bg-emerald-950/40
              text-emerald-600
              dark:text-emerald-400
            "
          >
            <PawPrint className="w-4 h-4" />
          </div>
        </div>
      )}
    </>
  );
}