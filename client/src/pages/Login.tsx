import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validação
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password: string) => {
    return password.length >= 6;
  };

  const isFormValid = () => {
    if (isLogin) {
      return isValidEmail(email) && isValidPassword(password);
    } else {
      return isValidEmail(email) && isValidPassword(password) && name.length >= 2;
    }
  };

  // Login mutation
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      setError(error.message || "Erro ao fazer login");
    },
  });

  // Register mutation
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      setError(error.message || "Erro ao registrar");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isFormValid()) {
      setError(
        isLogin
          ? "Email e senha são obrigatórios"
          : "Preencha todos os campos corretamente"
      );
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await loginMutation.mutateAsync({
          email,
          password,
        });
      } else {
        await registerMutation.mutateAsync({
          email,
          password,
          name,
        });
      }
    } catch (err) {
      // Erro já é tratado no onError do mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Entrar" : "Criar Conta"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Faça login com suas credenciais"
              : "Crie uma nova conta para começar"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome - apenas no registro */}
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  minLength={2}
                />
                {name && name.length < 2 && (
                  <p className="text-xs text-red-500">
                    Nome deve ter pelo menos 2 caracteres
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              {email && !isValidEmail(email) && (
                <p className="text-xs text-red-500">Email inválido</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                minLength={6}
              />
              {password && !isValidPassword(password) && (
                <p className="text-xs text-red-500">
                  Senha deve ter pelo menos 6 caracteres
                </p>
              )}
            </div>

            {/* Erro */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Botão Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid() || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Entrar" : "Registrar"}
            </Button>

            {/* Toggle entre login e registro */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Não tem conta? " : "Já tem conta? "}
              </span>
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Registre-se" : "Faça login"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
