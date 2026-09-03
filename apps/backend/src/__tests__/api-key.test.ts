import request from 'supertest';
import express from 'express';
import { createApiKeyMiddleware } from '../middleware/api-key';

function appWithMiddleware(apiKey: string) {
  const app = express();
  app.use('/protected', createApiKeyMiddleware(apiKey), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('api-key middleware', () => {
  it('allows request with correct key', async () => {
    const app = appWithMiddleware('secret123');
    await request(app).get('/protected').set('X-API-Key', 'secret123').expect(200);
  });

  it('rejects missing key with 401', async () => {
    const app = appWithMiddleware('secret123');
    const res = await request(app).get('/protected').expect(401);
    expect(res.body.error).toBe('Invalid API key');
  });

  it('rejects wrong key with 401', async () => {
    const app = appWithMiddleware('secret123');
    await request(app).get('/protected').set('X-API-Key', 'wrong').expect(401);
  });

  it('is case-sensitive', async () => {
    const app = appWithMiddleware('Secret123');
    await request(app).get('/protected').set('X-API-Key', 'secret123').expect(401);
  });
});
