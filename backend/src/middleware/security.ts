import { Request, Response, NextFunction } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

/**
 * Rate Limiter em memória para proteção de rotas da API
 */
export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 180;
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const now = Date.now();
  const bucket = rateBuckets.get(clientIp);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(clientIp, { count: 1, resetAt: now + windowMs });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return res.status(429).json({
      error:
        'Limite de requisições excedido. Aguarde alguns instantes antes de tentar novamente.',
    });
  }

  next();
};

/**
 * Cabeçalhos de segurança HTTP e sanitização recursiva básica de strings
 */
export const securityHeadersAndSanitizer = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

function sanitizeObject(obj: Record<string, unknown>) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Remove tags script/iframe maliciosas preservando acentuação pt-BR
      obj[key] = val
        .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitizeObject(val as Record<string, unknown>);
    }
  }
}
