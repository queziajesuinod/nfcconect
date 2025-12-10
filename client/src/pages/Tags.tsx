import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Nfc, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TagStatus = "active" | "inactive" | "blocked";

interface TagFormData {
  uid: string;
  name: string;
  description: string;
  status: TagStatus;
  redirectUrl: string;
}

const initialFormData: TagFormData = {
  uid: "",
  name: "",
  description: "",
  status: "active",
  redirectUrl: "",
};

export default function Tags() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TagFormData>(initialFormData);
  const [editId, setEditId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: tags, isLoading } = trpc.tags.list.useQuery();

  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      utils.stats.overview.invalidate();
      setIsCreateOpen(false);
      setFormData(initialFormData);
      toast.success("Tag criada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      setIsEditOpen(false);
      setFormData(initialFormData);
      setEditId(null);
      toast.success("Tag atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      utils.stats.overview.invalidate();
      setDeleteId(null);
      toast.success("Tag excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!formData.uid.trim()) {
      toast.error("UID é obrigatório");
      return;
    }
    createMutation.mutate({
      uid: formData.uid,
      name: formData.name || undefined,
      description: formData.description || undefined,
      status: formData.status,
      redirectUrl: formData.redirectUrl || undefined,
    });
  };

  const handleEdit = (tag: NonNullable<typeof tags>[0]) => {
    setFormData({
      uid: tag.uid,
      name: tag.name || "",
      description: tag.description || "",
      status: tag.status,
      redirectUrl: tag.redirectUrl || "",
    });
    setEditId(tag.id);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      name: formData.name || undefined,
      description: formData.description || undefined,
      status: formData.status,
      redirectUrl: formData.redirectUrl || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-black text-white",
      inactive: "bg-gray-200 text-gray-700",
      blocked: "bg-red-600 text-white",
    };
    const labels: Record<string, string> = {
      active: "ATIVO",
      inactive: "INATIVO",
      blocked: "BLOQUEADO",
    };
    return (
      <span className={`px-3 py-1 text-xs font-bold uppercase ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    );
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
            <h1 className="text-4xl md:text-5xl">Tags NFC</h1>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase">
                <Plus className="w-5 h-5 mr-2" /> Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase">Nova Tag NFC</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="font-bold uppercase text-sm">UID *</Label>
                  <Input
                    value={formData.uid}
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                    placeholder="Ex: 04:A3:B2:C1:D0:E9"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome identificador"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da tag"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Status</Label>
                  <Select value={formData.status} onValueChange={(v: TagStatus) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="border-2 border-black rounded-none mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-none">
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">URL de Redirecionamento</Label>
                  <Input
                    value={formData.redirectUrl}
                    onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                    placeholder="https://exemplo.com"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending}
                  className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase mt-4"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Tag"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tags List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-4 border-black p-6 bg-gray-50 animate-pulse h-32" />
            ))}
          </div>
        ) : tags && tags.length > 0 ? (
          <div className="space-y-0">
            {tags.map((tag, index) => (
              <div
                key={tag.id}
                className={`border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors ${index > 0 ? '-mt-1' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                      <Nfc className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-black">{tag.name || "Sem nome"}</h4>
                        {getStatusBadge(tag.status)}
                      </div>
                      <p className="text-sm font-mono text-gray-600 mb-1">{tag.uid}</p>
                      {tag.description && (
                        <p className="text-sm text-gray-500">{tag.description}</p>
                      )}
                      {tag.redirectUrl && (
                        <a 
                          href={tag.redirectUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-black font-medium flex items-center gap-1 mt-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> {tag.redirectUrl}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tag)}
                      className="border-2 border-black rounded-none font-bold uppercase"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(tag.id)}
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
              <Nfc className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="mb-2">Nenhuma Tag</h3>
            <p className="text-gray-500 mb-6">Crie sua primeira tag NFC para começar.</p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase"
            >
              <Plus className="w-5 h-5 mr-2" /> Criar Tag
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase">Editar Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="font-bold uppercase text-sm">UID</Label>
                <Input
                  value={formData.uid}
                  disabled
                  className="border-2 border-gray-300 rounded-none mt-1 bg-gray-100"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome identificador"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da tag"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Status</Label>
                <Select value={formData.status} onValueChange={(v: TagStatus) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="border-2 border-black rounded-none mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black rounded-none">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">URL de Redirecionamento</Label>
                <Input
                  value={formData.redirectUrl}
                  onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                  placeholder="https://exemplo.com"
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
              <AlertDialogTitle className="text-2xl font-black uppercase">Excluir Tag?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Esta ação não pode ser desfeita. A tag será permanentemente removida do sistema.
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
