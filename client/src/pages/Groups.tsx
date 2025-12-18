import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Plus, Users, Calendar, Eye } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import RedirectPlaceholders from '@/components/RedirectPlaceholders';

export function Groups() {
  const [, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    redirectUrl: '',
    color: '#3B82F6',
  });
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const { data: groupsPage, isLoading } = trpc.groups.list.useQuery({ page, pageSize });
  const groups = groupsPage?.items || [];
  const totalGroups = groupsPage?.total ?? 0;
  const totalPages = groupsPage?.totalPages ?? 1;
  const createMutation = trpc.groups.create.useMutation();
  const updateMutation = trpc.groups.update.useMutation();
  const deleteMutation = trpc.groups.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        redirectUrl: formData.redirectUrl || undefined,
        color: formData.color,
      });
      toast.success('Grupo criado com sucesso');
      setFormData({ name: '', description: '', redirectUrl: '', color: '#3B82F6' });
      setIsCreateOpen(false);
      setPage(1);
      utils.groups.list.invalidate({ page: 1, pageSize });
    } catch (error) {
      toast.error('Erro ao criar grupo');
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        name: formData.name,
        description: formData.description || undefined,
        redirectUrl: formData.redirectUrl || undefined,
        color: formData.color,
      });
      toast.success('Grupo atualizado com sucesso');
      setEditingId(null);
      setFormData({ name: '', description: '', redirectUrl: '', color: '#3B82F6' });
      utils.groups.list.invalidate({ page, pageSize });
    } catch (error) {
      toast.error('Erro ao atualizar grupo');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este grupo?')) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('Grupo deletado com sucesso');
      utils.groups.list.invalidate({ page, pageSize });
    } catch (error) {
      toast.error('Erro ao deletar grupo');
    }
  };

  const openEditDialog = (group: any) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      redirectUrl: group.redirectUrl || '',
      color: group.color,
    });
    setEditingId(group.id);
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '', redirectUrl: '', color: '#3B82F6' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Grupos de Notificação</h1>
            <p className="text-gray-600 mt-2">Organize usuários em grupos para notificações e links segmentados</p>
          </div>
          <Dialog open={isCreateOpen || editingId !== null} onOpenChange={(open) => {
            if (!open) closeDialog();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Grupo' : 'Criar Novo Grupo'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize as informações do grupo' : 'Crie um novo grupo para organizar usuários'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Grupo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Jovens"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Grupo de jovens da comunidade"
                  />
                </div>
                <div>
                  <Label htmlFor="redirectUrl">URL de Redirecionamento</Label>
                  <Input
                    id="redirectUrl"
                    value={formData.redirectUrl}
                    onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                    placeholder="https://exemplo.com/jovens"
                  />
                  <RedirectPlaceholders />
                </div>
                <div>
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex gap-2">
                    <input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={editingId ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando grupos...</div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-600">Nenhum grupo criado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {groups.map((group: any) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <CardTitle>{group.name}</CardTitle>
                          {group.description && (
                            <CardDescription>{group.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/groups/${group.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(group)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(group.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-2xl font-bold">{group.totalUsers}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Usuários
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{group.totalSchedules}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Agendamentos
                        </div>
                      </div>
                      <div>
                        <Badge variant={group.isActive ? 'default' : 'secondary'}>
                          {group.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                    {group.redirectUrl && (
                      <div className="text-sm text-gray-600 break-all">
                        <strong>URL:</strong> {group.redirectUrl}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages} · {totalGroups} grupo(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Groups;
