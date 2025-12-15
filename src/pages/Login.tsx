import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Archive, Mail, Lock, AlertCircle } from 'lucide-react';

export function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      const success = await login(formData.email, formData.password);
      if (!success) {
        setError('Usuário não encontrado ou senha incorreta');
      }
    } catch (err) {
      console.error('Erro durante login:', err);
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        {/* Small icon in top-left corner */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <img
              src="/Secontaf1.png"
              alt="Secontaf"
              className="w-6 h-6 object-cover"
            />
          </div>
          <span className="text-sm font-medium text-blue-500">Secontaf.com.br</span>
        </div>
        
        <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-42 h-42 flex items-center justify-center">
              <div className="w-38 h-38 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg">
                <img
                  src="/logo shelter.jpeg"
                  alt="Secontaf Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shelter-Cronograma</h1>
              <p className="text-gray-600 mt-2">,Sistema Integrado de Gestão de Materiais e Agendamentos</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                name="email"
                label="Nome"
                placeholder="Digite seu login"
                value={formData.email}
                onChange={handleChange}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                type="password"
                name="password"
                label="Senha"
                placeholder="Digite sua senha (opcional)"
                value={formData.password}
                onChange={handleChange}
                icon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                className="w-full"
                loading={isLoggingIn}
                disabled={!formData.email}
              >
                Entrar
              </Button>
            </form>

          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
