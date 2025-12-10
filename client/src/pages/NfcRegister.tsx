import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Nfc, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

interface FormData {
  name: string;
  email: string;
  phone: string;
}

export default function NfcRegister() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tagUid = params.get("uid") || "";
  
  const [formData, setFormData] = useState<FormData>({ name: "", email: "", phone: "" });
  const [isRegistered, setIsRegistered] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const registerMutation = trpc.nfcUsers.register.useMutation({
    onSuccess: (data) => {
      if (data.isNewUser) {
        setIsRegistered(true);
        toast.success("Registro realizado com sucesso!");
      } else {
        toast.success("Bem-vindo de volta!");
        setIsRegistered(true);
      }
      if (data.redirectUrl) {
        setRedirectUrl(data.redirectUrl);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagUid) {
      toast.error("UID da tag não encontrado");
      return;
    }
    registerMutation.mutate({
      tagUid,
      name: formData.name || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      userAgent: navigator.userAgent,
      deviceInfo: `${navigator.platform} - ${navigator.language}`,
    });
  };

  const handleRedirect = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  // Auto-register if no form needed (quick scan)
  useEffect(() => {
    if (tagUid && params.get("auto") === "true") {
      registerMutation.mutate({
        tagUid,
        userAgent: navigator.userAgent,
        deviceInfo: `${navigator.platform} - ${navigator.language}`,
      });
    }
  }, [tagUid]);

  if (!tagUid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-600 flex items-center justify-center mx-auto mb-6">
            <Nfc className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-4">Tag Inválida</h2>
          <p className="text-gray-600">
            Nenhum identificador de tag NFC foi encontrado. 
            Por favor, escaneie uma tag válida.
          </p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-4">Conectado!</h2>
          <p className="text-gray-600 mb-8">
            {registerMutation.data?.isNewUser 
              ? "Seu registro foi realizado com sucesso."
              : "Bem-vindo de volta! Sua conexão foi registrada."
            }
          </p>
          
          {redirectUrl ? (
            <Button 
              onClick={handleRedirect}
              className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase text-lg py-6 h-auto"
            >
              Continuar <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <p className="text-sm text-gray-500">
              Você pode fechar esta página.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-4 border-black">
        <div className="container py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Nfc className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight">NFC//SYS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12 md:py-20">
        <div className="max-w-lg mx-auto">
          <div className="border-4 border-black brutal-shadow">
            {/* Card Header */}
            <div className="bg-black text-white p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white flex items-center justify-center">
                  <Nfc className="w-9 h-9 text-black" />
                </div>
                <div>
                  <h3 className="text-white text-xl">Primeira Conexão</h3>
                  <p className="text-gray-400 text-sm font-mono">Tag: {tagUid}</p>
                </div>
              </div>
            </div>
            
            {/* Card Body */}
            <div className="p-6 md:p-8">
              <p className="text-gray-600 mb-6">
                Esta é sua primeira conexão com esta tag NFC. 
                Preencha seus dados para se registrar (opcional).
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="font-bold uppercase text-sm">Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                
                <Button 
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase text-lg py-6 h-auto mt-6"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" /> Registrando...
                    </>
                  ) : (
                    <>
                      Registrar <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
              
              <button
                onClick={() => {
                  registerMutation.mutate({
                    tagUid,
                    userAgent: navigator.userAgent,
                    deviceInfo: `${navigator.platform} - ${navigator.language}`,
                  });
                }}
                disabled={registerMutation.isPending}
                className="w-full text-center text-sm text-gray-500 hover:text-black mt-4 underline"
              >
                Pular e continuar sem dados
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
