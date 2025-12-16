import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SECRET_FROM_ENV = import.meta.env.VITE_REGISTRATION_SECRET ?? "";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secret, setSecret] = useState(SECRET_FROM_ENV);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const registrationMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setSuccess("Conta criada. Agora você já pode entrar.");
      setError("");
      setName("");
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      setSuccess("");
      setError(error.message || "Não foi possível registrar.");
    },
  });

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isFormValid = () => {
    return (
      name.trim().length >= 2 &&
      isValidEmail(email) &&
      password.length >= 8 &&
      password === confirmPassword &&
      secret.trim().length > 0
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isFormValid()) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    registrationMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      username: username.trim() || undefined,
      password,
      secret: secret.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-black flex items-center justify-center">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase tracking-tight">Registrar</h1>
            <p className="text-gray-600 mt-2">Crie o primeiro administrador com o código de registro</p>
          </div>
        </div>

        <Card className="border-4 border-black rounded-none brutal-shadow">
          <CardHeader className="border-b-4 border-black pb-6">
            <CardTitle className="text-2xl uppercase font-black">Registrar Administrador</CardTitle>
            <CardDescription className="text-base mt-2">
              Informe os dados e o código secreto fornecido pela equipe.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Nome completo</label>
                <Input
                  placeholder="Nome do administrador"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={registrationMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Email</label>
                <Input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={registrationMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Nome de usuário</label>
                <Input
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={registrationMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Senha</label>
                <Input
                  type="password"
                  placeholder="NovaSenha123"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={registrationMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Confirmar senha</label>
                <Input
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  disabled={registrationMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Código de registro</label>
                <Input
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  className="border-2 border-black rounded-none h-12 text-base font-medium"
                  placeholder="Código secreto (fornecido pela equipe)"
                  disabled={registrationMutation.isPending}
                />
              </div>

              {success && (
                <Alert className="border-2 border-emerald-500 bg-emerald-50 text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="font-medium">{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="border-2 border-red-500 bg-red-50 rounded-none">
                  <AlertDescription className="text-red-600 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={!isFormValid() || registrationMutation.isPending}
                className="w-full h-12 text-base font-bold uppercase brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
              >
                {registrationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Criar administrador"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t-2 border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Já possui acesso?{" "}
                <Link href="/login">
                  <span className="font-bold text-black hover:underline cursor-pointer">
                    Entrar
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
