import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../../apps/api/src/server.mjs';

test('demo API accepts only the fixed Named Tunnel Origin and retains protected session cookies', async (t) => {
  const publicOrigin = 'https://farm-owner.test';
  const { server } = createApiServer({ persistenceDriver: 'file', publicOrigin, environment: 'demo' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const localUrl = `http://127.0.0.1:${server.address().port}`;
  for (const origin of ['https://other-owner.test', 'https://other-session.trycloudflare.com', 'https://*.trycloudflare.com', '*', 'https://evil.test']) {
    const response = await fetch(`${localUrl}/api/character/enter`, { method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Origin QA' }) });
    assert.equal(response.status, 403);
    assert.equal(response.headers.has('access-control-allow-origin'), false);
    await response.body.cancel();
    const options = await fetch(`${localUrl}/api/character/enter`, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(options.headers.has('access-control-allow-origin'), false);
  }
  const entered = await fetch(`${localUrl}/api/character/enter`, { method: 'POST',
    headers: { Origin: publicOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Origin QA' }) });
  assert.equal(entered.status, 200);
  assert.equal(entered.headers.get('access-control-allow-origin'), publicOrigin);
  const cookie = entered.headers.get('set-cookie');
  assert.match(cookie, /; HttpOnly;/);
  assert.match(cookie, /; Secure(?:;|$)/);
  assert.match(cookie, /; SameSite=(?:Lax|Strict|None);/);
  const body = await entered.json();
  assert.equal(Object.hasOwn(body, 'token'), false);
  const bootstrap = await fetch(`${localUrl}/api/game/bootstrap`, {
    headers: { Origin: publicOrigin, Cookie: cookie.split(';')[0] },
  });
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.headers.get('cache-control'), 'no-store');
  await bootstrap.body.cancel();
});
