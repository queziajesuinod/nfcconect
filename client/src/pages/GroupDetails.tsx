import { useState, useMemo } from 'react';
import { useRoute } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Search, ChevronLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export function GroupDetails() {
  const [, params] = useRoute('/dashboard/groups/:id');
  const [, navigate] = useLocation();
  const groupId = params?.id ? parseInt(params.id) : null;

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectedSchedules, setSelectedSchedules] = useState<Set<number>>(new Set());
  const [searchUsers, setSearchUsers] = useState('');
  const [isAddSchedulesOpen, setIsAddSchedulesOpen] = useState(false);

  const { data: group, isLoading, refetch } = trpc.groups.byId.useQuery(
    { id: groupId! },
    { enabled: !!groupId }
  );

  const { data: availableSchedules = [] } = trpc.groups.getAvailableSchedules.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId }
  );

  const bulkRemoveUsersMutation = trpc.groups.bulkRemoveUsers.useMutation();
  const bulkAddSchedulesMutation = trpc.groups.bulkAddSchedules.useMutation();
  const bulkRemoveSchedulesMutation = trpc.groups.bulkRemoveSchedules.useMutation();

  const filteredUsers = useMemo(() => {
    if (!group?.users) return [];
    return group.users.filter(u =>
      u.userName?.toLowerCase().includes(searchUsers.toLowerCase()) ||
      u.userEmail?.toLowerCase().includes(searchUsers.toLowerCase())
    );
  }, [group?.users, searchUsers]);

  const handleRemoveUsers = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    try {
      await bulkRemoveUsersMutation.mutateAsync({
        groupId: groupId!,
        userIds: Array.from(selectedUsers),
      });
      toast.success(`${selectedUsers.size} usuário(s) removido(s)`);
      setSelectedUsers(new Set());
      refetch();
    } catch (error) {
      toast.error('Erro ao remover usuários');
    }
  };

  const handleAddSchedules = async () => {
    if (selectedSchedules.size === 0) {
      toast.error('Selecione pelo menos um agendamento');
      return;
    }

    try {
      await bulkAddSchedulesMutation.mutateAsync({
        groupId: groupId!,
        scheduleIds: Array.from(selectedSchedules),
      });
      toast.success(`${selectedSchedules.size} agendamento(s) adicionado(s)`);
      setSelectedSchedules(new Set());
      setIsAddSchedulesOpen(false);
      refetch();
    } catch (error) {
      toast.error('Erro ao adicionar agendamentos');
    }
  };

  const handleRemoveSchedules = async () => {
    if (selectedSchedules.size === 0) {
      toast.error('Selecione pelo menos um agendamento');
      return;
    }

    try {
      await bulkRemoveSchedulesMutation.mutateAsync({
        groupId: groupId!,
        scheduleIds: Array.from(selectedSchedules),
      });
      toast.success(`${selectedSchedules.size} agendamento(s) removido(s)`);
      setSelectedSchedules(new Set());
      refetch();
    } catch (error) {
      toast.error('Erro ao remover agendamentos');
    }
  };

  if (!groupId) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Grupo não encontrado</div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Carregando grupo...</div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Grupo não encontrado</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/groups')}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: group.color }}
            />
            <div>
              <h1 className="text-3xl font-bold">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600">{group.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{group.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{group.totalSchedules}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={group.isActive ? 'default' : 'secondary'}>
                {group.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agendamentos Vinculados</CardTitle>
                <CardDescription>Agendamentos que adicionam usuários a este grupo</CardDescription>
              </div>
              <Dialog open={isAddSchedulesOpen} onOpenChange={setIsAddSchedulesOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Adicionar Agendamentos</DialogTitle>
                    <DialogDescription>
                      Selecione os agendamentos que deseja vincular a este grupo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {availableSchedules.length === 0 ? (
                      <p className="text-center text-gray-600 py-8">
                        Todos os agendamentos já estão vinculados
                      </p>
                    ) : (
                      availableSchedules.map((schedule: any) => (
                        <div key={schedule.id} className="flex items-center gap-3 p-3 border rounded">
                          <Checkbox
                            checked={selectedSchedules.has(schedule.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedSchedules);
                              if (checked) {
                                newSelected.add(schedule.id);
                              } else {
                                newSelected.delete(schedule.id);
                              }
                              setSelectedSchedules(newSelected);
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{schedule.name}</div>
                            <div className="text-sm text-gray-600">
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsAddSchedulesOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddSchedules}
                      disabled={selectedSchedules.size === 0 || bulkAddSchedulesMutation.isPending}
                    >
                      Adicionar ({selectedSchedules.size})
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {group.schedules && group.schedules.length > 0 ? (
              <div className="space-y-2">
                {group.schedules.map((schedule: any) => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{schedule.name}</div>
                      <div className="text-sm text-gray-600">
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedSchedules.has(schedule.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedSchedules);
                        if (checked) {
                          newSelected.add(schedule.id);
                        } else {
                          newSelected.delete(schedule.id);
                        }
                        setSelectedSchedules(newSelected);
                      }}
                    />
                  </div>
                ))}
                {selectedSchedules.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveSchedules}
                    disabled={bulkRemoveSchedulesMutation.isPending}
                    className="w-full gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover Selecionados ({selectedSchedules.size})
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">Nenhum agendamento vinculado</p>
            )}
          </CardContent>
        </Card>

        {/* Usuários */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usuários no Grupo</CardTitle>
                <CardDescription>Usuários que fazem parte deste grupo</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{user.userName}</div>
                      {user.userEmail && <div className="text-sm text-gray-600">{user.userEmail}</div>}
                      {user.userPhone && <div className="text-sm text-gray-600">{user.userPhone}</div>}
                    </div>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedUsers);
                        if (checked) {
                          newSelected.add(user.id);
                        } else {
                          newSelected.delete(user.id);
                        }
                        setSelectedUsers(newSelected);
                      }}
                    />
                  </div>
                ))}
                {selectedUsers.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveUsers}
                    disabled={bulkRemoveUsersMutation.isPending}
                    className="w-full gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover Selecionados ({selectedUsers.size})
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">
                {searchUsers ? 'Nenhum usuário encontrado' : 'Nenhum usuário no grupo'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default GroupDetails;
