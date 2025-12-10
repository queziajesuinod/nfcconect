import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Link2, ExternalLink, Copy, MousePointer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LinkFormData {
  nfcUserId: number | null;
  targetUrl: string;
  title: string;
}

const initialFormData: LinkFormData = {
  nfcUserId: null,
  targetUrl: "",
  title: "",
};

export default function Links() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<LinkFormData>(initialFormData);
  const [editId, setEditId] = useState<number | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);

  const utils = trpc.useUtils();
  const { data: links, isLoading } = trpc.links.list.useQuery();
  const { data: users } = trpc.nfcUsers.list.useQuery();

  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      utils.stats.overview.invalidate();
      setIsCreateOpen(false);
      setFormData(initialFormData);
      toast.success("Link criado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.links.update.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      setIsEditOpen(false);
      setFormData(initialFormData);
      setEditId(null);
      toast.success("Link atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      utils.stats.overview.invalidate();
      setDeleteId(null);
      toast.success("Link excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!formData.nfcUserId) {
      toast.error("Selecione um usuário");
      return;
    }
    if (!formData.targetUrl.trim()) {
      toast.error("URL de destino é obrigatória");
      return;
    }
    createMutation.mutate({
      nfcUserId: formData.nfcUserId,
      targetUrl: formData.targetUrl,
      title: formData.title || undefined,
    });
  };

  const handleEdit = (link: NonNullable<typeof links>[0]) => {
    setFormData({
      nfcUserId: link.nfcUserId,
      targetUrl: link.targetUrl,
      title: link.title || "",
    });
    setEditId(link.id);
    setEditIsActive(link.isActive);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      targetUrl: formData.targetUrl || undefined,
      title: formData.title || undefined,
      isActive: editIsActive,
    });
  };

  const copyToClipboard = (shortCode: string) => {
    const url = `${window.location.origin}/l/${shortCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
                Gerenciamento
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl">Links<br />Dinâmicos</h1>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase">
                <Plus className="w-5 h-5 mr-2" /> Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase">Novo Link Dinâmico</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="font-bold uppercase text-sm">Usuário NFC *</Label>
                  <Select 
                    value={formData.nfcUserId?.toString() || ""} 
                    onValueChange={(v) => setFormData({ ...formData, nfcUserId: parseInt(v) })}
                  >
                    <SelectTrigger className="border-2 border-black rounded-none mt-1">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-none">
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name || `Usuário #${user.id}`} - Tag #{user.tagId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">URL de Destino *</Label>
                  <Input
                    value={formData.targetUrl}
                    onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                    placeholder="https://exemplo.com/acao"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Título</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Descrição do link"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending}
                  className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase mt-4"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Link"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Links List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-4 border-black p-6 bg-gray-50 animate-pulse h-32" />
            ))}
          </div>
        ) : links && links.length > 0 ? (
          <div className="space-y-0">
            {links.map((link, index) => (
              <div
                key={link.id}
                className={`border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors ${index > 0 ? '-mt-1' : ''} ${!link.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${link.isActive ? 'bg-black' : 'bg-gray-400'} flex items-center justify-center shrink-0`}>
                      <Link2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h4 className="text-lg font-black">{link.title || "Sem título"}</h4>
                        {link.isActive ? (
                          <span className="px-3 py-1 text-xs font-bold uppercase bg-green-600 text-white">
                            ATIVO
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-bold uppercase bg-gray-400 text-white">
                            INATIVO
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 border border-black">
                          /l/{link.shortCode}
                        </code>
                        <button
                          onClick={() => copyToClipboard(link.shortCode)}
                          className="p-1 hover:bg-gray-200 transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <a 
                        href={link.targetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 flex items-center gap-1 hover:text-black hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> {link.targetUrl}
                      </a>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Usuário #{link.nfcUserId}</span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" /> {link.clickCount} cliques
                        </span>
                        <span>Criado: {formatDate(link.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(link)}
                      className="border-2 border-black rounded-none font-bold uppercase"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(link.id)}
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
              <Link2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="mb-2">Nenhum Link</h3>
            <p className="text-gray-500 mb-6">Crie links dinâmicos para redirecionar usuários para ações específicas.</p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase"
            >
              <Plus className="w-5 h-5 mr-2" /> Criar Link
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase">Editar Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="font-bold uppercase text-sm">URL de Destino</Label>
                <Input
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  placeholder="https://exemplo.com/acao"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Descrição do link"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div className="flex items-center justify-between border-2 border-black p-4">
                <Label className="font-bold uppercase text-sm">Link Ativo</Label>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
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
              <AlertDialogTitle className="text-2xl font-black uppercase">Excluir Link?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Esta ação não pode ser desfeita. O link será permanentemente removido do sistema.
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
