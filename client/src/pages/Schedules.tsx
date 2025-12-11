import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Plus, Trash2, Play, Loader2, MapPin, CheckCircle, XCircle, Settings, Zap } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
];

// Helper to determine current period of day
function getCurrentPeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "manhã";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noite";
}

// Helper to check if current time is within schedule period
function isWithinSchedulePeriod(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export default function Schedules() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    tagId: "",
    name: "",
    description: "",
    startTime: "08:00",
    endTime: "10:00",
  });

  const utils = trpc.useUtils();
  const { data: schedules, isLoading } = trpc.schedules.list.useQuery();
  const { data: tags } = trpc.tags.list.useQuery();
  const { data: automaticCheckins } = trpc.automaticCheckins.list.useQuery({ limit: 100 });

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      utils.schedules.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Agendamento atualizado!");
      utils.schedules.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento excluído!");
      utils.schedules.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const triggerMutation = trpc.schedules.triggerCheckin.useMutation({
    onSuccess: (result) => {
      toast.success(`Check-in executado! ${result.usersWithinRadius}/${result.usersProcessed} usuários dentro do raio. ${result.usersSkipped > 0 ? `(${result.usersSkipped} já fizeram check-in hoje)` : ""}`);
      utils.automaticCheckins.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({ tagId: "", name: "", description: "", startTime: "08:00", endTime: "10:00" });
    setSelectedDays([]);
  };

  const handleCreate = () => {
    if (!formData.tagId || selectedDays.length === 0) {
      toast.error("Selecione uma tag e pelo menos um dia da semana");
      return;
    }
    createMutation.mutate({
      tagId: parseInt(formData.tagId),
      name: formData.name || undefined,
      description: formData.description || undefined,
      daysOfWeek: selectedDays.join(","),
      startTime: formData.startTime,
      endTime: formData.endTime,
    });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const formatDays = (daysStr: string) => {
    const days = daysStr.split(",").map(d => parseInt(d.trim()));
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === String(d))?.label?.slice(0, 3)).join(", ");
  };

  // Filter tags that have geolocation and check-in enabled
  const eligibleTags = tags?.filter(t => t.latitude && t.longitude && t.enableCheckin) || [];

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date().getDay();
  const todayLabel = DAYS_OF_WEEK.find(d => d.value === String(today))?.label || "";

  // Filter schedules that apply to today and are active
  const todaySchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(s => {
      if (!s.isActive) return false;
      const days = s.daysOfWeek.split(",").map(d => parseInt(d.trim()));
      return days.includes(today);
    });
  }, [schedules, today]);

  // Filter schedules that are currently within their time period
  const activeNowSchedules = useMemo(() => {
    return todaySchedules.filter(s => isWithinSchedulePeriod(s.startTime, s.endTime));
  }, [todaySchedules]);

  // Filter check-ins from today only
  const todayCheckins = useMemo(() => {
    if (!automaticCheckins) return [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    return automaticCheckins.filter(c => {
      const checkinDate = new Date(c.checkinTime);
      return checkinDate >= todayStart;
    });
  }, [automaticCheckins]);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              AGENDAMENTOS
            </h1>
            <p className="text-gray-600 mt-2">
              Configure e execute check-ins automáticos por período
            </p>
          </div>
        </div>

        {/* ============ SEÇÃO 1: EXECUÇÃO DO DIA ============ */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-black text-white p-2">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">EXECUÇÃO DO DIA</h2>
              <p className="text-gray-600">
                Hoje é <span className="font-bold">{todayLabel}</span> - Período: <span className="font-bold">{getCurrentPeriod()}</span>
              </p>
            </div>
          </div>

          {todaySchedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {todaySchedules.map((schedule) => {
                const isActiveNow = isWithinSchedulePeriod(schedule.startTime, schedule.endTime);
                return (
                  <Card 
                    key={schedule.id} 
                    className={`border-4 ${isActiveNow ? "border-green-600 bg-green-50" : "border-gray-300"}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black">
                          {schedule.name || `Agendamento #${schedule.id}`}
                        </CardTitle>
                        {isActiveNow && (
                          <span className="bg-green-600 text-white text-xs font-bold px-2 py-1">
                            ATIVO AGORA
                          </span>
                        )}
                      </div>
                      {schedule.tag && (
                        <p className="text-sm text-gray-600">
                          Tag: {schedule.tag.name || schedule.tag.uid}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className={`font-medium ${isActiveNow ? "text-green-700" : ""}`}>
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>
                        {schedule.description && (
                          <p className="text-sm text-gray-600">{schedule.description}</p>
                        )}
                        <Button
                          className={`w-full font-bold ${isActiveNow ? "bg-green-600 hover:bg-green-700" : "bg-black hover:bg-gray-800"} text-white`}
                          onClick={() => triggerMutation.mutate({ scheduleId: schedule.id })}
                          disabled={triggerMutation.isPending}
                        >
                          {triggerMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          EXECUTAR CHECK-IN
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-4 border-gray-300 mb-8">
              <CardContent className="py-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-bold mb-2">Nenhum agendamento para hoje</h3>
                <p className="text-gray-600">Não há agendamentos configurados para {todayLabel}</p>
              </CardContent>
            </Card>
          )}

          {/* Histórico de Check-ins do Dia */}
          <div className="mt-6">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              HISTÓRICO DE HOJE ({todayCheckins.length} check-ins)
            </h3>
            {todayCheckins.length > 0 ? (
              <Card className="border-4 border-black">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black text-white">
                        <tr>
                          <th className="text-left p-4 font-bold">USUÁRIO</th>
                          <th className="text-left p-4 font-bold">AGENDAMENTO</th>
                          <th className="text-left p-4 font-bold">PERÍODO</th>
                          <th className="text-left p-4 font-bold">DISTÂNCIA</th>
                          <th className="text-left p-4 font-bold">STATUS</th>
                          <th className="text-left p-4 font-bold">HORA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayCheckins.map((checkin) => (
                          <tr key={checkin.id} className="border-b-2 border-gray-200 hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-bold">{checkin.nfcUser?.name || "—"}</p>
                                <p className="text-sm text-gray-600">{checkin.nfcUser?.email || "—"}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-medium">{checkin.schedule?.name || `#${checkin.scheduleId}`}</p>
                              {checkin.tag && (
                                <p className="text-sm text-gray-600">{checkin.tag.name || checkin.tag.uid}</p>
                              )}
                            </td>
                            <td className="p-4 font-mono">
                              {checkin.periodStart} - {checkin.periodEnd}
                            </td>
                            <td className="p-4">
                              <span className={`font-bold ${checkin.isWithinRadius ? "text-green-600" : "text-red-600"}`}>
                                {checkin.distanceMeters}m
                              </span>
                            </td>
                            <td className="p-4">
                              {checkin.status === "completed" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 font-bold text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 font-bold text-sm">
                                  <XCircle className="w-4 h-4" />
                                  FORA
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-sm font-mono">
                              {new Date(checkin.checkinTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-4 border-gray-300">
                <CardContent className="py-6 text-center">
                  <p className="text-gray-600">Nenhum check-in registrado hoje</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ============ SEÇÃO 2: CONFIGURAÇÃO DE AGENDAMENTOS ============ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gray-200 p-2">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black">CONFIGURAÇÃO</h2>
                <p className="text-gray-600">Gerencie todos os agendamentos</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-gray-800 font-bold">
                  <Plus className="w-5 h-5 mr-2" />
                  NOVO AGENDAMENTO
                </Button>
              </DialogTrigger>
              <DialogContent className="border-4 border-black max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">NOVO AGENDAMENTO</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="font-bold">Tag NFC *</Label>
                    <Select value={formData.tagId} onValueChange={(v) => setFormData({ ...formData, tagId: v })}>
                      <SelectTrigger className="border-2 border-black mt-1">
                        <SelectValue placeholder="Selecione uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleTags.map((tag) => (
                          <SelectItem key={tag.id} value={String(tag.id)}>
                            {tag.name || tag.uid} (Raio: {tag.radiusMeters}m)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {eligibleTags.length === 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        Nenhuma tag elegível. Configure localização e habilite check-in em uma tag.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="font-bold">Nome do Agendamento</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Culto Domingo"
                      className="border-2 border-black mt-1"
                    />
                  </div>

                  <div>
                    <Label className="font-bold">Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição opcional..."
                      className="border-2 border-black mt-1"
                    />
                  </div>

                  <div>
                    <Label className="font-bold mb-2 block">Dias da Semana *</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={selectedDays.includes(day.value) ? "default" : "outline"}
                          className={`${selectedDays.includes(day.value) ? "bg-black text-white" : "border-2 border-black"}`}
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-bold">Horário Início *</Label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="border-2 border-black mt-1"
                      />
                    </div>
                    <div>
                      <Label className="font-bold">Horário Fim *</Label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="border-2 border-black mt-1"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-100 p-3 border-2 border-black">
                    <p className="text-sm">
                      <strong>Como funciona:</strong> O sistema verificará usuários dentro do raio da tag 
                      durante o período configurado e registrará check-in automaticamente.
                    </p>
                  </div>

                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full bg-black text-white hover:bg-gray-800 font-bold"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-5 h-5 mr-2" />
                    )}
                    CRIAR AGENDAMENTO
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* All Schedules Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : schedules && schedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="border-4 border-black">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-black">
                        {schedule.name || `Agendamento #${schedule.id}`}
                      </CardTitle>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={(checked) => 
                          updateMutation.mutate({ id: schedule.id, isActive: checked })
                        }
                      />
                    </div>
                    {schedule.tag && (
                      <p className="text-sm text-gray-600">
                        Tag: {schedule.tag.name || schedule.tag.uid}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{formatDays(schedule.daysOfWeek)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                      {schedule.description && (
                        <p className="text-sm text-gray-600">{schedule.description}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-2 border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate({ id: schedule.id })}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          EXCLUIR
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-4 border-black">
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold mb-2">Nenhum agendamento</h3>
                <p className="text-gray-600">Crie um agendamento para check-ins automáticos</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
