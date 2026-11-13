const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { app, readDB, writeDB } = require('../app');
const { withRetry } = require('../db/supabase');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function getJson(path) {
  const response = await fetch(baseUrl + path);
  return { status: response.status, body: await response.json() };
}

test('withRetry returns the first successful result', async () => {
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    return 'ok';
  });
  assert.equal(value, 'ok');
  assert.equal(calls, 1);
});

test('withRetry retries transient failures and then succeeds', async () => {
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('transient');
    return calls;
  }, 3, 1);
  assert.equal(value, 3);
  assert.equal(calls, 3);
});

test('withRetry rethrows after the last attempt', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(async () => {
        calls += 1;
        throw new Error(`failure ${calls}`);
      }, 2, 1),
    /failure 2/,
  );
  assert.equal(calls, 2);
});

test('the local JSON store round-trips a collection', async () => {
  const key = `test-collection-${Date.now()}`;
  const rows = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];

  await writeDB(key, rows);
  assert.deepEqual(await readDB(key), rows);

  await writeDB(key, []);
  assert.deepEqual(await readDB(key), []);
});

test('GET /api advertises the running database backend', async () => {
  const { status, body } = await getJson('/api');
  assert.equal(status, 200);
  assert.match(body.message, /PromptPro Arena API/);
  assert.ok(['local', 'supabase'].includes(body.db));
  assert.equal(body.endpoints.health, '/api/health');
});

test('GET /api/health reports every collection', async () => {
  const { status, body } = await getJson('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.collections) && body.collections.length > 0);
  for (const entry of body.collections) {
    assert.equal(typeof entry.name, 'string');
    assert.equal(typeof entry.count, 'number');
    assert.ok(entry.count >= 0);
  }
});

test('GET /api/:collection returns an array for a known collection', async () => {
  const { status, body } = await getJson('/api/prompts');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('an unknown collection is rejected with JSON 400', async () => {
  const response = await fetch(baseUrl + '/api/__missing__');
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Invalid collection/);
});
