import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  baseUrl,
  connectInstance,
  createInstance,
  deleteInstance,
  fetchInstances,
  formatInstanceName,
  getConnectionState,
  getQrCode,
  restartInstance,
  sendTextMessage,
} from "../services/evolution";
import type { EvoConnectionResponse, EvoQrResponse } from "@shared/types/evolution";
import {
  clearUserEvolutionIntegration,
  getUserEvolutionIntegrationByUserId,
  saveUserEvolutionIntegration,
} from "../db";
import type { TrpcContext } from "../_core/context";

type AdminCtx = TrpcContext & { user: NonNullable<TrpcContext["user"]> };

async function resolveInstanceName(ctx: AdminCtx, candidate?: string) {
  const userId = ctx.user.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
  }
  const trimmed = candidate?.trim();
  if (trimmed) return trimmed;
  const integration = await getUserEvolutionIntegrationByUserId(userId);
  if (integration?.instanceName) return integration.instanceName;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Nenhuma instância cadastrada. Informe ou crie uma instância Evolution.",
  });
}

async function persistIntegration(
  ctx: AdminCtx,
  instanceName: string,
  payload?: { connectionStatus?: string | null; pairingCode?: string | null; raw?: unknown }
) {
  await saveUserEvolutionIntegration({
    userId: ctx.user.id,
    instanceName,
    connectionStatus: payload?.connectionStatus ?? null,
    pairingCode: payload?.pairingCode ?? null,
    raw: payload?.raw ?? null,
  });
}

export const evolutionRouter = router({
  config: adminProcedure.query(async () => {
    const url = baseUrl();
    return {
      baseUrl: url,
      isConfigured: Boolean(url && ENV.evoApiKey),
      hasApiKey: Boolean(ENV.evoApiKey),
    };
  }),

  instances: adminProcedure.query(async () => {
    return fetchInstances();
  }),

  userIntegration: adminProcedure.query(async ({ ctx }) => {
    return getUserEvolutionIntegrationByUserId(ctx.user!.id);
  }),

  createInstance: adminProcedure
    .input(z.object({ name: z.string().min(1).max(64).optional() }))
    .mutation(async ({ input, ctx }) => {
      const requestedName = input.name?.trim();
      const normalizedName = formatInstanceName(requestedName || "NFC");
      const data: EvoQrResponse = await createInstance(normalizedName);
      await persistIntegration(ctx, normalizedName, {
        connectionStatus: data?.connectionStatus ?? "pending",
        pairingCode: (data as any)?.pairingCode ?? null,
        raw: data,
      });
      return {
        instanceName: normalizedName,
        data,
      };
    }),

  getConnectionState: adminProcedure
    .input(z.object({ instanceName: z.string().min(1).optional() }))
    .query(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      const data: EvoConnectionResponse = await getConnectionState(instanceName);
      await persistIntegration(ctx, instanceName, {
        connectionStatus:
          data?.connectionStatus ?? (data?.instance as Record<string, unknown>)?.state ?? null,
        pairingCode: (data as any)?.pairingCode ?? null,
        raw: data,
      });
      return data;
    }),

  getQrCode: adminProcedure
    .input(z.object({ instanceName: z.string().min(1).optional() }))
    .query(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      const data: EvoQrResponse = await getQrCode(instanceName);
      await persistIntegration(ctx, instanceName, {
        connectionStatus: (data as any)?.connectionStatus ?? null,
        pairingCode: (data as any)?.pairingCode ?? null,
        raw: data,
      });
      return data;
    }),

  connectInstance: adminProcedure
    .input(z.object({ instanceName: z.string().min(1).optional() }))
    .mutation(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      const data: EvoQrResponse = await connectInstance(instanceName);
      await persistIntegration(ctx, instanceName, {
        connectionStatus: "pending",
        pairingCode: (data as any)?.pairingCode ?? null,
        raw: data,
      });
      return data;
    }),

  restartInstance: adminProcedure
    .input(z.object({ instanceName: z.string().min(1).optional() }))
    .mutation(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      const data: EvoQrResponse = await restartInstance(instanceName);
      await persistIntegration(ctx, instanceName, {
        connectionStatus: "pending",
        pairingCode: (data as any)?.pairingCode ?? null,
        raw: data,
      });
      return data;
    }),

  deleteInstance: adminProcedure
    .input(z.object({ instanceName: z.string().min(1).optional() }))
    .mutation(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      const result = await deleteInstance(instanceName);
      await clearUserEvolutionIntegration(ctx.user!.id);
      return result;
    }),

  disconnectInstance: adminProcedure
    .input(z.object({ instanceName: z.string().min(1).optional() }))
    .mutation(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      await deleteInstance(instanceName);
      await persistIntegration(ctx, instanceName, { connectionStatus: "disconnected" });
      return { success: true };
    }),

  sendTestMessage: adminProcedure
    .input(
      z.object({
        instanceName: z.string().min(1).optional(),
        number: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const instanceName = await resolveInstanceName(ctx, input.instanceName);
      return sendTextMessage(instanceName, {
        number: input.number,
        text: input.text,
      });
    }),
});
