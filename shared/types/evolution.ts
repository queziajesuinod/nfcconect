export type EvoConnectionResponse = {
  connectionStatus: string;
  instance: Record<string, unknown> | null;
  raw: unknown;
};

export type EvoQrResponse = {
  connectionStatus: string;
  instance: Record<string, unknown> | null;
  qrcode: string | null;
  code: string | null;
  pairingCode: string | null;
  raw: unknown;
};
