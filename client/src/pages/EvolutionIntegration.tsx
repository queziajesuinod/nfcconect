import { useMemo, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Zap, RefreshCw } from "lucide-react";
import type { EvoConnectionResponse, EvoQrResponse } from "@shared/types/evolution";

const DEFAULT_TEST_MESSAGE = "Teste de conexão via Evolution API.";

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const errorLike = err as {
      message?: string;
      response?: { data?: { error?: string; message?: string } };
    };
    if (errorLike.response?.data?.error) {
      return errorLike.response.data.error;
    }
    if (errorLike.response?.data?.message) {
      return errorLike.response.data.message;
    }
    if (errorLike.message) {
      return errorLike.message;
    }
  }
  return fallback;
}

function resolveInstanceState(instance?: Record<string, unknown> | null): string | null {
  if (!instance) {
    return null;
  }
  const raw = instance.state;
  if (typeof raw === "string" && raw) return raw;
  if (raw != null) return String(raw);
  return null;
}

function QrCodeViewer({ base64 }: { base64?: string | null }) {
  if (!base64) return null;
  const src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  return (
    <div className="py-2">
      <img
        src={src}
        alt="QR Code Evolution"
        className="w-full max-w-xs mx-auto rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
      />
    </div>
  );
}

export default function EvolutionIntegration() {
  const [instanceName, setInstanceName] = useState("");
  const [qrPayload, setQrPayload] = useState<EvoQrResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState("79999999999");
  const [message, setMessage] = useState(DEFAULT_TEST_MESSAGE);
  const [testResult, setTestResult] = useState<{ severity: "success" | "error"; message: string; at: Date } | null>(null);

  const trimmedInstanceName = useMemo(() => instanceName.trim(), [instanceName]);
  const sanitizedPhoneDigits = useMemo(() => phoneInput.replace(/\D/g, ""), [phoneInput]);
  const normalizedPhoneDigits = useMemo(() => {
    if (!sanitizedPhoneDigits) return "";
    if (sanitizedPhoneDigits.length > 11 && sanitizedPhoneDigits.startsWith("55")) {
      return sanitizedPhoneDigits.slice(2);
    }
    return sanitizedPhoneDigits;
  }, [sanitizedPhoneDigits]);
  const formattedPhone = useMemo(
    () => (normalizedPhoneDigits ? `+55${normalizedPhoneDigits}` : ""),
    [normalizedPhoneDigits]
  );
  const requestPhone = useMemo(
    () => (normalizedPhoneDigits ? `55${normalizedPhoneDigits}` : ""),
    [normalizedPhoneDigits]
  );

  const integrationQuery = trpc.evolution.userIntegration.useQuery();
  const resolvedInstanceName = useMemo(
    () => trimmedInstanceName || integrationQuery.data?.instanceName || "",
    [trimmedInstanceName, integrationQuery.data?.instanceName]
  );
  useEffect(() => {
    if (!instanceName && integrationQuery.data?.instanceName) {
      setInstanceName(integrationQuery.data.instanceName);
    }
  }, [instanceName, integrationQuery.data?.instanceName]);
  const enabled = Boolean(resolvedInstanceName);
  const statusQuery = trpc.evolution.getConnectionState.useQuery(
    { instanceName: resolvedInstanceName },
    {
      enabled: Boolean(resolvedInstanceName),
      refetchOnWindowFocus: false,
    }
  );

  const statusData = statusQuery.data as EvoConnectionResponse | undefined;
  const connectionStatus =
    statusData?.connectionStatus ??
    resolveInstanceState(statusData?.instance) ??
    "unknown";
  const connectionStatusLower = connectionStatus.toLowerCase();
  const isConnected = connectionStatusLower === "open";
  const isClosed = connectionStatusLower === "close" || connectionStatusLower === "closed";
  const shouldPollQr = enabled && !isConnected;
  const instanceDisplayName = String(
    statusData?.instance?.instanceName ?? resolvedInstanceName ?? "-"
  );

  const qrQuery = trpc.evolution.getQrCode.useQuery(
    { instanceName: resolvedInstanceName },
    {
      enabled: shouldPollQr,
      refetchOnWindowFocus: false,
      refetchInterval: shouldPollQr ? 15000 : false,
    }
  );
  const qrData = qrQuery.data as EvoQrResponse | undefined;

  const connectMutation = trpc.evolution.connectInstance.useMutation({
    onMutate: () => setErrorMessage(null),
    onSuccess: (data) => {
      setQrPayload(data ?? null);
      setQrCountdown(29);
      setErrorMessage(null);
      statusQuery.refetch();
      integrationQuery.refetch();
    },
    onError: (err) => {
      setErrorMessage(getErrorMessage(err, "Falha ao gerar QR code"));
    },
  });

  const restartMutation = trpc.evolution.restartInstance.useMutation({
    onMutate: () => setErrorMessage(null),
    onSuccess: (data) => {
      setQrPayload(data ?? null);
      setQrCountdown(29);
      setErrorMessage(null);
      statusQuery.refetch();
      integrationQuery.refetch();
    },
    onError: (err) => {
      setErrorMessage(getErrorMessage(err, "Falha ao gerar QR code"));
    },
  });

  const disconnectMutation = trpc.evolution.disconnectInstance.useMutation({
    onSuccess: () => {
      setQrPayload(null);
      setQrCountdown(null);
      setErrorMessage(null);
      statusQuery.refetch();
      integrationQuery.refetch();
    },
    onError: (err) => {
      setErrorMessage(getErrorMessage(err, "Falha ao desconectar"));
    },
  });

  const createMutation = trpc.evolution.createInstance.useMutation({
    async onSuccess(data) {
      setInstanceName(data.instanceName);
      await integrationQuery.refetch();
      connectMutation.mutate({ instanceName: data.instanceName });
      toast.success("Instância criada e QR code solicitado");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Erro ao criar instância"));
    },
  });

  const sendTestMutation = trpc.evolution.sendTestMessage.useMutation({
    onMutate: () => setTestResult(null),
    onSuccess: () => {
      setTestResult({
        severity: "success",
        message: `Mensagem de teste enviada para ${formattedPhone}`,
        at: new Date(),
      });
    },
    onError: (err) => {
      setTestResult({
        severity: "error",
        message: getErrorMessage(err, "Erro ao enviar mensagem"),
        at: new Date(),
      });
    },
  });

  useEffect(() => {
    if (qrData) {
      setQrPayload(qrData);
      if (!isConnected) setQrCountdown(29);
    }
  }, [qrData, isConnected]);

  useEffect(() => {
    if (!qrPayload?.qrcode || isConnected) {
      setQrCountdown(null);
      return;
    }
    const id = setInterval(() => {
      setQrCountdown((prev) => (prev != null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(id);
  }, [qrPayload?.qrcode, isConnected]);

  useEffect(() => {
    if (qrCountdown == null) return;
    if (
      qrCountdown <= 0 &&
      !connectMutation.isPending &&
      !restartMutation.isPending &&
      shouldPollQr &&
      resolvedInstanceName
    ) {
      connectMutation.mutate({ instanceName: resolvedInstanceName });
    }
  }, [qrCountdown, connectMutation.isPending, restartMutation.isPending, resolvedInstanceName, shouldPollQr]);

  useEffect(() => {
    if (!isConnected && enabled) {
      const id = setInterval(() => statusQuery.refetch(), 5000);
      return () => clearInterval(id);
    }
  }, [isConnected, enabled, statusQuery]);

  const handleCreateAndConnect = () => {
    if (!trimmedInstanceName) {
      toast.error("Informe o nome da instância");
      return;
    }
    createMutation.mutate({ name: trimmedInstanceName });
  };

  const handleGenerateQr = () => {
    if (!resolvedInstanceName) {
      toast.error("Informe o nome da instância");
      return;
    }
    connectMutation.mutate({ instanceName: resolvedInstanceName });
  };

  const showLifecycleControls = Boolean(resolvedInstanceName && statusData);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="border-b-4 border-black pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-black flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
              Evolution API
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl">Conexão via QR Code</h1>
        </div>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Instância Evolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase">Nome da instância</Label>
              <Input
                value={instanceName}
                onChange={(event) => setInstanceName(event.target.value)}
                placeholder="ex: IECG_CONTATO"
                className="border-2 border-black rounded-none mt-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {!isConnected && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCreateAndConnect}
                    disabled={createMutation.isPending}
                    className="border-2 border-black rounded-none font-bold uppercase"
                  >
                    {createMutation.isPending ? "Criando..." : "Criar & conectar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateQr}
                    disabled={connectMutation.isPending}
                    className="border-2 border-black rounded-none font-bold uppercase"
                  >
                    {connectMutation.isPending ? "Gerando..." : "Gerar QR"}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => statusQuery.refetch()}
                disabled={statusQuery.isLoading}
                className="border-2 border-black rounded-none font-bold uppercase"
              >
                {statusQuery.isLoading ? "Validando..." : "Validar conexão"}
              </Button>
              {showLifecycleControls && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => restartMutation.mutate({ instanceName: resolvedInstanceName })}
                    disabled={restartMutation.isPending}
                    className="border-2 border-black rounded-none font-bold uppercase"
                  >
                    {restartMutation.isPending ? "Reconectando..." : "Reconectar"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate({ instanceName: resolvedInstanceName })}
                    disabled={disconnectMutation.isPending}
                    className="border-2 rounded-none font-bold uppercase"
                  >
                    {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Status da instância</CardTitle>
          </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <span className="font-bold">Instância:</span>{" "}
                {instanceDisplayName}
              </p>
            <p>
              <span className="font-bold">Status:</span> {connectionStatus.toUpperCase()}
            </p>
            {statusQuery.isLoading && <p className="text-sm text-gray-500">Atualizando status…</p>}
            {statusQuery.error && (
              <p className="text-sm text-red-600">
                {getErrorMessage(statusQuery.error, "Falha ao validar status")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {qrPayload?.qrcode ? (
              <>
                <div className="flex items-center gap-2 justify-between">
                  <p>
                    QR expira em <strong>{Math.max(qrCountdown ?? 0, 0)}s</strong>
                  </p>
                  {qrQuery.isFetching && <RefreshCw className="animate-spin" />}
                </div>
                <QrCodeViewer base64={qrPayload.qrcode as string | undefined} />
                {qrPayload.pairingCode && (
                  <p className="text-sm font-semibold">Pairing code: {qrPayload.pairingCode as string}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500">Nenhum QR code disponível.</p>
            )}
            {qrQuery.isError && shouldPollQr && (
              <p className="text-sm text-red-600">Erro ao buscar QR code.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Mensagem de teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs uppercase">Número (DDD + telefone)</Label>
              <Input
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value.replace(/\D/g, ""))}
                placeholder="11999990000"
                className="border-2 border-black rounded-none mt-1"
              />
              <p className="text-xs text-gray-500">O prefixo +55 será aplicado automaticamente.</p>
            </div>
            <div>
              <Label className="text-xs uppercase">Conteúdo</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                className="border-2 border-black rounded-none mt-1"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                sendTestMutation.mutate({
                  instanceName: resolvedInstanceName,
                  number: requestPhone,
                  text: message,
                })
              }
              disabled={!isConnected || sendTestMutation.isPending || !requestPhone}
              className="w-full border-2 border-black rounded-none font-bold uppercase"
            >
              {sendTestMutation.isPending ? "Enviando..." : "Enviar mensagem de teste"}
            </Button>
            {testResult && (
              <p className={`text-sm ${testResult.severity === "success" ? "text-green-600" : "text-red-600"}`}>
                {testResult.message}
              </p>
            )}
          </CardContent>
        </Card>


        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      </div>
    </DashboardLayout>
  );
}
