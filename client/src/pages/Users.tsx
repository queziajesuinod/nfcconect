import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Users as UsersIcon, Pencil, Trash2, CheckCircle, XCircle, Shield, Clock, Smartphone, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface UserFormData {
  name: string;
  email: string;
  phone: string;
}

export default function Users() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ name: "", email: "", phone: "" });

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.nfcUsers.list.useQuery();

  const updateMutation = trpc.nfcUsers.update.useMutation({
    onSuccess: () => {
      utils.nfcUsers.list.invalidate();
      setIsEditOpen(false);
      setFormData({ name: "", email: "", phone: "" });
      setEditId(null);
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const validateMutation = trpc.nfcUsers.validate.useMutation({
    onSuccess: () => {
      utils.nfcUsers.list.invalidate();
      toast.success("Usuário validado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.nfcUsers.delete.useMutation({
    onSuccess: () => {
      utils.nfcUsers.list.invalidate();
      utils.stats.overview.invalidate();
      setDeleteId(null);
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (user: NonNullable<typeof users>[0]) => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
    setEditId(user.id);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      name: formData.name || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
              Gerenciamento
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl">Usuários NFC</h1>
          <p className="text-lg text-gray-600 mt-4">
            Usuários registrados através de tags NFC
          </p>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-4 border-black p-6 bg-gray-50 animate-pulse h-40" />
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-0">
            {users.map((user, index) => (
              <div
                key={user.id}
                className={`border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors ${index > 0 ? '-mt-1' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-black flex items-center justify-center shrink-0">
                      <UsersIcon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-lg font-black">{user.name || "Usuário Anônimo"}</h4>
                        {user.isValidated ? (
                          <span className="px-3 py-1 text-xs font-bold uppercase bg-green-600 text-white flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Validado
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-bold uppercase bg-yellow-500 text-black flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {user.email && (
                          <p className="text-gray-600">
                            <span className="font-bold">Email:</span> {user.email}
                          </p>
                        )}
                        {user.phone && (
                          <p className="text-gray-600">
                            <span className="font-bold">Telefone:</span> {user.phone}
                          </p>
                        )}
                        <p className="text-gray-600">
                          <span className="font-bold">Device ID:</span> {user.deviceId?.slice(0, 8)}...
                        </p>
                        {user.ipAddress && (
                          <p className="text-gray-600">
                            <span className="font-bold">IP:</span> {user.ipAddress}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Primeira conexão: {formatDate(user.firstConnectionAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Última: {formatDate(user.lastConnectionAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {user.deviceId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const appUrl = `${window.location.origin}/app?device=${user.deviceId}`;
                            navigator.clipboard.writeText(appUrl);
                            toast.success("Link do App copiado!");
                          }}
                          className="border-2 border-green-600 text-green-600 rounded-none font-bold uppercase hover:bg-green-600 hover:text-white"
                          title="Copiar link do App para ativar localização"
                        >
                          <Smartphone className="w-4 h-4 mr-1" />
                          Link App
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const appUrl = `${window.location.origin}/app?device=${user.deviceId}`;
                            window.open(appUrl, '_blank');
                          }}
                          className="border-2 border-blue-600 text-blue-600 rounded-none font-bold uppercase hover:bg-blue-600 hover:text-white"
                          title="Abrir App em nova aba"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {!user.isValidated && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => validateMutation.mutate({ id: user.id })}
                        disabled={validateMutation.isPending}
                        className="border-2 border-green-600 text-green-600 rounded-none font-bold uppercase hover:bg-green-600 hover:text-white"
                      >
                        <Shield className="w-4 h-4 mr-1" /> Validar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      className="border-2 border-black rounded-none font-bold uppercase"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(user.id)}
                      className="border-2 border-black rounded-none font-bold uppercase text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-4 border-black p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <UsersIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="mb-2">Nenhum Usuário</h3>
            <p className="text-gray-500">
              Usuários serão registrados automaticamente na primeira leitura de uma tag NFC.
            </p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase">Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="font-bold uppercase text-sm">Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do usuário"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
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
                onClick={handleUpdate} 
                disabled={updateMutation.isPending}
                className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase mt-4"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="border-4 border-black rounded-none brutal-shadow">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black uppercase">Excluir Usuário?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-2 border-black rounded-none font-bold uppercase">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
                className="bg-red-600 hover:bg-red-700 rounded-none font-bold uppercase"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
