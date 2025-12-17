import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

const formatDate = (value: string) => {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
};

export default function CheckinHistory() {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString().split("T")[0];
  }, []);

  const [userId, setUserId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(formatDate(today));
  const [endDate, setEndDate] = useState<string>(formatDate(new Date().toISOString()));
  const [insideSchedule, setInsideSchedule] = useState<"any" | "inside" | "outside">("any");
  const [limit, setLimit] = useState(50);

  const usersQuery = trpc.nfcUsers.list.useQuery();

  const historyQuery = trpc.checkins.history.useQuery(
    {
      nfcUserId: userId ?? 0,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      insideSchedule: insideSchedule === "any" ? undefined : insideSchedule === "inside",
      limit,
    },
    { enabled: Boolean(userId) }
  );

  const logsQuery = trpc.checkins.logs.useQuery(
    {
      nfcUserId: userId ?? 0,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      limit,
    },
    { enabled: Boolean(userId) }
  );

  const insideLabel = useMemo(() => {
    if (insideSchedule === "inside") return "Dentro de agendamento";
    if (insideSchedule === "outside") return "Fora de agendamento";
    return "Todos";
  }, [insideSchedule]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Histórico por Dispositivo</h1>
            <p className="text-gray-600 mt-1">
              Filtre por dispositivo (NFC user), período e se o evento ocorreu dentro do agendamento ativo.
            </p>
          </div>
        </div>

        <Card className="border-4 border-black">
          <CardHeader className="grid gap-4 md:grid-cols-4">
            <div>
              <Label className="text-xs uppercase font-black mb-1">Dispositivo</Label>
              <select
                className="w-full border-2 border-black px-3 py-2 bg-white rounded-none"
                value={userId ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setUserId(Number.isNaN(value) ? null : value);
                }}
              >
                <option value="">Selecione um usuário</option>
                {usersQuery.data?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.deviceInfo || `ID ${user.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase font-black mb-1">Início (data)</Label>
              <input
                type="date"
                className="w-full border-2 border-black px-3 py-2 rounded-none"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase font-black mb-1">Fim (data)</Label>
              <input
                type="date"
                className="w-full border-2 border-black px-3 py-2 rounded-none"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase font-black mb-1">Dentro de agendamento?</Label>
              <select
                className="w-full border-2 border-black px-3 py-2 rounded-none"
                value={insideSchedule}
                onChange={(event) => setInsideSchedule(event.target.value as typeof insideSchedule)}
              >
                <option value="any">Todos</option>
                <option value="inside">Sim</option>
                <option value="outside">Não</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-black font-bold"
              onClick={() => historyQuery.refetch()}
              disabled={!userId}
            >
              <Search className="w-4 h-4 mr-2" />
                Buscar histórico
              </Button>
              <div className="text-xs text-gray-600">{insideLabel}</div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                Limite
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="w-20 border-2 border-black px-2 py-1 rounded-none text-sm"
                />
              </label>
            </div>

            {!userId && (
              <div className="p-6 border-2 border-dashed border-gray-300 text-gray-500 text-center">
                Selecione um dispositivo para ver o histórico.
              </div>
            )}

            {userId && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="p-2 text-left">Horário</th>
                        <th className="p-2 text-left">Tipo</th>
                        <th className="p-2 text-left">Tag</th>
                        <th className="p-2 text-right">Distância</th>
                        <th className="p-2 text-left">Dentro do raio</th>
                        <th className="p-2 text-left">Agendamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyQuery.data?.items.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100">
                          <td className="p-2 font-mono">
                            {new Date(entry.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-2">
                            <span className="font-semibold">
                              {entry.type === "manual" ? "Manual" : "Automático"}
                            </span>
                          </td>
                          <td className="p-2">
                            {entry.tagName || entry.tagUid || `Tag ${entry.tagId}`}
                          </td>
                          <td className="p-2 text-right">
                            {entry.distanceMeters !== null ? `${entry.distanceMeters}m` : "—"}
                          </td>
                          <td className="p-2">
                            {entry.isWithinRadius ? "Sim" : "Não"}
                          </td>
                          <td className="p-2">
                            {entry.scheduleName || "Fora do agendamento"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500">
                  Total encontrado: {historyQuery.data?.total ?? 0} registros.
                </div>
              </>
            )}
            {userId && (
              <>
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-black">
                      Logs do dispositivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logsQuery.isLoading ? (
                      <div className="text-sm text-gray-500">Carregando logs...</div>
                    ) : logsQuery.data?.items.length ? (
                      <div className="space-y-2 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs font-bold uppercase text-gray-500">
                          <tr>
                            <th className="p-2 text-left">Horário</th>
                            <th className="p-2 text-left">Device</th>
                            <th className="p-2 text-left">Ação</th>
                            <th className="p-2 text-left">Tag</th>
                            <th className="p-2 text-left">IP</th>
                            <th className="p-2 text-left">Detalhes</th>
                          </tr>
                          </thead>
                          <tbody>
                            {logsQuery.data.items.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100">
                            <td className="p-2 font-mono">
                              {new Date(log.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="p-2">{log.deviceName || log.deviceId || "-"}</td>
                            <td className="p-2">{log.action}</td>
                            <td className="p-2">
                              {log.tagId ? `Tag #${log.tagId}` : "-"}
                            </td>
                                <td className="p-2">{log.ipAddress || "-"}</td>
                                <td className="p-2 text-xs text-gray-500">
                                  {log.metadata || log.userAgent || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Sem logs para este dispositivo.</div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Total de logs: {logsQuery.data?.total ?? 0}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
