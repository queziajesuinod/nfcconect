import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type TargetType = "group" | "users" | "schedule" | "firstTime";

type SendSummary = {
  attempted: number;
  sent: number;
  errors: Array<{ number: string; message: string }>;
  skipped: number;
  target: {
    type: TargetType;
    label: string;
    delayMs: number;
  };
};

type BroadcastPreview = {
  attempted: number;
  label: string;
  skipped: number;
};

const targetOptions: Array<{ label: string; value: TargetType }> = [
  { label: "Grupo", value: "group" },
  { label: "Usuários", value: "users" },
  { label: "Check-ins (agendamento)", value: "schedule" },
  { label: "Primeiro check-in", value: "firstTime" },
];

const placeholders = [
  "{{name}}",
  "{{date}}",
  "{{scheduledDate}}",
  "{{link}}",
  "{{deviceId}}",
  "\\n (neste campo representa ENTER no Evo)",
];

export default function Disparos() {
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("group");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [userIdsInput, setUserIdsInput] = useState("");
  const [phoneNumbersInput, setPhoneNumbersInput] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [inFlightProgress, setInFlightProgress] = useState<{
    attempted: number;
    success: number;
    errors: number;
    skipped: number;
    label: string;
  } | null>(null);
  const [delayInput, setDelayInput] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [isSavingDelay, setIsSavingDelay] = useState(false);
  const trpcContext = trpc.useContext();

  const templatesQuery = trpc.broadcast.templates.list.useQuery();
  const groupsQuery = trpc.groups.list.useQuery({ page: 1, pageSize: 50 });
  const schedulesQuery = trpc.schedules.list.useQuery({ page: 1, pageSize: 50 });
  const delaySettingsQuery = trpc.broadcast.settings.get.useQuery();
  const userSearchQuery = trpc.nfcUsers.search.useQuery(
    { term: userSearchTerm, limit: 12 },
    {
      enabled: Boolean(userSearchTerm.trim()),
      refetchOnWindowFocus: false,
    }
  );

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) return;
    setIsSavingTemplate(true);
    try {
      await trpcContext.client.broadcast.templates.create.mutate({
        id: selectedTemplateId ?? undefined,
        name: templateName,
        content: templateContent,
      });
      setTemplateName("");
      setTemplateContent("");
      setSelectedTemplateId(null);
      setMessageContent("");
      templatesQuery.refetch();
      toast.success("Modelo salvo");
    } catch (error) {
      toast.error((error as any)?.message || "Falha ao salvar modelo");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm("Tem certeza que deseja excluir este modelo?")) return;
    setIsDeletingTemplate(true);
    try {
      await trpcContext.client.broadcast.templates.delete.mutate({ id: selectedTemplateId });
      setTemplateName("");
      setTemplateContent("");
      setSelectedTemplateId(null);
      setMessageContent("");
      templatesQuery.refetch();
      toast.success("Modelo excluído");
    } catch (error) {
      toast.error((error as any)?.message || "Falha ao excluir modelo");
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const handleSaveDelay = async () => {
    if (!isDelayInputValid) return;
    setIsSavingDelay(true);
    try {
      const delayMs = Math.min(120000, Math.max(0, Math.floor(Number(delayInput))));
      await trpcContext.client.broadcast.settings.update.mutate({ delayMs });
      setDelayInput(String(delayMs));
      delaySettingsQuery.refetch();
      toast.success("Delay atualizado");
    } catch (error) {
      toast.error((error as any)?.message || "Falha ao salvar o delay");
    } finally {
      setIsSavingDelay(false);
    }
  };

  const availableTemplates = templatesQuery.data ?? [];
  const availableGroups = groupsQuery.data?.items ?? [];
  const availableSchedules = schedulesQuery.data?.items ?? [];

  const handleTemplateSelect = (value: string) => {
    if (!value) {
      setSelectedTemplateId(null);
      return;
    }
    const id = Number(value);
    const tpl = availableTemplates.find((item) => item.id === id);
    setSelectedTemplateId(tpl?.id ?? null);
    if (tpl?.content) {
      setMessageContent(tpl.content);
    }
  };

  const parseUserIds = useMemo(() => {
    return userIdsInput
      .split(/[\s,;]+/)
      .map((segment) => Number(segment.trim()))
      .filter((value) => Number.isFinite(value));
  }, [userIdsInput]);

  const parsePhoneNumbers = useMemo(() => {
    return phoneNumbersInput
      .split(/[\s,;]+/)
      .map((segment) => segment.replace(/\D/g, ""))
      .filter((value) => value.length > 0);
  }, [phoneNumbersInput]);

  const selectedUserIds = useMemo(() => new Set(parseUserIds), [parseUserIds]);

  const handleAddUserFromSearch = (user: { id: number; name?: string | null; phone?: string | null }) => {
    if (selectedUserIds.has(user.id)) {
      return;
    }
    const trimmed = userIdsInput.trim();
    const next = trimmed ? `${trimmed}, ${user.id}` : `${user.id}`;
    setUserIdsInput(next);
    setUserSearchTerm("");
  };

  useEffect(() => {
    if (delaySettingsQuery.data && delayInput === "") {
      setDelayInput(String(delaySettingsQuery.data.delayMs));
    }
  }, [delayInput, delaySettingsQuery.data]);

  const buildTargetPayload = () => {
    const target: any = { type: targetType };
    if (targetType === "group") {
      if (groupId) target.groupId = groupId;
    }
    if (targetType === "users") {
      if (parseUserIds.length) target.userIds = parseUserIds;
      if (parsePhoneNumbers.length) target.phoneNumbers = parsePhoneNumbers;
    }
    if (targetType === "schedule" || targetType === "firstTime") {
      if (scheduleId) target.scheduleId = scheduleId;
      if (scheduleDate) target.scheduleDate = scheduleDate;
    }
    return target;
  };

  const handleSend = async () => {
    const targetPayload = buildTargetPayload();
    const parsedDelay = Number(delayInput);
    const fallbackDelay = delaySettingsQuery.data?.delayMs ?? 0;
    const normalizedDelay =
      Number.isFinite(parsedDelay) && parsedDelay >= 0
        ? Math.min(120000, Math.max(0, Math.floor(parsedDelay)))
        : fallbackDelay;

    const payload = {
      templateId: selectedTemplateId ?? undefined,
      content: messageContent.trim() || undefined,
      link: linkValue.trim() || undefined,
      target: targetPayload,
      delayMs: normalizedDelay,
    };

    setSummary(null);
    setIsPreviewing(true);
    setInFlightProgress(null);

    try {
      const previewResult = await trpc.broadcast.preview.fetch({ target: targetPayload });
      if (!previewResult.attempted) {
        toast.error("Nenhum destinatário válido foi encontrado para este envio.");
        return;
      }
      setInFlightProgress({
        attempted: previewResult.attempted,
        success: 0,
        errors: 0,
        skipped: previewResult.skipped,
        label: previewResult.label,
      });

      setIsSending(true);
      const result = (await trpcContext.client.broadcast.send.mutate(payload)) as SendSummary;
      setSummary(result);
      setInFlightProgress({
        attempted: result.attempted,
        success: result.sent,
        errors: result.errors.length,
        skipped: result.skipped,
        label: result.target.label,
      });
      toast.success("Disparo enviado");
    } catch (error) {
      setInFlightProgress(null);
      toast.error((error as any)?.message || "Falha ao enviar o disparo.");
    } finally {
      setIsPreviewing(false);
      setIsSending(false);
    }
  };

  const isSendDisabled =
    isSending || isPreviewing || (!(messageContent.trim() || selectedTemplateId));
  const progressPercent = inFlightProgress
    ? isSending
      ? 50
      : inFlightProgress.attempted
        ? Math.min(
            100,
            Math.round(
              ((inFlightProgress.success + inFlightProgress.errors) / inFlightProgress.attempted) * 100
            )
          )
        : 0
    : 0;
  const parsedDelayValue = Number(delayInput);
  const isDelayInputValid = Number.isFinite(parsedDelayValue) && parsedDelayValue >= 0 && parsedDelayValue <= 120000;

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black flex items-center justify-center">
            <span className="text-white font-black uppercase text-xl">⚡</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em]">Disparos</p>
            <h1 className="text-3xl font-black">Crie modelos e dispare mensagens</h1>
          </div>
        </div>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Modelos de mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase">Nome do modelo</Label>
                <Input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Ex: Lembrete de check-in"
                  className="border-2 border-black rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase">Conteúdo do modelo</Label>
                <Textarea
                  value={templateContent}
                  onChange={(event) => setTemplateContent(event.target.value)}
                  rows={3}
                  className="border-2 border-black rounded-none"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim() || !templateContent.trim()}
              className="border-2 border-black rounded-none w-full font-bold uppercase"
            >
              {isSavingTemplate ? "Salvando..." : "Salvar modelo"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={!selectedTemplateId || isDeletingTemplate}
              className="border-2 border-black rounded-none w-full font-bold uppercase"
            >
              {isDeletingTemplate ? "Excluindo..." : "Excluir modelo"}
            </Button>
            <div>
              <p className="text-xs uppercase text-gray-500">Modelos disponíveis</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTemplates.length ? (
                  availableTemplates.map((tpl) => (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => {
                        setTemplateName(tpl.name);
                        setTemplateContent(tpl.content);
                        setSelectedTemplateId(tpl.id);
                        setMessageContent(tpl.content);
                      }}
                      className="border border-black px-2 py-1 text-xs font-bold uppercase rounded-none focus:outline-none bg-white"
                    >
                      {tpl.name}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">Nenhum modelo cadastrado</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Configurar disparo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase">Escolher modelo</Label>
              <select
                value={selectedTemplateId ?? ""}
                onChange={(event) => handleTemplateSelect(event.target.value)}
                className="w-full border-2 border-black rounded-none p-2 text-sm"
              >
                <option value="">-- usar modelo ou conteúdo manual --</option>
                {availableTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase">Conteúdo</Label>
              <Textarea
                value={messageContent}
                onChange={(event) => setMessageContent(event.target.value)}
                rows={6}
                className="border-2 border-black rounded-none"
              />
              <p className="text-xs text-gray-500">
                Use <code className="font-mono">{"\\n"}</code> para quebra de linha no Evo e inclua{" "}
                <code className="font-mono">{'{{name}}'}</code>,{" "}
                <code className="font-mono">{'{{date}}'}</code>,{" "}
                <code className="font-mono">{'{{scheduledDate}}'}</code>,{" "}
                <code className="font-mono">{'{{link}}'}</code> e{" "}
                <code className="font-mono">{'{{deviceId}}'}</code> para personalização.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase">Tipo de envio</Label>
              <div className="flex flex-wrap gap-2">
                {targetOptions.map((option) => {
                  const isActive = option.value === targetType;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTargetType(option.value)}
                      className={`px-3 py-1 border-2 border-black uppercase text-xs font-bold rounded-none transition ${
                        isActive ? "bg-black text-white" : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {targetType === "group" && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase">Grupo</Label>
                  <select
                    value={groupId ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value) || null;
                      setGroupId(value);
                      const group = availableGroups.find((item) => item.id === value);
                      if (group?.redirectUrl) {
                        setLinkValue(group.redirectUrl);
                      }
                    }}
                    className="w-full border-2 border-black rounded-none p-2 text-sm"
                  >
                  <option value="">Selecione um grupo</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.totalUsers ?? 0} usuários)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "users" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase">Buscar usuários</Label>
                  <Input
                    value={userSearchTerm}
                    onChange={(event) => setUserSearchTerm(event.target.value)}
                    placeholder="Nome, e-mail ou telefone"
                    className="border-2 border-black rounded-none"
                  />
                  {userSearchTerm.trim() && (
                    <div className="border border-black rounded-none p-2 max-h-40 overflow-auto bg-white">
                      {userSearchQuery.isLoading && (
                        <p className="text-xs text-gray-500">Buscando...</p>
                      )}
                      {!userSearchQuery.isLoading && !userSearchQuery.data?.length && (
                        <p className="text-xs text-gray-500">Nenhuma sugestão encontrada.</p>
                      )}
                      {!userSearchQuery.isLoading && userSearchQuery.data?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {userSearchQuery.data.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleAddUserFromSearch(user)}
                              className="text-xs border border-black rounded-none px-2 py-1 font-bold uppercase"
                            >
                              {user.name || user.email || `Usuário ${user.id}`} ({user.id})
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {parseUserIds.length > 0 && (
                    <p className="text-xs text-gray-500">
                      IDs selecionados: {parseUserIds.join(", ")}
                    </p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase">IDs de usuários (cada um separado por vírgula)</Label>
                    <Textarea
                      value={userIdsInput}
                      onChange={(event) => setUserIdsInput(event.target.value)}
                      rows={3}
                      className="border-2 border-black rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase">Telefones (DDD + número)</Label>
                    <Textarea
                      value={phoneNumbersInput}
                      onChange={(event) => setPhoneNumbersInput(event.target.value)}
                      rows={3}
                      className="border-2 border-black rounded-none"
                    />
                    <p className="text-xs text-gray-500">Apenas números serão considerados, o prefixo +55 é aplicado automaticamente.</p>
                  </div>
                </div>
              </div>
            )}

            {(targetType === "schedule" || targetType === "firstTime") && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase">Agendamento</Label>
                  <select
                    value={scheduleId ?? ""}
                    onChange={(event) => setScheduleId(Number(event.target.value) || null)}
                    className="w-full border-2 border-black rounded-none p-2 text-sm"
                  >
                    <option value="">Selecione um agendamento</option>
                    {availableSchedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name || `ID ${schedule.id}`} - {schedule.tag?.name || schedule.tag?.uid || "Tag"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase">Data</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    className="border-2 border-black rounded-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs uppercase">Link opcional</Label>
              <Input
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://..."
                className="border-2 border-black rounded-none"
              />
            </div>

            <Button
              variant="secondary"
              onClick={() => void handleSend()}
              disabled={isSendDisabled}
              className="border-2 border-black rounded-none w-full font-bold uppercase"
            >
              {isSending ? "Enviando..." : "Enviar disparo"}
            </Button>
          </CardContent>
        </Card>

        {inFlightProgress && (
          <Card className="border-4 border-black">
            <CardHeader>
              <CardTitle className="font-black">Progresso do disparo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs uppercase text-gray-500">
                {isSending ? "Enviando para" : "Ultimo envio:"} {inFlightProgress.label}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-black transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs uppercase">
                <p>Tentados: {inFlightProgress.attempted}</p>
                <p>Sucesso: {inFlightProgress.success}</p>
                <p>Erros: {inFlightProgress.errors}</p>
                <p>Pulos: {inFlightProgress.skipped}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card className="border-4 border-black">
            <CardHeader>
              <CardTitle className="font-black">Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Tipo: {summary.target.label} ({summary.target.type})</p>
              <p className="text-sm">Delay entre mensagens: {summary.target.delayMs ?? 0} ms</p>
              <p className="text-sm">Destinatários: {summary.attempted}</p>
              <p className="text-sm">Enviados com sucesso: {summary.sent}</p>
              <p className="text-sm">Pulos por falta de telefone: {summary.skipped}</p>
              {summary.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase">Erros</p>
                  {summary.errors.map((error) => (
                    <p key={error.number} className="text-xs text-red-600">
                      {error.number}: {error.message}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Delay entre mensagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase">Delay (ms)</Label>
              <Input
                value={delayInput}
                onChange={(event) => setDelayInput(event.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="border-2 border-black rounded-none"
              />
              <p className="text-xs text-gray-500">
                0 a 120000 ms. Valor salvo: {delaySettingsQuery.data?.delayMs ?? 0} ms.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleSaveDelay}
              disabled={isSavingDelay || !isDelayInputValid}
              className="border-2 border-black rounded-none w-full font-bold uppercase"
            >
              {isSavingDelay ? "Salvando..." : "Salvar delay"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-4 border-black">
          <CardHeader>
            <CardTitle className="font-black">Variáveis suportadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {placeholders.map((item) => (
              <span key={item} className="border border-black px-2 py-1 text-xs font-mono rounded-none">
                {item}
              </span>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
