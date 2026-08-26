import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PawPrint, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function AuthPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast(error, 'error');
        return;
      }

      toast('Bem-vindo ao VetFarm!', 'success');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30 p-4">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-200/20 dark:bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-black/30 border border-gray-200/50 dark:border-slate-800 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.1,
                type: 'spring',
                stiffness: 200,
              }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 dark:shadow-emerald-500/20"
            >
              <PawPrint className="w-7 h-7" />
            </motion.div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              VetFarm
            </h1>

            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Gestão de Vacinação Veterinária
            </p>
          </div>

          {/* Formulário de login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@vetfarm.com"
              icon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
              minLength={6}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Entrar no sistema'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-500">
            Acesso restrito a funcionários autorizados
          </p>
        </div>
      </motion.div>
    </div>
  );
}