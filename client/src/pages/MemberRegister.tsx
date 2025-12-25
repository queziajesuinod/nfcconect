import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Loader2, Nfc } from "lucide-react";
import { useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

interface MemberFormData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

// Generate or retrieve unique device ID
function getDeviceId(): string {
  const DEVICE_ID_KEY = "nfc_device_id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export default function MemberRegister() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tagUid = params.get("uid") || "";
  const deviceId = params.get("device") || getDeviceId();
  const initialEmail = params.get("email") || "";
  const initialPhone = params.get("telefone") || "";

  const [formData, setFormData] = useState<MemberFormData>({
    name: "",
    email: initialEmail,
    phone: initialPhone,
    cpf: "",
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const registerMemberMutation = trpc.nfcUsers.registerMember.useMutation({
    onSuccess: (data) => {
      setIsRegistered(true);
      if (data.redirectUrl) {
        setRedirectUrl(data.redirectUrl);
        setTimeout(() => {
          window.location.href = data.redirectUrl!;
        }, 1500);
      }
      toast.success("Cadastro concluido!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isFormValid =
    formData.name.trim().length >= 2 &&
    formData.email.trim().includes("@") &&
    formData.phone.trim().length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!tagUid) {
      toast.error("UID da tag nao encontrado");
      return;
    }
    if (!isFormValid) {
      toast.error("Preencha nome, email e telefone corretamente.");
      return;
    }

    registerMemberMutation.mutate({
      tagUid,
      deviceId,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      cpf: formData.cpf.trim() || undefined,
      userAgent: navigator.userAgent,
      deviceInfo: `${navigator.platform} - ${navigator.language}`,
    });
  };

  if (!tagUid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-600 flex items-center justify-center mx-auto mb-6">
            <Nfc className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-4">Tag invalida</h2>
          <p className="text-gray-600">
            Nenhum identificador de tag NFC foi encontrado.
          </p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-green-600 p-8 md:p-12 brutal-shadow max-w-md w-full text-center bg-green-50">
          <div className="w-20 h-20 bg-green-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-2 text-green-800">Cadastro Concluido!</h2>
          <p className="text-gray-600 mb-4">Seus dados foram registrados.</p>
          {redirectUrl ? (
            <>
              <p className="text-sm text-gray-500 mb-4">Redirecionando...</p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
            </>
          ) : (
            <p className="text-sm text-gray-500">Voce pode fechar esta pagina.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black">
        <div className="container py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Nfc className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight">NFC//SYS</span>
        </div>
      </header>

      <main className="container py-12 md:py-20">
        <div className="max-w-lg mx-auto">
          <div className="border-4 border-black brutal-shadow">
            <div className="bg-black text-white p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white flex items-center justify-center">
                  <Nfc className="w-9 h-9 text-black" />
                </div>
                <div>
                  <h3 className="text-white text-xl">Cadastro</h3>
                  <p className="text-gray-400 text-sm font-mono">Tag: {tagUid}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-gray-600 mb-6">
                Preencha seus dados para concluir o cadastro.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="font-bold uppercase text-sm">Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({ ...formData, name: event.target.value })
                    }
                    placeholder="Seu nome"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData({ ...formData, email: event.target.value })
                    }
                    placeholder="seu@email.com"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData({ ...formData, phone: event.target.value })
                    }
                    placeholder="(00) 00000-0000"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">CPF (opcional)</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(event) =>
                      setFormData({ ...formData, cpf: event.target.value })
                    }
                    placeholder="000.000.000-00"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!isFormValid || registerMemberMutation.isPending}
                  className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase text-lg py-6 h-auto mt-6"
                >
                  {registerMemberMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Concluir cadastro"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
