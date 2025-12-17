import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Activity,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  Radio,
  Mail,
  Smartphone,
  Zap,
  Users,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DAYS_OF_WEEK = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function RealtimePanelContent() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data, isLoading, refetch, isFetching } = trpc.checkins.realtimePanel.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });

  useEffect(() => {
    if (!isFetching) {
      setLastRefresh(new Date());
    }
  }, [isFetching]);

  const schedules = data?.schedules || [];
  const aggregatedCheckins = data?.allCheckins || [];
  const activeSchedules = useMemo(() => schedules.filter((s) => s.isActiveNow), [schedules]);
  const todaySchedules = schedules;

  const totalCheckins = aggregatedCheckins.length;
  const manualCheckins = aggregatedCheckins.filter((c) => c.type === "manual").length;
  const autoCheckins = aggregatedCheckins.filter((c) => c.type === "automatic").length;
  const withinRadius = aggregatedCheckins.filter((c) => c.isWithinRadius).length;

  const uniqueUsers = useMemo(() => {
    const set = new Set<number>();
    aggregatedCheckins.forEach((checkin) => {
      if (checkin.nfcUserId) set.add(checkin.nfcUserId);
    });
    return set.size;
  }, [aggregatedCheckins]);

  const completionPct =
    activeSchedules.length > 0
      ? Math.min(
          100,
          Math.round(
            (activeSchedules.reduce((sum, s) => sum + (s.checkedInCount || 0), 0) /
              Math.max(1, activeSchedules.reduce((sum, s) => sum + (s.totalUsers || 1), 0))) *
              100
          )
        )
      : 0;

  const latestCheckins = aggregatedCheckins.slice(0, 8);
  const manualPct = totalCheckins ? Math.round((manualCheckins / totalCheckins) * 100) : 0;
  const autoPct = totalCheckins ? Math.round((autoCheckins / totalCheckins) * 100) : 0;

  const handleManualRefresh = () => refetch();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Painel em Tempo Real</h1>
          <p className="text-gray-500">
            {DAYS_OF_WEEK[data?.currentDay || 0]}, {data?.currentTime} (Campo Grande MS)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-500">
            Última atualização: {lastRefresh.toLocaleTimeString("pt-BR")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "border-green-600 text-green-600" : ""}
          >
            <Radio className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-pulse" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-4 border-black">
          <CardContent className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <div className="text-3xl font-black">{activeSchedules.length}</div>
            <p className="text-xs font-semibold uppercase text-gray-500">Agendamentos ativos</p>
            <p className="text-xs text-gray-400">Hoje</p>
          </CardContent>
        </Card>
        <Card className="border-4 border-blue-600">
          <CardContent className="text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-black text-blue-600">{totalCheckins}</div>
            <p className="text-xs font-semibold uppercase text-blue-100">Check-ins</p>
            <p className="text-xs text-blue-100">Hoje</p>
          </CardContent>
        </Card>
        <Card className="border-4 border-purple-600">
          <CardContent className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-black">{uniqueUsers}</div>
            <p className="text-xs font-semibold uppercase text-purple-100">Usuários únicos</p>
            <p className="text-xs text-purple-100">Hoje</p>
          </CardContent>
        </Card>
        <Card className="border-4 border-green-600">
          <CardContent className="text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-3xl font-black text-green-600">{withinRadius}</div>
            <p className="text-xs font-semibold uppercase text-green-100">Dentro do raio</p>
            <p className="text-xs text-green-100">
              {totalCheckins ? `${Math.round((withinRadius / totalCheckins) * 100)}%` : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card className="border-4 border-black">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-black">Últimos Check-ins</CardTitle>
            <Badge variant="outline" className="text-xs">
              {totalCheckins} registros hoje
            </Badge>
          </CardHeader>
          <CardContent>
            {latestCheckins.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Ainda não houve check-ins</div>
            ) : (
              <div className="space-y-3">
                {latestCheckins.map((checkin) => (
                  <div
                    key={`latest-${checkin.id}-${checkin.createdAt}`}
                    className="flex items-center justify-between gap-4 border-2 border-gray-200 p-3 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold">{checkin.userName || "Usuário desconhecido"}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            checkin.type === "manual" ? "border-blue-600 text-blue-600" : "border-purple-600 text-purple-600"
                          }`}
                        >
                          {checkin.type === "manual" ? "NFC" : "Automático"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span>{checkin.tagName || checkin.tagUid}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {new Date(checkin.createdAt).toLocaleTimeString("pt-BR")}
                      </div>
                      <div className="text-sm font-bold">{checkin.distanceMeters ?? "—"}m</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-4 border-gray-400">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-black">Consolidação por Agendamento</CardTitle>
            <Badge variant="outline" className="text-xs">
              {activeSchedules.length} ativos agora
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaySchedules.length === 0 ? (
              <div className="text-center text-gray-500">Nenhum agendamento ativo hoje</div>
            ) : (
              todaySchedules.slice(0, 4).map((schedule) => {
                const progress =
                  schedule.totalUsers && schedule.checkedInCount
                    ? Math.min(
                        100,
                        Math.round((schedule.checkedInCount / Math.max(1, schedule.totalUsers)) * 100)
                      )
                    : 0;

                return (
                  <div key={`summary-${schedule.id}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{schedule.name || `Agendamento ${schedule.id}`}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${schedule.isActiveNow ? "bg-green-600" : "bg-gray-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex text-xs text-gray-500 justify-between">
                      <span>
                        {schedule.checkedInCount ?? 0}/{schedule.totalUsers ?? 0} presentes
                      </span>
                      <span>
                        {schedule.isActiveNow ? "Ativo" : "Fora do período"} • {schedule.startTime}–{schedule.endTime}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-4 border-blue-600">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-black">Distribuição Manual vs Automático</CardTitle>
            <Badge variant="outline" className="text-xs">
              {manualPct + autoPct ? `${manualPct}% manual` : "Sem registros"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex justify-between">
                  <span>Manual (NFC)</span>
                  <span>{manualCheckins} registros</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${manualPct}%` }} />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex justify-between">
                  <span>Automático</span>
                  <span>{autoCheckins} registros</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600" style={{ width: `${autoPct}%` }} />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Dentro do raio: {withinRadius} (
                {totalCheckins ? `${Math.round((withinRadius / totalCheckins) * 100)}%` : "0%"})
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-4 border-green-600">
          <CardHeader>
            <CardTitle className="text-lg font-black">Performance geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Presença média</span>
              <span className="font-bold">{completionPct}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-600" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="text-xs text-gray-500">
              Check-ins dentro do raio refletem a qualidade da localização.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RealtimePanel() {
  return (
    <DashboardLayout>
      <RealtimePanelContent />
    </DashboardLayout>
  );
}
