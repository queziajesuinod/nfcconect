import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { MapPin, CheckCircle, XCircle, Clock, User, Nfc, Zap, Hand } from "lucide-react";

export default function Checkins() {
  const { data: checkins, isLoading } = trpc.checkins.list.useQuery({ limit: 100 });
  const { data: stats } = trpc.checkins.stats.useQuery();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
              Monitoramento
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl">Check-ins</h1>
          <p className="text-gray-600 mt-2">
            Registros de check-in por proximidade de tags NFC (manuais e automáticos)
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border-4 border-black p-6 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-black flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold uppercase text-gray-600">Total Check-ins</span>
              </div>
              <p className="text-4xl font-black">{stats.totalCheckins || 0}</p>
            </div>
            
            <div className="border-4 border-black p-6 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-600 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold uppercase text-gray-600">Dentro do Raio</span>
              </div>
              <p className="text-4xl font-black text-green-600">{stats.checkinsWithinRadius || 0}</p>
            </div>
            
            <div className="border-4 border-black p-6 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-600 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold uppercase text-gray-600">Fora do Raio</span>
              </div>
              <p className="text-4xl font-black text-red-600">{stats.checkinsOutsideRadius || 0}</p>
            </div>
            
            <div className="border-4 border-black p-6 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-600 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold uppercase text-gray-600">Hoje</span>
              </div>
              <p className="text-4xl font-black">{stats.checkinsToday || 0}</p>
            </div>
          </div>
        )}

        {/* Check-ins List */}
        <div>
          <h2 className="text-2xl font-black mb-4">Histórico de Check-ins</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-4 border-black p-6 bg-gray-50 animate-pulse h-24" />
              ))}
            </div>
          ) : checkins && checkins.length > 0 ? (
            <div className="space-y-0">
              {checkins.map((checkin, index) => (
                <div
                  key={`${checkin.type}-${checkin.id}`}
                  className={`border-4 border-black p-4 bg-white hover:bg-gray-50 transition-colors ${index > 0 ? '-mt-1' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 flex items-center justify-center ${checkin.isWithinRadius ? 'bg-green-600' : 'bg-red-600'}`}>
                        {checkin.isWithinRadius ? (
                          <CheckCircle className="w-7 h-7 text-white" />
                        ) : (
                          <XCircle className="w-7 h-7 text-white" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-bold">
                            {checkin.userName || "Usuário Anônimo"}
                          </span>
                          {/* Type badge */}
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            checkin.type === 'automatic' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {checkin.type === 'automatic' ? (
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Auto
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Hand className="w-3 h-3" /> Manual
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Nfc className="w-3 h-3" />
                          <span className="font-mono">{checkin.tagName || checkin.tagUid || "Tag desconhecida"}</span>
                          {checkin.scheduleName && (
                            <span className="text-xs text-gray-500">
                              • {checkin.scheduleName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:items-end gap-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className={`font-bold ${checkin.isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                          {checkin.distanceMeters !== null ? `${checkin.distanceMeters}m` : "N/A"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {checkin.isWithinRadius ? "(dentro do raio)" : "(fora do raio)"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(checkin.createdAt)}
                      </span>
                      {checkin.scheduleStartTime && checkin.scheduleEndTime && (
                        <span className="text-xs text-gray-400">
                          Período: {checkin.scheduleStartTime} - {checkin.scheduleEndTime}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {checkin.latitude && checkin.longitude && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500 font-mono">
                        Coordenadas: {parseFloat(checkin.latitude).toFixed(6)}, {parseFloat(checkin.longitude).toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-4 border-black p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="mb-2">Nenhum Check-in</h3>
              <p className="text-gray-500">
                Ainda não há registros de check-in. Configure uma tag com check-in habilitado para começar.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
