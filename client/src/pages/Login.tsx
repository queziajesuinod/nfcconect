import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Nfc } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Validação
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password: string) => password.length >= 6;

  const isFormValid = () => {
    return isValidEmail(email) && isValidPassword(password);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isFormValid()) {
      setError("Email ou senha inválidos");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Link href="/">
            <div className="w-16 h-16 bg-black flex items-center justify-center cursor-pointer hover:bg-gray-900 transition-colors">
              <Nfc className="w-10 h-10 text-white" />
            </div>
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase tracking-tight">NFC//SYS</h1>
            <p className="text-gray-600 mt-2">Sistema de Gerenciamento</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-4 border-black rounded-none brutal-shadow">
          <CardHeader className="border-b-4 border-black pb-6">
            <CardTitle className="text-2xl uppercase font-black">Login</CardTitle>
            <CardDescription className="text-base mt-2">
              Acesse o painel administrativo
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={loginMutation.isPending}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">
                  Senha
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={loginMutation.isPending}
                />
              </div>

              {/* Error Alert */}
              {error && (
                <Alert className="border-2 border-red-500 bg-red-50 rounded-none">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-600 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid() || loginMutation.isPending}
                className="w-full h-12 text-base font-bold uppercase brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Voltar para{" "}
                <Link href="/">
                  <span className="font-bold text-black hover:underline cursor-pointer">
                    home
                  </span>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
