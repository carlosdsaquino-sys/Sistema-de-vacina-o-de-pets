import {
  lazy,
  Suspense,
  type ReactNode,
} from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth,
} from '@/contexts/AuthContext';

import { ToastProvider } from '@/contexts/ToastContext';

// =========================================================
// LAZY LOAD DAS PÁGINAS
// =========================================================

const AuthPage = lazy(() =>
  import('@/pages/AuthPage').then(
    (module) => ({
      default: module.AuthPage,
    })
  )
);

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then(
    (module) => ({
      default: module.DashboardPage,
    })
  )
);

const TutorsPage = lazy(() =>
  import('@/pages/TutorsPage').then(
    (module) => ({
      default: module.TutorsPage,
    })
  )
);

const PetsPage = lazy(() =>
  import('@/pages/PetsPage').then(
    (module) => ({
      default: module.PetsPage,
    })
  )
);

const VaccinesPage = lazy(() =>
  import('@/pages/VaccinesPage').then(
    (module) => ({
      default: module.VaccinesPage,
    })
  )
);

const StockPage = lazy(() =>
  import('@/pages/StockPage').then(
    (module) => ({
      default: module.StockPage,
    })
  )
);

const AppointmentsPage = lazy(() =>
  import('@/pages/AppointmentsPage').then(
    (module) => ({
      default:
        module.AppointmentsPage,
    })
  )
);

const NewAppointmentPage = lazy(() =>
  import('@/pages/NewAppointmentPage').then(
    (module) => ({
      default:
        module.NewAppointmentPage,
    })
  )
);

const ApplicationsPage = lazy(() =>
  import('@/pages/ApplicationsPage').then(
    (module) => ({
      default:
        module.ApplicationsPage,
    })
  )
);

const BookletPage = lazy(() =>
  import('@/pages/BookletPage').then(
    (module) => ({
      default: module.BookletPage,
    })
  )
);

const MessagesPage = lazy(() =>
  import('@/pages/MessagesPage').then(
    (module) => ({
      default: module.MessagesPage,
    })
  )
);

const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then(
    (module) => ({
      default: module.ReportsPage,
    })
  )
);

const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then(
    (module) => ({
      default: module.SettingsPage,
    })
  )
);

const ValidationPage = lazy(() =>
  import('@/pages/ValidationPage').then(
    (module) => ({
      default: module.ValidationPage,
    })
  )
);

// =========================================================
// LOADING DAS PÁGINAS
// =========================================================

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">

      <div className="flex flex-col items-center gap-3">

        <div className="h-12 w-12 rounded-xl bg-emerald-600 animate-pulse" />

        <p className="text-sm text-gray-500 dark:text-slate-400">
          Carregando...
        </p>

      </div>

    </div>
  );
}

// =========================================================
// ROTA PROTEGIDA
// =========================================================

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const {
    session,
    loading,
  } = useAuth();

  const location =
    useLocation();

  if (loading) {
    return (
      <PageLoader />
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return <>{children}</>;
}

// =========================================================
// ROTAS
// =========================================================

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <PageLoader />
      }
    >
      <Routes>

        {/* ================================================= */}
        {/* LOGIN */}
        {/* ================================================= */}

        <Route
          path="/"
          element={
            <AuthPage />
          }
        />

        {/* ================================================= */}
        {/* PÚBLICO */}
        {/* ================================================= */}

        <Route
          path="/validar/:code"
          element={
            <ValidationPage />
          }
        />

        {/* ================================================= */}
        {/* DASHBOARD */}
        {/* ================================================= */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* AGENDA */}
        {/* ================================================= */}

        <Route
          path="/agenda"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* NOVO AGENDAMENTO */}
        {/* ================================================= */}

        <Route
          path="/novo-agendamento"
          element={
            <ProtectedRoute>
              <NewAppointmentPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* TUTORES */}
        {/* ================================================= */}

        <Route
          path="/tutores"
          element={
            <ProtectedRoute>
              <TutorsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* PETS */}
        {/* ================================================= */}

        <Route
          path="/pets"
          element={
            <ProtectedRoute>
              <PetsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* VACINAS */}
        {/* ================================================= */}

        <Route
          path="/vacinas"
          element={
            <ProtectedRoute>
              <VaccinesPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* ESTOQUE */}
        {/* ================================================= */}

        <Route
          path="/estoque"
          element={
            <ProtectedRoute>
              <StockPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* APLICAÇÕES */}
        {/* ================================================= */}

        <Route
          path="/aplicacoes"
          element={
            <ProtectedRoute>
              <ApplicationsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* CADERNETA */}
        {/* ================================================= */}

        <Route
          path="/caderneta"
          element={
            <ProtectedRoute>
              <BookletPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* CENTRAL DE MENSAGENS */}
        {/* ================================================= */}

        <Route
          path="/mensagens"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* RELATÓRIOS */}
        {/* ================================================= */}

        <Route
          path="/relatorios"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* CONFIGURAÇÕES */}
        {/* ================================================= */}

        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* ROTA INVÁLIDA */}
        {/* ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </Suspense>
  );
}

// =========================================================
// APP
// =========================================================

function App() {
  return (
    <BrowserRouter>

      <ToastProvider>

        <AuthProvider>

          <AppRoutes />

        </AuthProvider>

      </ToastProvider>

    </BrowserRouter>
  );
}

export default App;