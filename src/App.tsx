import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TutorsPage } from '@/pages/TutorsPage';
import { PetsPage } from '@/pages/PetsPage';
import { VaccinesPage } from '@/pages/VaccinesPage';
import { StockPage } from '@/pages/StockPage';
import { AppointmentsPage } from '@/pages/AppointmentsPage';
import { NewAppointmentPage } from '@/pages/NewAppointmentPage';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { BookletPage } from '@/pages/BookletPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ValidationPage } from '@/pages/ValidationPage';

// =========================================================
// ROTA PROTEGIDA
// =========================================================

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-pulse">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 mx-auto" />
        </div>
      </div>
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
    <Routes>
      {/* LOGIN */}
      <Route
        path="/"
        element={<AuthPage />}
      />

      {/* PÚBLICO */}
      <Route
        path="/validar/:code"
        element={<ValidationPage />}
      />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* AGENDA */}
      <Route
        path="/agenda"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />

      {/* NOVO AGENDAMENTO */}
      <Route
        path="/novo-agendamento"
        element={
          <ProtectedRoute>
            <NewAppointmentPage />
          </ProtectedRoute>
        }
      />

      {/* TUTORES */}
      <Route
        path="/tutores"
        element={
          <ProtectedRoute>
            <TutorsPage />
          </ProtectedRoute>
        }
      />

      {/* PETS */}
      <Route
        path="/pets"
        element={
          <ProtectedRoute>
            <PetsPage />
          </ProtectedRoute>
        }
      />

      {/* VACINAS */}
      <Route
        path="/vacinas"
        element={
          <ProtectedRoute>
            <VaccinesPage />
          </ProtectedRoute>
        }
      />

      {/* ESTOQUE */}
      <Route
        path="/estoque"
        element={
          <ProtectedRoute>
            <StockPage />
          </ProtectedRoute>
        }
      />

      {/* APLICAÇÕES */}
      <Route
        path="/aplicacoes"
        element={
          <ProtectedRoute>
            <ApplicationsPage />
          </ProtectedRoute>
        }
      />

      {/* CADERNETA */}
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

      {/* RELATÓRIOS */}
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* CONFIGURAÇÕES */}
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* QUALQUER ROTA INVÁLIDA */}
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