const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

async function fixture(options = {}) {
  const calls = [];
  const mock = http.createServer(async (req, res) => {
    let xml = "";
    for await (const chunk of req) xml += chunk;
    calls.push(xml);
    if (xml.includes('<string>fault password</string>')) {
      res.end('<methodResponse><fault><value><struct><member><name>faultString</name><value><string>AccessDenied</string></value></member></struct></value></fault></methodResponse>');
      return;
    }
    let value = '<array><data></data></array>';
    if (xml.includes('<methodName>authenticate</methodName>')) {
      value = xml.includes('<string>correct password</string>')
        ? (xml.includes('second@example.com') ? '<int>8</int>' : '<int>7</int>')
        : '<boolean>0</boolean>';
    } else if (xml.includes('<methodName>version</methodName>')) {
      value = '<struct><member><name>server_version</name><value><string>test</string></value></member></struct>';
    }
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(`<methodResponse><params><param><value>${value}</value></param></params></methodResponse>`);
  });
  mock.listen(0, '127.0.0.1');
  await once(mock, 'listening');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-auth-test-'));
  for (const file of ['server.js', 'index.html', 'login.html']) fs.copyFileSync(path.join(__dirname, '..', file), path.join(directory, file));
  fs.mkdirSync(path.join(directory, 'assets'));
  fs.copyFileSync(path.join(__dirname, '..', 'assets', 'buildwise-logo.svg'), path.join(directory, 'assets', 'buildwise-logo.svg'));
  fs.writeFileSync(path.join(directory, 'config.local.json'), JSON.stringify({
    odooUrl: `http://127.0.0.1:${mock.address().port}`, database: 'fixture',
    username: 'configured-admin@example.com', apiKey: 'private-config-secret'
  }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: directory, env: { ...process.env, HOST: '127.0.0.1', PORT: '0', SESSION_TTL_SECONDS: '60', SESSION_COOKIE_SECURE: 'false', ...options }
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Startup timeout: ${output}`)), 5000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
    child.stdout.on('data', () => {
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const request = (route, init = {}) => fetch(`${base}${route}`, { redirect: 'manual', ...init });
  const login = (email = 'person@example.com', password = 'correct password', headers = {}) => request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ email, password })
  });
  return { request, login, calls, base, output: () => output,
    async stopOdoo() { await new Promise(resolve => mock.close(resolve)); }, async close() {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
    if (mock.listening) await new Promise(resolve => mock.close(resolve));
    // This directory was created above solely for this fixture.
    fs.rmSync(directory, { recursive: true, force: true });
  } };
}

function cookie(response) { return response.headers.get('set-cookie').split(';')[0]; }

test('Odoo login, session isolation and access control', async t => {
  const f = await fixture();
  t.after(() => f.close());
  await t.test('public welcome and logo, protected dashboard and APIs', async () => {
    const welcome = await f.request('/');
    assert.equal(welcome.status, 200);
    assert.match(await welcome.text(), /Bienvenue/);
    assert.equal(welcome.headers.get('cache-control'), 'no-store');
    assert.equal((await f.request('/assets/buildwise-logo.svg')).status, 200);
    for (const route of ['/dashboard', '/index.html']) {
      const response = await f.request(route);
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('location'), '/login');
    }
    for (const route of ['/api/config', '/api/auth/session', '/api/odoo/employee-timesheets', '/api/odoo/project-planning']) {
      const response = await f.request(route);
      assert.equal(response.status, 401);
      assert.equal((await response.json()).authenticationRequired, true);
    }
  });
  await t.test('invalid login and cross-origin login create no session', async () => {
    assert.equal((await f.login('invalid', 'password')).status, 400);
    const rejected = await f.login('person@example.com', 'wrong');
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers.get('set-cookie'), null);
    assert.equal((await f.login('person@example.com', 'fault password')).status, 401);
    assert.equal((await f.login(undefined, undefined, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await f.request('/api/auth/login')).status, 405);
    const malformed = await f.request('/api/auth/login', { method: 'POST', body: '{' });
    assert.equal(malformed.status, 400);
  });
  const signedIn = await f.login();
  assert.equal(signedIn.status, 200);
  const first = cookie(signedIn);
  assert.match(signedIn.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=60/);
  assert.doesNotMatch(await signedIn.text(), /correct password|private-config-secret/);
  await t.test('signed-in identity cannot be overridden by config or request', async () => {
    const configResponse = await f.request('/api/config', { headers: { Cookie: first } });
    const config = await configResponse.json();
    assert.equal(config.username, 'person@example.com');
    assert.equal(config.hasApiKey, false);
    assert.equal(config.authenticated, true);
    assert.doesNotMatch(JSON.stringify(config), /correct password|configured-admin|private-config-secret/);
    const response = await f.request('/api/odoo/employee-timesheets', {
      method: 'POST', headers: { Cookie: first, 'Content-Type': 'application/json', Origin: f.base },
      body: JSON.stringify({ employeeName: 'Employee', username: 'attacker@example.com', apiKey: 'attacker-key', url: 'http://attacker.example', database: 'attacker-db' })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).uid, 7);
    assert.match(f.calls.at(-1), /person@example.com|<int>7<\/int>/);
    assert.match(f.calls.at(-1), /correct password/);
    assert.doesNotMatch(f.calls.at(-1), /attacker|private-config-secret/);
    assert.equal((await f.request('/dashboard', { headers: { Cookie: first } })).status, 200);
    for (const route of ['/server.js', '/config.local.json', '/.git/config', '/README.md', '/timesheets_aca.xlsx', '/assets/../server.js']) {
      assert.equal((await f.request(route, { headers: { Cookie: first } })).status, 404);
    }
    const homepage = await f.request('/', { headers: { Cookie: first } });
    assert.equal(homepage.headers.get('location'), '/dashboard');
  });
  await t.test('separate users and CSRF-protected logout', async () => {
    const second = cookie(await f.login('second@example.com'));
    const [one, two] = await Promise.all([first, second].map(value => f.request('/api/odoo/test-connection', { method: 'POST', headers: { Cookie: value }, body: '{}' })));
    assert.equal((await one.json()).uid, 7);
    assert.equal((await two.json()).uid, 8);
    const blocked = await f.request('/api/auth/logout', { method: 'POST', headers: { Cookie: first, Origin: 'https://attacker.example' } });
    assert.equal(blocked.status, 403);
    assert.equal((await f.request('/api/auth/session', { headers: { Cookie: first } })).status, 200);
    const logout = await f.request('/api/auth/logout', { method: 'POST', headers: { Cookie: first, Origin: f.base } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal((await f.request('/api/config', { headers: { Cookie: first } })).status, 401);
    assert.equal((await f.request('/api/config', { headers: { Cookie: second } })).status, 200);
    assert.equal((await f.request('/api/config', { headers: { Cookie: 'bw_session=forged' } })).status, 401);
    assert.doesNotMatch(f.output(), /correct password|private-config-secret/);
  });
});

test('Odoo unavailability does not create a session or disclose upstream details', async t => {
  const f = await fixture();
  t.after(() => f.close());
  await f.stopOdoo();
  const response = await f.login();
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.doesNotMatch(await response.text(), /correct password|ECONNREFUSED|private-config-secret/);
});

test('signing in again rotates and invalidates the old session', async t => {
  const f = await fixture();
  t.after(() => f.close());
  const first = cookie(await f.login());
  const second = cookie(await f.login(undefined, undefined, { Cookie: first }));
  assert.notEqual(first, second);
  assert.equal((await f.request('/api/config', { headers: { Cookie: first } })).status, 401);
  assert.equal((await f.request('/api/config', { headers: { Cookie: second } })).status, 200);
});

test('expired sessions are denied server-side', async t => {
  const f = await fixture({ SESSION_TTL_SECONDS: '0.1' });
  t.after(() => f.close());
  const value = cookie(await f.login());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await f.request('/api/config', { headers: { Cookie: value } })).status, 401);
});

test('HTTPS deployments set Secure cookies and check their public origin', async t => {
  const f = await fixture({ SESSION_COOKIE_SECURE: 'true' });
  t.after(() => f.close());
  const response = await f.login(undefined, undefined, { Origin: f.base.replace('http:', 'https:') });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.equal((await f.login(undefined, undefined, { Origin: f.base })).status, 403);
});

test('repeated unsuccessful logins are rate limited', async t => {
  const f = await fixture();
  t.after(() => f.close());
  for (let i = 0; i < 10; i++) assert.equal((await f.login('person@example.com', 'wrong')).status, 401);
  const response = await f.login();
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});
