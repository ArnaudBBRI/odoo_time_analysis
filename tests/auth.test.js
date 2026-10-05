function mockValue(value) {
  const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (Array.isArray(value)) return `<array><data>${value.map(item => `<value>${mockValue(item)}</value>`).join('')}</data></array>`;
  if (value && typeof value === 'object') return `<struct>${Object.entries(value).map(([name, item]) => `<member><name>${escape(name)}</name><value>${mockValue(item)}</value></member>`).join('')}</struct>`;
  if (typeof value === 'boolean') return `<boolean>${value ? 1 : 0}</boolean>`;
  if (typeof value === 'number') return Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
  return `<string>${escape(value)}</string>`;
}
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
    if (options.TEAM_FIXTURE && xml.includes('<methodName>execute_kw</methodName>')) {
      const defs = { lead_unit_id: { string: 'Lead Unit', type: 'many2one', relation: 'hr.department' } };
      let result = [];
      if (xml.includes('<string>fields_get</string>')) {
        if (xml.includes('<string>res.users</string>')) result = options.TEAM_FIXTURE === 'direct-unit' ? { lead_unit_id: defs.lead_unit_id } : {};
        else if (xml.includes('<string>hr.employee</string>') || xml.includes('<string>hr.employee.public</string>')) result = { user_id: { type: 'many2one', relation: 'res.users' }, department_id: { type: 'many2one', relation: 'hr.department' } };
        else if (xml.includes('<string>hr.department</string>')) result = { id: { type: 'integer' }, name: { type: 'char' }, parent_id: { type: 'many2one', relation: 'hr.department' } };
        else if (xml.includes('<string>project.project</string>')) result = defs;
        else if (xml.includes('<string>planning.slot</string>')) result = options.TEAM_FIXTURE === 'no-planning-relation' ? { id: { type: 'integer' } } : {
          id: { type: 'integer' }, name: { type: 'char' }, start_datetime: { type: 'datetime' }, end_datetime: { type: 'datetime' },
          allocated_hours: { type: 'float' }, employee_id: { type: 'many2one', relation: 'hr.employee' },
          ...(options.TEAM_FIXTURE === 'task-planning' ? { task_id: { type: 'many2one', relation: 'project.task' } } : { project_id: { type: 'many2one', relation: 'project.project' } })
        };
        else if (xml.includes('<string>project.task</string>')) result = { project_id: { type: 'many2one', relation: 'project.project' } };
      } else if (xml.includes('<string>res.users</string>')) result = [{ id: 7, lead_unit_id: [4, 'Team A UNIT'] }];
      else if (xml.includes('<string>hr.employee</string>') || xml.includes('<string>hr.employee.public</string>')) result = options.TEAM_FIXTURE === 'no-unit' ? [] : options.TEAM_FIXTURE === 'multiple-units' ? [{ id: 20, department_id: [4, 'Team A UNIT'] }, { id: 21, department_id: [6, 'Team B UNIT'] }] : [{ id: 20, department_id: [13, 'AI TEAM'] }];
      else if (xml.includes('<string>hr.department</string>')) result = xml.includes('<int>13</int>') ? [{ id: 13, name: 'AI TEAM', parent_id: [4, 'Team A UNIT'] }] : xml.includes('<int>6</int>') ? [{ id: 6, name: 'Team B UNIT' }] : [{ id: 4, name: 'Team A UNIT' }];
      else if (xml.includes('<string>project.project</string>')) result = options.TEAM_FIXTURE === 'empty' ? [] : [{ id: 11, name: 'Owned project', lead_unit_id: [4, 'Team A UNIT'] }, { id: 12, name: 'No hours yet', lead_unit_id: [4, 'Team A UNIT'] }];
      else if (xml.includes('<string>account.analytic.line</string>')) result = [
        { id: 1, date: '2026-01-01', unit_amount: 3, employee_id: [20, 'Employee A'], project_id: [11, 'Owned project'] },
        { id: 2, date: '2026-01-02', unit_amount: 5, employee_id: [21, 'Employee B'], project_id: [11, 'Owned project'] },
        { id: 3, date: '2026-01-02', unit_amount: 99, employee_id: [21, 'Employee B'], project_id: [99, 'Other team project'] }
      ];
      else if (xml.includes('<string>planning.slot</string>')) result = [{ id: 6, name: 'Slot', start_datetime: '2026-01-01 00:00:00', end_datetime: '2026-02-01 00:00:00', allocated_hours: 10,
        employee_id: [20, 'Employee A'], ...(options.TEAM_FIXTURE === 'task-planning' ? { task_id: [30, 'Task'] } : { project_id: [11, 'Owned project'] }) }];
      else if (xml.includes('<string>project.task</string>')) result = [{ id: 30, project_id: [11, 'Owned project'] }];
      value = mockValue(result);
    }
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
  for (const file of ['server.js', 'index.html', 'login.html', 'steering.js', 'steering-service.js', 'steering-client.js', 'steering-client.css']) fs.copyFileSync(path.join(__dirname, '..', file), path.join(directory, file));
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

test('connected employee Lead Unit determines the portfolio; caller overrides are ignored', async t => {
  const f = await fixture({ TEAM_FIXTURE: 'standard' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const post = (route, body) => f.request(`/api/odoo/${route}`, { method: 'POST', headers: { Cookie: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const identity = await (await post('my-lead-unit', {})).json();
  assert.equal(identity.leadUnit.id, 4);
  assert.equal(identity.leadUnit.name, 'Team A UNIT');
  const portfolio = await (await post('team-projects', { ownerField: 'user_id', teamId: 6, employeeName: 'ignored' })).json();
  assert.deepEqual(portfolio.domain, [['lead_unit_id', 'in', [4]]]);
  assert.equal(portfolio.projects.length, 2);
  assert.equal(portfolio.projects[1].timesheets.monthly.length, 0);
  assert.equal(portfolio.timesheets.totalHours, 8);
  assert.equal(portfolio.planning.totalHours, 10);
  assert.equal(portfolio.projects[0].timesheets.monthly[0].employees.length, 2);
  const queries = f.calls.filter(xml => xml.includes('<string>search_read</string>'));
  const employeeQueries = queries.filter(xml => xml.includes('<string>hr.employee</string>'));
  assert.ok(employeeQueries.length);
  for (const xml of employeeQueries) {
    assert.match(xml, /<string>user_id<\/string>/);
    assert.match(xml, /<int>7<\/int>/);
  }
  for (const xml of queries.filter(xml => xml.includes('<string>account.analytic.line</string>') || xml.includes('<string>planning.slot</string>'))) {
    assert.match(xml, /<string>project_id<\/string>/);
    assert.match(xml, /<int>11<\/int>/);
    assert.match(xml, /<int>12<\/int>/);
    assert.doesNotMatch(xml, /employee_id.name|<string>ignored<\/string>/);
  }
  assert.equal((await f.request('/api/odoo/team-projects', { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await post('project-owner-fields', {})).status, 404);
  assert.equal((await post('owner-teams', {})).status, 404);
});

for (const scenario of ['direct-unit', 'no-unit', 'multiple-units', 'empty', 'task-planning', 'no-planning-relation']) {
  test(`connected Lead Unit: ${scenario}`, async t => {
    const f = await fixture({ TEAM_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/team-projects', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
    const result = await response.json();
    if (scenario === 'no-unit' || scenario === 'multiple-units') {
      assert.equal(response.status, 422);
      assert.match(result.error, /Lead Unit/);
      assert.ok(!f.calls.some(xml => xml.includes('<string>project.project</string>') && xml.includes('<string>search_read</string>')));
    } else {
      assert.equal(response.status, 200);
      assert.equal(result.team.id, 4);
      if (scenario === 'empty') {
        assert.deepEqual(result.projects, []);
        assert.ok(!f.calls.some(xml => /<string>(account.analytic.line|planning.slot)<\/string>/.test(xml)));
      } else if (scenario === 'no-planning-relation') {
        assert.equal(result.planning, null);
        assert.match(result.planningError, /no supported project relation/);
        assert.ok(!f.calls.some(xml => xml.includes('<string>planning.slot</string>') && xml.includes('<string>search_read</string>')));
      } else {
        assert.equal(result.planning.totalHours, 10);
        if (scenario === 'task-planning') assert.ok(f.calls.some(xml => xml.includes('<string>task_id.project_id</string>')));
        if (scenario === 'direct-unit') assert.ok(!f.calls.some(xml => xml.includes('<string>hr.employee</string>')));
      }
    }
  });
}
