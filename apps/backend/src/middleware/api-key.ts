import type { NextFunction, Request, Response } from 'express';

export function createApiKeyMiddleware(apiKey: string) {
  return function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
    const provided = req.header('X-API-Key');
    if (!provided || !timingSafeEqual(provided, apiKey)) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    next();
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare to keep timing consistent, but length mismatch always fails.
    // Use a dummy loop over the longer string.
    let diff = a.length ^ b.length;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
    }
    return diff === 0 && a.length === b.length;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
