import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { sendMediaMessage, sendTextMessage, sendWhatsAppAudio } from "../services/evolution";
import {
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplatesByUserId,
  getMessageTemplateById,
  getUserEvolutionIntegrationByUserId,
  getGroupUsers,
  getNfcUserById,
  getCheckinScheduleById,
  getAutomaticCheckinsForScheduleDate,
  getFirstTimeAutomaticCheckinsForScheduleDate,
  getNotificationGroupById,
  getBroadcastSettingByUserId,
  upsertBroadcastSetting,
} from "../db";

type BroadcastTargetInput = {
  type: "group" | "users" | "schedule" | "firstTime";
  groupId?: number;
  userIds?: number[];
  phoneNumbers?: string[];
  scheduleId?: number;
  scheduleDate?: string;
};

type BroadcastRecipient = {
  phoneLocal?: string | null;
  phone: string;
  name?: string | null;
  email?: string | null;
  userId?: number;
  deviceId?: string | null;
};

type AttachmentPayload = {
  type: "image" | "audio" | "document";
  base64: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  mediaType?: "image" | "video" | "document";
  encoding?: boolean;
};

const targetSchema = z
  .object({
    type: z.enum(["group", "users", "schedule", "firstTime"]),
    groupId: z.number().positive().optional(),
    userIds: z.array(z.number().positive()).optional(),
    phoneNumbers: z.array(z.string().min(1)).optional(),
    scheduleId: z.number().positive().optional(),
    scheduleDate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "group" && !value.groupId) {
      ctx.addIssue({ code: "custom", message: "Informe um grupo", path: ["groupId"] });
    }
    if (value.type === "users" && !(value.userIds?.length || value.phoneNumbers?.length)) {
      ctx.addIssue({ code: "custom", message: "Informe usuários ou números", path: ["userIds"] });
    }
    if ((value.type === "schedule" || value.type === "firstTime") && !value.scheduleId) {
      ctx.addIssue({ code: "custom", message: "Informe um agendamento", path: ["scheduleId"] });
    }
    if ((value.type === "schedule" || value.type === "firstTime") && !value.scheduleDate) {
      ctx.addIssue({ code: "custom", message: "Informe a data do agendamento", path: ["scheduleDate"] });
    }
    if ((value.type === "schedule" || value.type === "firstTime") && value.scheduleDate) {
      const parsed = Date.parse(value.scheduleDate);
      if (Number.isNaN(parsed)) {
        ctx.addIssue({
          code: "custom",
          message: "Data inválida",
          path: ["scheduleDate"],
        });
      }
    }
  });

const attachmentSchema = z.object({
  type: z.enum(["image", "audio", "document"]),
  base64: z.string().min(1),
  fileName: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  caption: z.string().optional(),
  mediaType: z.enum(["image", "video", "document"]).optional(),
});

function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function extractLocalPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function renderTemplate(template: string, values: Record<string, string>) {
  let text = template.replace(/\\n/g, "\n");
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return values[key] ?? values[key.toLowerCase()] ?? "";
  });
}

async function resolveRecipients(target: BroadcastTargetInput) {
  const seen = new Set<string>();
  let label = "destinatários";
  let skipped = 0;
  const recipients: BroadcastRecipient[] = [];

    const addRecipient = (candidate: BroadcastRecipient) => {
    const normalized = normalizePhoneNumber(candidate.phone);
    const local = extractLocalPhone(candidate.phone);
    if (!normalized) {
      skipped += 1;
      return;
    }
    if (seen.has(normalized)) return;
    seen.add(normalized);
    recipients.push({ ...candidate, phone: normalized, phoneLocal: local });
  };

    if (target.type === "group") {
      const users = await getGroupUsers(target.groupId!);
      const group = await getNotificationGroupById(target.groupId!);
      label = group?.name || `Grupo ${target.groupId}`;
      users.forEach(user => {
      addRecipient({
        phone: user.userPhone || "",
        name: user.userName || user.userEmail || null,
        email: user.userEmail || null,
        userId: user.nfcUserId,
        deviceId: user.deviceId || null,
      });
      });
      return { recipients, label, skipped };
    }

    if (target.type === "users") {
      label = "Usuários selecionados";
      if (target.userIds?.length) {
        for (const id of target.userIds) {
          const user = await getNfcUserById(id);
          if (!user) continue;
          addRecipient({
            phone: user.phone || "",
            name: user.name || user.email || null,
            email: user.email || null,
            userId: user.id,
            deviceId: user.deviceId || null,
          });
        }
      }
    if (target.phoneNumbers?.length) {
      target.phoneNumbers.forEach(raw => {
        if (!raw) return;
        addRecipient({ phone: raw, name: null });
      });
    }
    return { recipients, label, skipped };
  }

  const schedule = await getCheckinScheduleById(target.scheduleId!);
  if (!schedule) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
  }
  label = schedule.name || `Agendamento ${schedule.id}`;
  const parsedDate = new Date(target.scheduleDate!);
  const checkins =
    target.type === "firstTime"
      ? await getFirstTimeAutomaticCheckinsForScheduleDate(schedule.id, parsedDate)
      : await getAutomaticCheckinsForScheduleDate(schedule.id, parsedDate);

  checkins.forEach(checkin => {
          addRecipient({
            phone: checkin.userPhone || "",
            name: checkin.userName || null,
            userId: checkin.nfcUserId,
            deviceId: checkin.deviceId || null,
          });
  });
  return { recipients, label, skipped };
}

export const broadcastRouter = router({
  templates: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return getMessageTemplatesByUserId(ctx.user!.id);
    }),
    create: adminProcedure
      .input(
        z.object({
          id: z.number().positive().optional(),
          name: z.string().min(1),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.id) {
          return updateMessageTemplate({
            id: input.id,
            userId: ctx.user!.id,
            name: input.name,
            content: input.content,
          });
        }
        return createMessageTemplate({
          userId: ctx.user!.id,
          name: input.name,
          content: input.content,
        });
    }),
    delete: adminProcedure
      .input(z.object({ id: z.number().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteMessageTemplate({ id: input.id, userId: ctx.user!.id });
        return { success: true };
      }),
  }),
  preview: adminProcedure
    .input(
      z.object({
        target: targetSchema,
      })
    )
    .query(async ({ input }) => {
      const { recipients, label, skipped } = await resolveRecipients(input.target);
      return {
        attempted: recipients.length,
        label,
        skipped,
      };
    }),

  send: adminProcedure
    .input(
      z
        .object({
          templateId: z.number().positive().optional(),
          content: z.string().min(1).optional(),
          target: targetSchema,
          link: z.string().url().optional(),
          delayMs: z.number().min(0).max(120000).optional(),
          attachments: z.array(attachmentSchema).optional(),
        })
        .superRefine((data, ctx) => {
          if (!data.content && !data.templateId && !(data.attachments?.length)) {
            ctx.addIssue({
              code: "custom",
              message: "Informe um modelo ou escreva o conteúdo manualmente.",
              path: ["content"],
            });
          }
        })
    )
    .mutation(async ({ input, ctx }) => {
      const template = input.templateId
        ? await getMessageTemplateById(input.templateId)
        : null;
      if (input.templateId && (!template || template.userId !== ctx.user!.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado" });
      }

      const content = (input.content || template?.content || "").trim();
      if (!content) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Conteúdo vazio" });
      }

      const integration = await getUserEvolutionIntegrationByUserId(ctx.user!.id);
      if (!integration?.instanceName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Configure a instância Evolution antes de enviar mensagens.",
        });
      }

      const { recipients, label, skipped } = await resolveRecipients(input.target);
      if (!recipients.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum destinatário válido foi encontrado." });
      }

      const dateLabel = new Date().toLocaleDateString("pt-BR");
      const scheduledLabel =
        input.target.scheduleDate && !Number.isNaN(Date.parse(input.target.scheduleDate))
          ? new Date(input.target.scheduleDate).toLocaleDateString("pt-BR")
          : dateLabel;
      const linkValue = input.link?.trim() || "";
      const attachments = (input.attachments ?? []) as AttachmentPayload[];
      const summaryErrors: Array<{ number: string; message: string }> = [];
      let successes = 0;
      const setting = await getBroadcastSettingByUserId(ctx.user!.id);
      const delayMs = input.delayMs != null ? input.delayMs : setting?.delayMs ?? 0;

      for (let idx = 0; idx < recipients.length; idx += 1) {
        const person = recipients[idx];
        const templateValues = {
          name: person.name || "Cliente",
          date: dateLabel,
          scheduledDate: scheduledLabel,
          target: label,
          deviceId: person.deviceId || "",
          phone: person.phoneLocal ?? person.phone ?? "",
          email: person.email || "",
        };
        const personalizedLink = linkValue ? renderTemplate(linkValue, templateValues) : "";
        const message = renderTemplate(content, {
          ...templateValues,
          link: personalizedLink,
        });
          try {
            if (message && message.trim()) {
              await sendTextMessage(integration.instanceName, {
                number: person.phone,
                text: message,
              });
            }
            for (const attachment of attachments) {
              try {
                if (attachment.type === "audio") {
                  await sendWhatsAppAudio(integration.instanceName, {
                    number: person.phone,
                    audio: attachment.base64,
                    encoding: attachment.encoding ?? true,
                  });
                  continue;
                }
                await sendMediaMessage(integration.instanceName, {
                  number: person.phone,
                  base64: attachment.base64,
                  fileName: attachment.fileName,
                  mimeType:
                    attachment.mimeType ??
                    (attachment.mediaType === "video"
                      ? "video/mp4"
                      : attachment.mediaType === "document"
                      ? "application/pdf"
                      : "image/jpeg"),
                  caption: attachment.caption,
                  mediaType: attachment.mediaType ?? "image",
                });
              } catch (mediaError) {
                summaryErrors.push({
                  number: person.phone,
                  message:
                    `Erro ao enviar ${attachment.type}: ` +
                    `${(mediaError as any)?.message || "Erro desconhecido"}`,
                });
              }
            }
            successes += 1;
          } catch (error) {
            summaryErrors.push({
              number: person.phone,
              message: (error as any)?.message || "Erro desconhecido",
            });
          }
        if (delayMs > 0 && idx < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return {
        attempted: recipients.length,
        sent: successes,
        errors: summaryErrors,
        skipped,
        target: {
          type: input.target.type,
          label,
          delayMs,
        },
      };
    }),
  settings: router({
    get: adminProcedure.query(async ({ ctx }) => {
      return getBroadcastSettingByUserId(ctx.user!.id);
    }),
    update: adminProcedure
      .input(z.object({ delayMs: z.number().min(0).max(120000) }))
      .mutation(async ({ input, ctx }) => {
        await upsertBroadcastSetting({
          userId: ctx.user!.id,
          delayMs: input.delayMs,
        });
        return { delayMs: input.delayMs };
      }),
  }),
});
