import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  RefreshCw,
  Calendar,
  Radio,
  User,
  Phone,
  Mail,
  Smartphone,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function RealtimePanelContent() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data, isLoading, refetch, isFetching } = trpc.checkins.realtimePanel.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false, // Refresh every 10 seconds if auto-refresh is on
  });

  useEffect(() => {
    if (!isFetching) {
      setLastRefresh(new Date());
    }
  }, [isFetching]);

  const handleManualRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const activeSchedules = data?.schedules?.filter(s => s.isActiveNow) || [];
  const todaySchedules = data?.schedules || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Painel em Tempo Real</h1>
          <p className="text-gray-500">
            {DAYS_OF_WEEK[data?.currentDay || 0]}, {data?.currentTime} (Campo Grande MS)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Active Now Banner */}
      {activeSchedules.length > 0 && (
        <Card className="border-4 border-green-600 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse" />
              <span className="font-bold text-green-800">
                {activeSchedules.length} agendamento(s) ativo(s) agora
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No schedules today */}
      {todaySchedules.length === 0 && (
        <Card className="border-4 border-gray-300">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhum agendamento para hoje</h3>
            <p className="text-gray-500">
              Não há agendamentos configurados para {DAYS_OF_WEEK[data?.currentDay || 0]}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Cards */}
      {todaySchedules.map((schedule) => (
        <Card 
          key={schedule.id} 
          className={`border-4 ${schedule.isActiveNow ? 'border-green-600' : 'border-gray-300'}`}
        >
          <CardHeader className={`${schedule.isActiveNow ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {schedule.isActiveNow && (
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                )}
                <CardTitle className={schedule.isActiveNow ? 'text-white' : ''}>
                  {schedule.name || 'Agendamento sem nome'}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={schedule.isActiveNow ? "secondary" : "outline"} className="font-mono">
                  <Clock className="w-3 h-3 mr-1" />
                  {schedule.startTime} - {schedule.endTime}
                </Badge>
                {schedule.isActiveNow && (
                  <Badge className="bg-white text-green-600 font-bold">
                    ATIVO AGORA
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 border-2 border-gray-200 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-2xl font-black">{schedule.totalUsers}</div>
                <div className="text-xs text-gray-500 uppercase">Total Esperado</div>
              </div>
              <div className="bg-green-50 p-4 border-2 border-green-600 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-black text-green-600">{schedule.checkedInCount}</div>
                <div className="text-xs text-gray-500 uppercase">Presentes</div>
              </div>
              <div className="bg-red-50 p-4 border-2 border-red-300 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-black text-red-500">
                  {Math.max(0, schedule.totalUsers - schedule.checkedInCount)}
                </div>
                <div className="text-xs text-gray-500 uppercase">Ausentes</div>
              </div>
              <div className="bg-blue-50 p-4 border-2 border-blue-300 text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-black text-blue-600">
                  {schedule.checkins?.filter(c => c.isWithinRadius).length || 0}
                </div>
                <div className="text-xs text-gray-500 uppercase">Dentro do Raio</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Progresso de Presença</span>
                <span className="font-bold">
                  {schedule.totalUsers > 0 
                    ? Math.round((schedule.checkedInCount / schedule.totalUsers) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="h-4 bg-gray-200 border-2 border-black overflow-hidden">
                <div 
                  className="h-full bg-green-600 transition-all duration-500"
                  style={{ 
                    width: `${schedule.totalUsers > 0 
                      ? Math.min(100, (schedule.checkedInCount / schedule.totalUsers) * 100) 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Check-ins List */}
            <div>
              <h4 className="font-bold uppercase text-sm mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Check-ins de Hoje ({schedule.checkins?.length || 0})
              </h4>
              
              {(!schedule.checkins || schedule.checkins.length === 0) ? (
                <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500">Nenhum check-in registrado ainda</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {schedule.checkins.map((checkin, index) => (
                    <div 
                      key={`${checkin.id}-${checkin.type}-${index}`}
                      className={`flex items-center justify-between p-3 border-2 ${
                        checkin.isWithinRadius 
                          ? 'border-green-600 bg-green-50' 
                          : 'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex items-center justify-center ${
                          checkin.isWithinRadius ? 'bg-green-600' : 'bg-yellow-500'
                        }`}>
                          {checkin.isWithinRadius 
                            ? <CheckCircle className="w-5 h-5 text-white" />
                            : <MapPin className="w-5 h-5 text-white" />
                          }
                        </div>
                        <div>
                          <div className="font-bold">
                            {checkin.userName || 'Usuário sem nome'}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {checkin.userEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {checkin.userEmail}
                              </span>
                            )}
                            {checkin.userPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {checkin.userPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={checkin.type === 'manual' ? 'default' : 'secondary'}
                            className={checkin.type === 'manual' 
                              ? 'bg-blue-600 hover:bg-blue-700 flex items-center gap-1' 
                              : 'bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1'
                            }
                          >
                            {checkin.type === 'manual' 
                              ? <><Smartphone className="w-3 h-3" /> NFC</>
                              : <><Zap className="w-3 h-3" /> Auto</>
                            }
                          </Badge>
                          <Badge variant={checkin.isWithinRadius ? 'default' : 'outline'} 
                            className={checkin.isWithinRadius ? 'bg-green-600' : 'text-yellow-600 border-yellow-500'}>
                            {checkin.distanceMeters}m
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(checkin.createdAt).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* All Today's Check-ins Summary */}
      {data?.allCheckins && data.allCheckins.length > 0 && (
        <Card className="border-4 border-black">
          <CardHeader className="bg-black text-white">
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Todos os Check-ins de Hoje ({data.allCheckins.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.allCheckins.slice(0, 20).map((checkin, index) => (
                <div 
                  key={`all-${checkin.id}-${index}`}
                  className="flex items-center justify-between p-2 border-b border-gray-200 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      checkin.isWithinRadius ? 'bg-green-600' : 'bg-yellow-500'
                    }`} />
                    <span className="font-medium">{checkin.userName || 'Sem nome'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{checkin.tagName || checkin.tagUid}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge 
                      variant="outline" 
                      className={`text-xs flex items-center gap-1 ${
                        checkin.type === 'manual' 
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-purple-600 text-purple-600'
                      }`}
                    >
                      {checkin.type === 'manual' 
                        ? <><Smartphone className="w-3 h-3" /> NFC</>
                        : <><Zap className="w-3 h-3" /> Auto</>
                      }
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(checkin.createdAt).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
              {data.allCheckins.length > 20 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... e mais {data.allCheckins.length - 20} check-ins
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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
