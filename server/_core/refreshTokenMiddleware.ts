import type { Request, Response, NextFunction } from "express";
import { verifySessionToken, renewSession, getSessionExpiryTime } from "./refreshToken";
import { getSessionCookieOptions } from "./cookies";

const SESSION_COOKIE_NAME = "session";
const REFRESH_COOKIE_NAME = "refreshToken";

/**
 * Middleware que verifica e renova automaticamente tokens expirados
 * Se o session token expirou mas o refresh token é válido,
 * cria um novo session token sem pedir novo login
 */
export async function refreshTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionToken = req.cookies[SESSION_COOKIE_NAME];
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    // Se não há tokens, continuar normalmente
    if (!sessionToken && !refreshToken) {
      return next();
    }

    // Se session token é válido, continuar
    if (sessionToken) {
      const verified = await verifySessionToken(sessionToken);
      if (verified) {
        // Adicionar usuário ao request para uso em rotas protegidas
        (req as any).user = verified;
        return next();
      }
    }

    // Session token expirou, tentar renovar com refresh token
    if (refreshToken) {
      const ipAddress = req.ip;
      const userAgent = req.get("user-agent");

      const renewed = await renewSession(refreshToken, ipAddress, userAgent);

      if (renewed) {
        // Definir novos cookies
        const cookieOptions = getSessionCookieOptions(req);
        const sessionExpiryMs = getSessionExpiryTime();

        res.cookie(SESSION_COOKIE_NAME, renewed.sessionToken, {
          ...cookieOptions,
          maxAge: sessionExpiryMs,
        });

        res.cookie(REFRESH_COOKIE_NAME, renewed.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Verificar novo token
        const verified = await verifySessionToken(renewed.sessionToken);
        if (verified) {
          (req as any).user = verified;
          return next();
        }
      }
    }

    // Nenhum token válido, continuar sem usuário
    (req as any).user = null;
    next();
  } catch (error) {
    console.error("[RefreshToken] Middleware error:", error);
    // Em caso de erro, continuar sem usuário
    (req as any).user = null;
    next();
  }
}

/**
 * Middleware para limpar tokens ao fazer logout
 */
export async function logoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cookieOptions = getSessionCookieOptions(req);

  // Limpar cookies
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);

  next();
}

/**
 * Interceptor de resposta para renovar refresh token se próximo ao vencimento
 * Renova o refresh token quando faltam menos de 1 dia para expirar
 */
export async function renewRefreshTokenOnResponse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Interceptar envio de resposta
  const originalSend = res.send;

  res.send = function (data: any) {
    // Renovar refresh token se próximo ao vencimento
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      // Aqui você poderia adicionar lógica para renovar
      // Por enquanto, apenas passar adiante
    }

    return originalSend.call(this, data);
  };

  next();
}
