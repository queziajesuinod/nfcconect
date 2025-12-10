import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Activity, Nfc, UserPlus, Shield, ArrowRight, Ban } from "lucide-react";

export default function Logs() {
  const { data: logs, isLoading } = trpc.logs.list.useQuery({ limit: 100 });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionInfo = (action: string) => {
    const actions: Record<string, { icon: typeof Activity; label: string; color: string }> = {
      first_read: { icon: UserPlus, label: "PRIMEIRA LEITURA", color: "bg-green-600" },
      validation: { icon: Shield, label: "VALIDAÇÃO", color: "bg-blue-600" },
      redirect: { icon: ArrowRight, label: "REDIRECIONAMENTO", color: "bg-purple-600" },
      update: { icon: Nfc, label: "ATUALIZAÇÃO", color: "bg-yellow-500" },
      block: { icon: Ban, label: "BLOQUEIO", color: "bg-red-600" },
    };
    return actions[action] || { icon: Activity, label: action.toUpperCase(), color: "bg-gray-600" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
              Histórico
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl">Logs de<br />Conexões</h1>
          <p className="text-lg text-gray-600 mt-4">
            Registro de todas as interações com tags NFC
          </p>
        </div>

        {/* Stats Bar */}
        <div className="border-4 border-black p-4 bg-black text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6" />
            <span className="font-bold uppercase">Total de Registros:</span>
            <span className="text-2xl font-black">{logs?.length || 0}</span>
          </div>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-4 border-black p-4 bg-gray-50 animate-pulse h-24" />
            ))}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-0">
            {logs.map((log, index) => {
              const actionInfo = getActionInfo(log.action);
              const ActionIcon = actionInfo.icon;
              
              return (
                <div
                  key={log.id}
                  className={`border-4 border-black p-4 md:p-6 bg-white hover:bg-gray-50 transition-colors ${index > 0 ? '-mt-1' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Action Icon */}
                    <div className={`w-12 h-12 ${actionInfo.color} flex items-center justify-center shrink-0`}>
                      <ActionIcon className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Log Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className={`px-3 py-1 text-xs font-bold uppercase ${actionInfo.color} text-white`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-sm font-mono text-gray-500">
                          Tag #{log.tagId}
                        </span>
                        {log.nfcUserId && (
                          <span className="text-sm font-mono text-gray-500">
                            Usuário #{log.nfcUserId}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        {log.ipAddress && (
                          <span>
                            <span className="font-bold">IP:</span> {log.ipAddress}
                          </span>
                        )}
                        {log.userAgent && (
                          <span className="truncate max-w-xs" title={log.userAgent}>
                            <span className="font-bold">UA:</span> {log.userAgent.substring(0, 50)}...
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-4 border-black p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="mb-2">Nenhum Log</h3>
            <p className="text-gray-500">
              Os logs serão registrados automaticamente quando houver interações com as tags NFC.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
