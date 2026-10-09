function mockValue(value) {
  const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
const vm = require("node:vm");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const managerPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ekAAAAASUVORK5CYII=';
const conventionRawHours = 3890.3967484570226;

async function fixture(options = {}) {
  const { config: configFixture, omitConfig = false, acceptedToken, redirectOdoo = false, readFaultToken,
    acceptedUsername = 'configured-user', MY_TIME_FIXTURE: myTimeScenario, MANAGER_FIXTURE: managerScenario,
    PROJECT_HOURS_FIXTURE: projectHoursScenario, CONTRIBUTOR_FIXTURE: contributorScenario,
    LIFETIME_FIXTURE: lifetimeScenario, ...environment } = options;
  const calls = [];
  const mock = http.createServer(async (req, res) => {
    let xml = "";
    for await (const chunk of req) xml += chunk;
    calls.push(xml);
    if (redirectOdoo) {
      res.writeHead(307, { Location: '/redirected-credentials' });
      res.end();
      return;
    }
    if (readFaultToken && /<string>hr\.employee(?:\.public)?<\/string>/.test(xml)) {
      res.end(`<methodResponse><fault><value>${mockValue({ faultCode: 1, faultString: `Private upstream token: ${readFaultToken}` })}</value></fault></methodResponse>`);
      return;
    }
    if (xml.includes('<string>fault password</string>')) {
      res.end('<methodResponse><fault><value><struct><member><name>faultString</name><value><string>AccessDenied</string></value></member></struct></value></fault></methodResponse>');
      return;
    }
    let value = '<array><data></data></array>';
    if ((myTimeScenario || projectHoursScenario) && xml.includes('<methodName>execute_kw</methodName>')) {
      const model = /<string>([^<]+)<\/string><\/value><\/param>\s*<param><value><string>(?:fields_get|search_read)<\/string>/.exec(xml)?.[1];
      const fieldsGet = xml.includes('<string>fields_get</string>');
      const publicOnly = myTimeScenario === 'public-resource';
      const resourceId = publicOnly || myTimeScenario === 'partial-resource' ? 123 : 122;
      const relation = target => ({ type: 'many2one', relation: target });
      let result = [];
      const fault = !fieldsGet && ((myTimeScenario === 'actual-fault' && model === 'account.analytic.line')
        || (myTimeScenario === 'planning-fault' && model === 'planning.slot')
        || (projectHoursScenario === 'actual-fault' && model === 'account.analytic.line')
        || (projectHoursScenario === 'planning-fault' && model === 'planning.slot')
        || (contributorScenario === 'assignment-denied' && model === 'bw.staffing.convention')
        || (contributorScenario === 'photo-denied' && xml.includes('<string>image_128</string>'))
        || (lifetimeScenario === 'denied' && model === 'project.project' && xml.includes('<string>budget_staffing_convention_hours</string>'))
        || (managerScenario === 'project-denied' && model === 'project.project')
        || (managerScenario === 'photo-denied' && model === 'res.users'));
      if (fault) {
        res.end(`<methodResponse><fault><value>${mockValue({ faultString: 'PRIVATE_PERSONAL_UPSTREAM_SECRET' })}</value></fault></methodResponse>`);
        return;
      }
      if (fieldsGet) {
        if (/^hr\.employee(?:\.public)?$/.test(model)) result = publicOnly && model === 'hr.employee' ? {} : {
          user_id: { ...relation('res.users'), ...(myTimeScenario === 'wrong-user-relation' ? { type: 'one2many' } : {}) }, name: { type: 'char' },
          ...(!publicOnly ? { resource_id: relation('resource.resource') } : {}),
          ...(projectHoursScenario ? { job_title: { type: 'char' } } : {}),
          ...(contributorScenario ? { image_128: { type: 'binary' } } : {})
        };
        else if (model === 'resource.resource') result = { user_id: relation('res.users') };
        else if (model === 'account.analytic.line') result = {
          date: { type: 'date' }, unit_amount: { type: 'float' },
          employee_id: relation('hr.employee'),
          project_id: { ...relation('project.project'), ...(myTimeScenario === 'wrong-project-relation' ? { type: 'char' } : {}) }
        };
        else if (model === 'planning.slot') result = {
          name: { type: 'char' }, start_datetime: { type: 'datetime' }, end_datetime: { type: 'datetime' },
          allocated_hours: { type: 'float' }, employee_id: relation('hr.employee'), resource_id: relation('resource.resource'),
          ...(myTimeScenario === 'task-planning' || projectHoursScenario === 'task-planning'
            ? { task_id: relation('project.task') } : { project_id: relation('project.project') })
        };
        else if (model === 'project.task') result = { project_id: relation('project.project') };
        else if ((managerScenario || projectHoursScenario) && model === 'project.project') result = {
          name: { type: 'char' },
          user_id: { ...relation('res.users'), ...(managerScenario === 'wrong-relation' ? { type: 'one2many' } : {}) },
          ...(lifetimeScenario ? {
            date_start: { type: 'date' }, date: { type: 'datetime' },
            staffing_hours: { type: 'float', string: 'Staffing hours' },
            x_bw_budget_personnel: { type: 'float', string: 'Budget personnel BW' },
            budget_staffing_convention_amount: { type: 'monetary', string: 'Budget Staffing Convention (Euros)' },
            ...(lifetimeScenario === 'missing' ? {} : { budget_staffing_convention_hours: {
              type: lifetimeScenario === 'monetary' ? 'monetary' : 'float', string: 'Budget Staffing Convention (Hours)'
            } }),
            ...(lifetimeScenario === 'decoys' ? { x_other_budget: { type: 'char', string: 'Budget personnel BW' } } : {})
          } : {})
        };
        else if ((managerScenario || contributorScenario) && model === 'res.users') result = { name: { type: 'char' }, image_128: { type: 'binary' } };
        else if (contributorScenario && model === 'bw.staffing.convention') result = {
          project_id: { ...relation('project.project'), ...(contributorScenario === 'wrong-assignment' ? { type: 'one2many' } : {}) },
          employee_id: relation('hr.employee')
        };
      } else if (/^hr\.employee(?:\.public)?$/.test(model)) {
        result = [
          ...(myTimeScenario === 'no-employee' ? [] : [{
            id: model === 'hr.employee' ? 20 : 22, name: 'Same display name', user_id: [7, 'Connected account'],
            resource_id: myTimeScenario === 'partial-resource' && model === 'hr.employee.public'
              ? false : [model === 'hr.employee' ? 120 : 122, 'Own resource']
          }]),
          { id: 21, name: 'Same display name', user_id: [8, 'Other account'], resource_id: [121, 'Other resource'] }
        ];
      } else if (model === 'resource.resource') result = [
        { id: 123, user_id: [7, 'Connected account'] }, { id: 124, user_id: [8, 'Other account'] }
      ];
      else if (model === 'account.analytic.line') result = [
        { id: 1, date: '2026-01-01', unit_amount: 3, employee_id: [20, 'Same display name'], project_id: [11, 'Unit project'] },
        { id: 2, date: '2026-01-02', unit_amount: -1, employee_id: [22, 'Renamed own employee'], project_id: [99, 'Outside unit'] },
        { id: 3, date: '2026-01-03', unit_amount: 99, employee_id: [21, 'Same display name'], project_id: [11, 'Unit project'] }
      ];
      else if (model === 'planning.slot') result = [
        { id: 10, employee_id: [20, 'Same display name'], resource_id: false, allocated_hours: 10,
          project_id: [11, 'Unit project'], task_id: [30, 'Own task'] },
        { id: 11, employee_id: [22, 'Renamed own employee'], resource_id: false, allocated_hours: 5,
          project_id: [99, 'Outside unit'], task_id: [32, 'Second own task'] },
        { id: 12, employee_id: false, resource_id: [resourceId, 'Own resource'], allocated_hours: 20,
          project_id: [33, 'Planning only'], task_id: [33, 'Resource task'] },
        { id: 13, employee_id: [21, 'Same display name'], resource_id: [121, 'Other resource'], allocated_hours: 900,
          project_id: [44, 'Other account only'], task_id: [34, 'Other task'] },
        { id: 14, employee_id: [21, 'Same display name'], resource_id: [resourceId, 'Own resource'], allocated_hours: 777,
          project_id: [45, 'Conflicting employee/resource'], task_id: [35, 'Conflicting task'] }
      ].map(row => ({ ...row, start_datetime: '2026-01-01 00:00:00', end_datetime: '2026-01-02 00:00:00' }));
      else if (model === 'project.task') result = [
        { id: 30, project_id: [11, 'Unit project'] }, { id: 32, project_id: [99, 'Outside unit'] },
        { id: 33, project_id: [33, 'Planning only'] }, { id: 34, project_id: [44, 'Other account only'] }
      ];
      else if (managerScenario && model === 'project.project') result = [
        { id: 11, user_id: [501, 'Relation manager A'] }, { id: 99, user_id: [502, 'Relation manager B'] },
        { id: 33, user_id: false }, { id: 44, user_id: [599, 'PRIVATE_FOREIGN_MANAGER'] }
      ];
      else if (managerScenario && model === 'res.users') result = [
        { id: 501, name: 'Manager A', image_128: managerScenario === 'unsafe-photo'
          ? Buffer.from('<svg onload="private-config-secret"/>').toString('base64') : managerPng },
        { id: 502, name: 'Manager B', image_128: 'https://attacker.example/private-config-secret' },
        { id: 599, name: 'PRIVATE_FOREIGN_MANAGER', image_128: managerPng, apiKey: 'private-config-secret' }
      ];
      if (projectHoursScenario && !fieldsGet) {
        if (/^hr\.employee(?:\.public)?$/.test(model)) result = [
          ...result.map(row => ({ ...row, job_title: row.id === 22 ? 'AI Consultant' : 'Engineer' })),
          { id: 23, name: 'External consultant', user_id: [9, 'Other account'], resource_id: [123, 'Consultant resource'], job_title: 'AI Consultant Ormit' },
          { id: 24, name: 'Unknown function', user_id: [10, 'Other account'], resource_id: [124, 'Unknown resource'], job_title: '' }
        ];
        else if (model === 'project.project') result = [
          ...(projectHoursScenario === 'absent-project' ? [] : [{ id: 11, name: 'Exact project',
            ...(lifetimeScenario ? { x_bw_budget_personnel: 123.45, budget_staffing_convention_amount: 99999,
              ...(lifetimeScenario === 'omitted' ? {} : { budget_staffing_convention_hours:
                lifetimeScenario === 'zero' ? 0 : lifetimeScenario === 'negative' ? -5 : lifetimeScenario === 'blank' ? false :
                  lifetimeScenario === 'malformed' ? '3890:24' : lifetimeScenario === 'nonfinite' ? 'Infinity' : conventionRawHours }),
              staffing_hours: 9999, date_start: lifetimeScenario === 'invalid-dates' ? '2026-02-30' : '2024-01-01',
              date: lifetimeScenario === 'invalid-dates' ? 'not a date' : '2026-12-31 00:00:00' } : {}) }]),
          { id: 77, name: 'Unrelated project', budget_staffing_convention_hours: 999999, x_bw_budget_personnel: 888888,
            date_start: '2000-01-01', date: '2100-12-31' }
        ];
        else if (model === 'account.analytic.line') result.push(
          { id: 23, date: '2026-01-03', unit_amount: 20, employee_id: [23, 'External consultant'], project_id: [11, 'Exact project'] },
          { id: 24, date: '2026-01-03', unit_amount: 7, employee_id: [24, 'Unknown function'], project_id: [11, 'Exact project'] },
          { id: 77, date: '2026-01-03', unit_amount: 999, employee_id: [20, 'Own employee'], project_id: [77, 'Unrelated project'] }
        );
        else if (model === 'planning.slot') result.push(...[
          { id: 21, employee_id: [21, 'Same display name'], resource_id: false, allocated_hours: 15 },
          { id: 23, employee_id: false, resource_id: [123, 'Consultant resource'], allocated_hours: 30 },
          { id: 24, employee_id: [24, 'Unknown function'], resource_id: false, allocated_hours: 7 },
          { id: 77, employee_id: [20, 'Own employee'], resource_id: false, allocated_hours: 999, project_id: [77, 'Unrelated project'] }
        ].map(row => ({ project_id: [11, 'Exact project'], start_datetime: '2026-01-01 00:00:00',
          end_datetime: '2026-01-02 00:00:00', ...row })));
        if (projectHoursScenario === 'task-planning') {
          if (model === 'planning.slot') result = [
            { id: 10, employee_id: [20, 'Own employee'], allocated_hours: 10, task_id: [30, 'Selected task'] },
            { id: 13, employee_id: [21, 'Other employee'], allocated_hours: 900, task_id: [34, 'Foreign task'] },
            { id: 77, employee_id: [20, 'Own employee'], allocated_hours: 999, task_id: [77, 'Foreign task'] },
            { id: 78, employee_id: [20, 'Own employee'], allocated_hours: 999, task_id: [78, 'Unmapped task'] }
          ].map(row => ({ ...row, project_id: [11, 'Untrusted direct field'],
            start_datetime: '2026-01-01 00:00:00', end_datetime: '2026-01-02 00:00:00' }));
          if (model === 'project.task') result = [
            { id: 30, project_id: [11, 'Selected project'] }, { id: 34, project_id: [44, 'Foreign project'] },
            { id: 77, project_id: [77, 'Foreign project'] }, { id: 78, project_id: false },
            { id: 999, project_id: [11, 'Unrequested task'] }
          ];
        }
      }
      if (myTimeScenario === 'duplicate-labels' && !fieldsGet && Array.isArray(result)) {
        result = result.map(row => row.project_id ? { ...row, project_id: [row.project_id[0], 'Shared project'] } : row);
      }
      if (contributorScenario && !fieldsGet) {
        const assignmentOnly = ['assigned-only', 'assignment-denied', 'wrong-assignment'].includes(contributorScenario);
        if (/^hr\.employee(?:\.public)?$/.test(model)) result = [
          ...result, { id: 25, name: 'Assigned Ormitter', user_id: [11, 'Assigned account'],
            resource_id: [125, 'Assigned resource'], job_title: 'AI Consultant Ormit' },
          { id: 88, name: 'PRIVATE_FOREIGN_EMPLOYEE', user_id: [88, 'Foreign account'],
            resource_id: [188, 'Foreign resource'], job_title: 'AI Consultant Ormit' }
        ].map(row => ({ ...row, image_128: contributorScenario === 'user-photo-fallback' ? false :
          row.id === 20 || row.id === 25 || row.id === 88 ? managerPng : row.id === 21
            ? 'https://attacker.example/private-config-secret' : row.id === 23
              ? Buffer.from('<svg onload="private-config-secret"/>').toString('base64') : false }));
        if (model === 'bw.staffing.convention') result = [
          ...(contributorScenario === 'assigned-only' ? [{ id: 1, project_id: [11, 'Exact project'], employee_id: [25, 'Assigned Ormitter'] }] : []),
          { id: 2, project_id: [77, 'Foreign project'], employee_id: [88, 'PRIVATE_FOREIGN_EMPLOYEE'] },
          { id: 3, project_id: [11, 'Exact project'], employee_id: false }
        ];
        if (model === 'res.users') result = [
          { id: 7, name: 'Own account', image_128: managerPng },
          { id: 8, name: 'Other account', image_128: 'https://attacker.example/private-config-secret' },
          { id: 9, name: 'Consultant account', image_128: Buffer.from('<svg/>').toString('base64') },
          { id: 10, name: 'Unknown account', image_128: false },
          { id: 88, name: 'PRIVATE_FOREIGN_EMPLOYEE', image_128: managerPng, apiKey: 'private-config-secret' }
        ];
        if (assignmentOnly && model === 'account.analytic.line') result = result.filter(row => row.employee_id?.[0] !== 23);
        if (assignmentOnly && model === 'planning.slot') result = result.filter(row => row.resource_id?.[0] !== 123);
      }
      if (lifetimeScenario && !fieldsGet && model === 'project.project' &&
        (xml.includes('<string>budget_staffing_convention_hours</string>') || xml.includes('<string>date_start</string>'))) {
        result = result.slice().reverse();
      }
      value = mockValue(result);
    }
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
      const configuredToken = acceptedToken && xml.includes(mockValue(acceptedToken))
        && xml.includes(mockValue(acceptedUsername));
      value = configuredToken ? '<int>17</int>' : xml.includes('<string>correct password</string>')
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
  for (const file of ['server.js', 'index.html', 'login.html', 'steering.js', 'steering-service.js', 'project-finance-service.js', 'steering-client.js', 'steering-client.css', 'personal-time.js', 'personal-time.css', 'project-monthly.js', 'project-browser.js', 'project-browser.css', 'project-budget.js', 'project-budget.css']) fs.copyFileSync(path.join(__dirname, '..', file), path.join(directory, file));
  fs.mkdirSync(path.join(directory, 'assets'));
  fs.copyFileSync(path.join(__dirname, '..', 'assets', 'buildwise-logo.svg'), path.join(directory, 'assets', 'buildwise-logo.svg'));
  const mockOrigin = `http://127.0.0.1:${mock.address().port}`;
  if (!omitConfig) fs.writeFileSync(path.join(directory, 'config.local.json'), typeof configFixture === 'string'
    ? configFixture : JSON.stringify({
      odooUrl: mockOrigin, database: 'fixture',
      username: 'configured-admin@example.com', apiKey: 'private-config-secret', ...configFixture
    }));
  // Even a regression in missing/invalid configuration must never contact a
  // real instance: the child process can fetch only this fixture's loopback RPC.
  const startup = `const originalFetch = global.fetch;
    global.fetch = (url, init) => {
      if (new URL(url).origin !== ${JSON.stringify(mockOrigin)}) throw new Error('Non-fixture network access blocked');
      return originalFetch(url, init);
    };
    require('./server.js');`;
  const child = spawn(process.execPath, ['-e', startup], {
    cwd: directory, env: { ...process.env, HOST: '127.0.0.1', PORT: '0', SESSION_TTL_SECONDS: '60', SESSION_COOKIE_SECURE: 'false', ...environment }
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
  const configLogin = (body = {}, headers = {}) => request('/api/auth/login-config', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body)
  });
  return { request, login, configLogin, calls, base, output: () => output,
    writeConfig(value) { fs.writeFileSync(path.join(directory, 'config.local.json'), typeof value === 'string' ? value : JSON.stringify(value)); },
    async stopOdoo() { await new Promise(resolve => mock.close(resolve)); }, async close() {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
    if (mock.listening) await new Promise(resolve => mock.close(resolve));
    // Delete only the verified immediate temporary directory created above.
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('bw-auth-test-'));
    fs.rmSync(target, { recursive: true, force: true });
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
    for (const route of ['/dashboard', '/index.html', '/project-monthly.js', '/project-browser.js', '/project-browser.css', '/project-budget.js', '/project-budget.css']) {
      const response = await f.request(route);
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('location'), '/login');
    }
    for (const route of ['/api/config', '/api/auth/session', '/api/odoo/employee-timesheets', '/api/odoo/project-planning', '/api/odoo/project-finance']) {
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
    for (const route of ['/project-monthly.js', '/project-browser.js', '/project-browser.css', '/project-budget.js', '/project-budget.css']) assert.equal((await f.request(route, { headers: { Cookie: first } })).status, 200);
    for (const route of ['/server.js', '/project-finance-service.js', '/config.local.json', '/.git/config', '/README.md', '/timesheets_aca.xlsx', '/assets/../server.js', '/project-monthly.js.map']) {
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

test('config login binds the configured account and token without exposing credentials', async t => {
  const token = '  fixture token <&>  ';
  const f = await fixture({ acceptedToken: token, TEAM_FIXTURE: 'standard',
    config: { username: ' configured-user ', apiKey: token } });
  t.after(() => f.close());
  assert.equal(f.calls.length, 0, 'Startup must not authenticate implicitly');
  const response = await f.configLogin({ username: 'attacker', email: 'attacker@example.com',
    password: 'attacker-password', apiKey: 'attacker-token', url: 'http://attacker.invalid', database: 'attacker-db' });
  assert.equal(response.status, 200);
  const auth = cookie(response);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=60/);
  const result = await response.json();
  assert.deepEqual(Object.keys(result).sort(), ['email', 'expiresAt', 'ok']);
  assert.equal(result.email, 'configured-user');
  assert.ok(result.expiresAt > Date.now());
  assert.match(f.calls[0], /<string>configured-user<\/string>/);
  assert.ok(f.calls[0].includes(mockValue(token)), 'Configured token whitespace must be retained');
  assert.doesNotMatch(f.calls[0], /attacker/);
  const status = await f.request('/api/auth/session', { headers: { Cookie: auth } });
  assert.equal(status.status, 200);
  const session = await status.json();
  assert.equal(session.email, 'configured-user');
  assert.equal(session.expiresAt, result.expiresAt);
  const info = await (await f.request('/api/config', { headers: { Cookie: auth } })).json();
  assert.equal(info.username, 'configured-user');
  assert.equal(info.hasApiKey, false);
  const read = await f.request('/api/odoo/employee-timesheets', {
    method: 'POST', headers: { Cookie: auth, Origin: f.base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeName: 'Employee', username: 'attacker', apiKey: 'attacker-token' })
  });
  assert.equal(read.status, 200);
  const data = await read.json();
  assert.equal(data.uid, 17);
  assert.ok(f.calls.slice(1).every(xml => xml.includes(mockValue(token)) && !xml.includes('attacker')));
  assert.doesNotMatch(JSON.stringify({ result, session, info, data }) + f.output(), /fixture token|attacker-token|private-config-secret/);
  assert.equal((await f.request('/dashboard', { headers: { Cookie: auth } })).status, 200);
  assert.equal((await f.request('/config.local.json', { headers: { Cookie: auth } })).status, 404);
});

test('config login supports the existing api_key alias and rotates the ordinary session', async t => {
  const f = await fixture({ acceptedToken: 'alias-token', config: { username: 'configured-user', apiKey: undefined, api_key: 'alias-token' } });
  t.after(() => f.close());
  const manual = cookie(await f.login());
  const configured = await f.configLogin({}, { Cookie: manual });
  assert.equal(configured.status, 200);
  const auth = cookie(configured);
  assert.notEqual(auth, manual);
  assert.equal((await f.request('/api/auth/session', { headers: { Cookie: manual } })).status, 401);
  assert.equal((await f.request('/api/auth/session', { headers: { Cookie: auth } })).status, 200);
  const logout = await f.request('/api/auth/logout', { method: 'POST', headers: { Cookie: auth, Origin: f.base } });
  assert.equal(logout.status, 200);
  assert.equal((await f.request('/api/auth/session', { headers: { Cookie: auth } })).status, 401);
});

test('missing and invalid config login settings fail locally with safe information', async t => {
  const cases = [
    ['missing', { omitConfig: true }, 'CONFIG_MISSING'],
    ['malformed', { config: '{"apiKey":"PRIVATE_PARSER_SECRET",broken}' }, 'CONFIG_INVALID'],
    ['not an object', { config: '[]' }, 'CONFIG_INVALID'],
    ['missing username', { config: { username: '' } }, 'CONFIG_INVALID'],
    ['missing token', { config: { apiKey: undefined } }, 'CONFIG_INVALID'],
    ['blank token', { config: { apiKey: '  ' } }, 'CONFIG_INVALID'],
    ['nonstring token', { config: { apiKey: 123 } }, 'CONFIG_INVALID'],
    ['oversized token', { config: { apiKey: 'x'.repeat(4097) } }, 'CONFIG_INVALID']
  ];
  for (const [label, options, code] of cases) await t.test(label, async t => {
    const f = await fixture(options); t.after(() => f.close());
    const response = await f.configLogin();
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.json();
    assert.equal(body.code, code);
    assert.doesNotMatch(JSON.stringify(body) + f.output(), /PRIVATE_PARSER_SECRET|private-config-secret/);
    assert.equal(f.calls.length, 0, 'Invalid config must stop before Odoo');
  });
});

test('rejected and faulted config tokens give an obsolete-token result without a session', async t => {
  for (const token of ['expired-token', 'fault password']) await t.test(token, async t => {
    const f = await fixture({ config: { apiKey: token } }); t.after(() => f.close());
    const response = await f.configLogin();
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
    const result = await response.json();
    assert.equal(result.code, 'CONFIG_TOKEN_REJECTED');
    assert.doesNotMatch(JSON.stringify(result) + f.output(), /expired-token|fault password|AccessDenied/);
    assert.equal((await f.request('/api/auth/session')).status, 401);
  });
});

test('unavailable or redirecting Odoo cannot expose the config token or create a session', async t => {
  for (const redirectOdoo of [false, true]) await t.test(redirectOdoo ? 'redirect refused' : 'network unavailable', async t => {
    const f = await fixture({ redirectOdoo }); t.after(() => f.close());
    if (!redirectOdoo) await f.stopOdoo();
    const response = await f.configLogin();
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.doesNotMatch(await response.text() + f.output(), /private-config-secret|ECONNREFUSED|redirected-credentials/);
    if (redirectOdoo) assert.equal(f.calls.length, 1, 'Credentials must not be forwarded on redirect');
  });
});

test('config login rejects nonlocal Host and cross-origin callers before Odoo', async t => {
  const f = await fixture(); t.after(() => f.close());
  // Fetch normalizes Host itself; use an actual HTTP request to exercise the
  // server's guard with a nonlocal Host and matching (otherwise valid) Origin.
  const remote = await new Promise((resolve, reject) => {
    const outgoing = http.request(new URL('/api/auth/login-config', f.base), { method: 'POST', headers: {
      Host: 'public.example', Origin: 'http://public.example', 'Content-Type': 'application/json',
      'X-Forwarded-For': '127.0.0.1', 'X-Forwarded-Host': 'localhost'
    } }, incoming => {
      let body = '';
      incoming.on('data', chunk => { body += chunk; });
      incoming.on('end', () => resolve({ status: incoming.statusCode, body: JSON.parse(body) }));
    });
    outgoing.on('error', reject);
    outgoing.end('{}');
  });
  assert.equal(remote.status, 403);
  assert.equal(remote.body.code, 'CONFIG_LOCAL_ONLY');
  const crossOrigin = await f.configLogin({}, { Origin: 'https://attacker.example' });
  assert.equal(crossOrigin.status, 403);
  const crossSite = await f.configLogin({}, { 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(crossSite.status, 403);
  assert.equal((await f.request('/api/auth/login-config')).status, 405);
  assert.equal(f.calls.length, 0);
});

test('config login local guard checks the actual socket peer and never trusts forwarding headers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = source.indexOf('function isLocalConfigLogin(request)');
  const end = source.indexOf('function sendConfigLoginError(', start);
  assert.ok(start > 0 && end > start);
  const context = { URL };
  vm.runInNewContext(source.slice(start, end), context);
  for (const remoteAddress of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    for (const host of ['localhost:8765', '127.0.0.1:8765', '[::1]:8765']) {
      assert.equal(context.isLocalConfigLogin({ socket: { remoteAddress }, headers: { host } }), true);
    }
  }
  for (const [remoteAddress, host] of [['203.0.113.10', 'localhost:8765'], ['127.0.0.1', 'localhost.attacker.example'], ['127.0.0.1', 'public.example']]) {
    assert.equal(context.isLocalConfigLogin({ socket: { remoteAddress }, headers: {
      host, 'x-forwarded-for': '127.0.0.1', 'x-forwarded-host': 'localhost:8765'
    } }), false);
  }
});

test('config credentials stay private in read warnings and subsequent malformed-config errors', async t => {
  const token = 'fixture-private-upstream-token';
  const f = await fixture({ acceptedToken: token, readFaultToken: token, TEAM_FIXTURE: 'standard',
    config: { username: 'configured-user', apiKey: token } });
  t.after(() => f.close());
  const auth = cookie(await f.configLogin());
  const read = await f.request('/api/odoo/employee-timesheets', { method: 'POST',
    headers: { Cookie: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeName: 'Employee' }) });
  assert.equal(read.status, 200);
  const result = await read.json();
  assert.ok(result.warnings.length, 'Denied employee metadata should produce a safe warning');
  assert.doesNotMatch(JSON.stringify(result), /fixture-private-upstream-token|Private upstream token/);
  f.writeConfig(`{"apiKey":"${token}",broken}`);
  const config = await f.request('/api/config', { headers: { Cookie: auth } });
  assert.equal(config.status, 500);
  assert.doesNotMatch(await config.text() + f.output(), /fixture-private-upstream-token|Private upstream token/);
});

test('config and manual login share the existing attempt limit', async t => {
  const f = await fixture(); t.after(() => f.close());
  for (let i = 0; i < 5; i++) assert.equal((await f.login('person@example.com', 'wrong')).status, 401);
  for (let i = 0; i < 5; i++) assert.equal((await f.configLogin()).status, 401);
  const response = await f.configLogin();
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal(f.calls.length, 10);
});

test('manual session reads preserve a password with surrounding whitespace', async t => {
  const password = '  manual password <&>  ';
  const f = await fixture({ acceptedToken: password, acceptedUsername: 'person@example.com', TEAM_FIXTURE: 'standard' });
  t.after(() => f.close());
  const response = await f.login('person@example.com', password);
  assert.equal(response.status, 200);
  const auth = cookie(response);
  const read = await f.request('/api/odoo/employee-timesheets', { method: 'POST',
    headers: { Cookie: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeName: 'Employee' }) });
  assert.equal(read.status, 200);
  assert.ok(f.calls.every(xml => xml.includes(mockValue(password))));
});

test('welcome config button sends no credentials and presents safe informational failures', async t => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'login.html'), 'utf8');
  assert.match(source, /<button[^>]+id="configButton"[^>]+type="button"/);
  assert.match(source, /id="configStatus" role="status"/);
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const success of [false, true]) await t.test(success ? 'success' : 'obsolete token information', async () => {
    const elements = new Map();
    const requests = [];
    let location;
    const context = {
      document: { getElementById(id) {
        if (!elements.has(id)) elements.set(id, { value: 'typed-private-password', textContent: '', disabled: false,
          listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }, setAttribute() {} });
        return elements.get(id);
      } },
      window: { location: { replace(value) { location = value; } } },
      async fetch(url, options) {
        requests.push({ url, options });
        assert.equal(elements.get('submitButton').disabled, true);
        assert.equal(elements.get('configButton').disabled, true);
        // A second handler must not dispatch while this request is pending.
        await elements.get('loginForm').listeners.submit({ preventDefault() {} });
        return { ok: success, status: success ? 200 : 401,
          async json() { return success ? { ok: true } : { ok: false, code: 'CONFIG_TOKEN_REJECTED', error: 'PRIVATE_UPSTREAM_SECRET' }; } };
      }
    };
    vm.runInNewContext(script, context, { filename: 'login.html' });
    await elements.get('configButton').listeners.click();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/api/auth/login-config');
    assert.equal(requests[0].options.body, '{}');
    assert.equal(requests[0].options.credentials, 'same-origin');
    assert.equal(elements.get('submitButton').disabled, false);
    assert.equal(elements.get('configButton').disabled, false);
    assert.doesNotMatch(elements.get('configStatus').textContent, /PRIVATE_UPSTREAM_SECRET|typed-private-password/);
    if (success) {
      assert.equal(location, '/dashboard');
      assert.equal(elements.get('password').value, '');
    } else {
      assert.match(elements.get('configStatus').textContent, /obsolète ou refusé/);
      assert.equal(elements.get('status').textContent, '');
      assert.equal(location, undefined);
    }
  });
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
  const employeeQueries = queries.filter(xml => xml.includes('<string>hr.employee</string>') && xml.includes('<string>user_id</string>'));
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
        if (scenario === 'direct-unit') assert.ok(!f.calls.some(xml => xml.includes('<string>hr.employee</string>') && xml.includes('<string>user_id</string>')));
      }
    }
  });
}

test('personal time binds exact employee and resource IDs to the session account across all projects', async t => {
  const f = await fixture({ MY_TIME_FIXTURE: 'standard' });
  t.after(() => f.close());
  const anonymous = await f.request('/api/odoo/my-time', { method: 'POST', body: '{}' });
  assert.equal(anonymous.status, 401);
  assert.equal(f.calls.length, 0, 'Anonymous requests stop before contacting the fixture Odoo');
  const auth = cookie(await f.login());
  const post = body => f.request('/api/odoo/my-time', {
    method: 'POST', headers: { Cookie: auth, 'Content-Type': 'application/json', Origin: f.base }, body: JSON.stringify(body)
  });
  assert.equal((await f.request('/api/odoo/my-time', { headers: { Cookie: auth } })).status, 405);
  const response = await post({ uid: 8, employeeId: 21, employeeName: 'Other account',
    teamId: 1234, projectId: 44, username: 'attacker@example.com', apiKey: 'attacker-secret',
    url: 'https://attacker.example', database: 'attacker-db' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.uid, 7);
  assert.deepEqual(result.employee.ids, [20, 22]);
  assert.deepEqual(result.employee.resourceIds, [120, 122]);
  assert.deepEqual(result.timesheets.lines.map(row => row.employeeId), [20, 22]);
  assert.equal(result.timesheets.totalHours, 2, 'Signed credit belongs to the connected person');
  assert.equal(result.planning.totalHours, 35);
  assert.deepEqual(result.timesheets.employeeMonthly, result.timesheets.monthly);
  assert.deepEqual(result.planning.employeeMonthly, result.planning.monthly);
  assert.deepEqual(result.projects.map(row => row.id).sort((a, b) => a - b), [11, 33, 99]);
  assert.equal(result.planning.slots.find(row => row.id === 12).resourceId, 122);
  assert.ok(!result.planning.slots.some(row => row.id === 14), 'An explicit foreign employee outranks a matching resource');
  assert.equal(result.planning.slots[0].start, '2026-01-01T00:00:00.000Z');
  const queries = f.calls.filter(xml => xml.includes('<string>search_read</string>'));
  for (const xml of queries.filter(xml => /<string>hr\.employee(?:\.public)?<\/string>/.test(xml))) {
    assert.ok(xml.includes(mockValue(['user_id', '=', 7])));
    assert.match(xml, /<name>active_test<\/name><value><boolean>0<\/boolean>/);
  }
  const actualQuery = queries.find(xml => xml.includes('<string>account.analytic.line</string>'));
  const plannedQuery = queries.find(xml => xml.includes('<string>planning.slot</string>'));
  assert.ok(actualQuery.includes(mockValue(['employee_id', 'in', [20, 22]])));
  assert.ok(plannedQuery.includes(mockValue(['employee_id', 'in', [20, 22]])));
  assert.ok(plannedQuery.includes(mockValue(['resource_id', 'in', [120, 122]])));
  assert.ok(!queries.some(xml => xml.includes('<string>project.project</string>') || xml.includes('<string>hr.department</string>')),
    'Personal involvement is independent of Lead Unit or a project catalogue');
  assert.doesNotMatch(JSON.stringify(result), /attacker|correct password|private-config-secret/);
  assert.doesNotMatch(f.calls.join('\n'), /attacker|<int>1234<\/int>/);
  assert.doesNotMatch(f.output(), /correct password|private-config-secret/);

  const second = cookie(await f.login('second@example.com'));
  const secondResult = await (await f.request('/api/odoo/my-time', {
    method: 'POST', headers: { Cookie: second }, body: '{}'
  })).json();
  assert.equal(secondResult.uid, 8);
  assert.deepEqual(secondResult.employee.ids, [21]);
  assert.deepEqual(secondResult.employee.resourceIds, [121]);
  assert.equal(secondResult.timesheets.totalHours, 99);
  assert.equal(secondResult.planning.totalHours, 1677);
});

test('personal time supports public employee access and exact user-linked resource fallback', async t => {
  const f = await fixture({ MY_TIME_FIXTURE: 'public-resource' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.employee.ids, [22]);
  assert.deepEqual(result.employee.resourceIds, [123]);
  assert.equal(result.timesheets.totalHours, -1);
  assert.equal(result.planning.totalHours, 25);
  const resourceQuery = f.calls.find(xml => xml.includes('<string>resource.resource</string>') && xml.includes('<string>search_read</string>'));
  assert.ok(resourceQuery.includes(mockValue(['user_id', '=', 7])));
  assert.ok(!f.calls.some(xml => xml.includes('<string>hr.employee</string>') && xml.includes('<string>search_read</string>')),
    'An unsupported private employee relation must not trigger a broad employee lookup');
});

test('personal planning resolves only selected own task IDs to projects', async t => {
  const f = await fixture({ MY_TIME_FIXTURE: 'task-planning' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.planning.totalHours, 35);
  assert.deepEqual(result.planning.slots.map(row => row.projectId), [11, 99, 33]);
  const taskQuery = f.calls.find(xml => xml.includes('<string>project.task</string>') && xml.includes('<string>search_read</string>'));
  assert.ok(taskQuery.includes(mockValue(['id', 'in', [30, 32, 33]])));
  assert.ok(!result.projects.some(row => row.id === 44));
});

test('personal time resolves missing resource links even when another own employee already has one', async t => {
  const f = await fixture({ MY_TIME_FIXTURE: 'partial-resource' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.employee.ids, [20, 22]);
  assert.deepEqual(result.employee.resourceIds, [120, 123]);
  assert.equal(result.planning.totalHours, 35);
});

test('personal time preserves separate project identities when Odoo display names are equal', async t => {
  const f = await fixture({ MY_TIME_FIXTURE: 'duplicate-labels' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.projects.length, 3);
  assert.equal(new Set(result.projects.map(row => row.name)).size, 3);
  const projects = new Map(result.projects.map(row => [row.id, row.name]));
  for (const [id, name] of projects) assert.equal(name, `Shared project (ID ${id})`);
  for (const row of [...result.timesheets.lines, ...result.planning.slots]) assert.equal(row.project, projects.get(row.projectId));
  assert.equal(result.timesheets.monthly[0].projects.length, 2);
  assert.equal(result.planning.monthly[0].projects.length, 3);
  assert.equal(result.timesheets.totalHours, 2);
  assert.equal(result.planning.totalHours, 35);
});

for (const scenario of ['wrong-user-relation', 'wrong-project-relation']) {
  test(`personal time rejects ${scenario} metadata before querying hours`, async t => {
    const f = await fixture({ MY_TIME_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
    assert.equal(response.status, scenario === 'wrong-user-relation' ? 422 : 502);
    assert.ok(!f.calls.some(xml => /<string>(account\.analytic\.line|planning\.slot)<\/string>/.test(xml)
      && xml.includes('<string>search_read</string>')));
  });
}

for (const scenario of ['no-employee', 'actual-fault', 'planning-fault']) {
  test(`personal time handles ${scenario} without broad fallback or private upstream details`, async t => {
    const f = await fixture({ MY_TIME_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
    const result = await response.json();
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PERSONAL_UPSTREAM_SECRET|correct password|private-config-secret/);
    if (scenario === 'no-employee') {
      assert.equal(response.status, 422);
      assert.ok(!f.calls.some(xml => /<string>(account\.analytic\.line|planning\.slot)<\/string>/.test(xml)));
    } else if (scenario === 'actual-fault') {
      assert.equal(response.status, 502);
      assert.ok(!f.calls.some(xml => xml.includes('<string>planning.slot</string>')));
    } else {
      assert.equal(response.status, 200);
      assert.equal(result.timesheets.totalHours, 2);
      assert.equal(result.planning, null);
      assert.match(result.planningError, /unavailable/i);
    }
  });
}

test('personal project managers and safe photos are fetched only for exact involved project and manager IDs', async t => {
  const f = await fixture({ MY_TIME_FIXTURE: 'standard', MANAGER_FIXTURE: 'standard' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  const projects = new Map(result.projects.map(project => [project.id, project]));
  assert.deepEqual(projects.get(11).manager, { id: 501, name: 'Manager A', photoDataUrl: `data:image/png;base64,${managerPng}` });
  assert.deepEqual(projects.get(99).manager, { id: 502, name: 'Manager B', photoDataUrl: null });
  assert.equal(projects.get(33).manager, null);
  assert.equal(projects.has(44), false);
  const queries = f.calls.filter(xml => xml.includes('<string>search_read</string>'));
  const projectQuery = queries.find(xml => xml.includes('<string>project.project</string>'));
  const managerQuery = queries.find(xml => xml.includes('<string>res.users</string>'));
  assert.match(projectQuery, /<string>id<\/string>/);
  for (const id of [11, 33, 99]) assert.ok(projectQuery.includes(`<int>${id}</int>`));
  assert.doesNotMatch(projectQuery, /<int>44<\/int>|<int>599<\/int>/);
  assert.ok(managerQuery.includes(mockValue(['id', 'in', [501, 502]])));
  assert.doesNotMatch(managerQuery, /<int>599<\/int>|<string>(?:email|apiKey|image_1920)<\/string>/);
  assert.match(managerQuery, /<string>image_128<\/string>/);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_FOREIGN_MANAGER|private-config-secret|attacker\.example|correct password/);
  assert.doesNotMatch(f.output(), /PRIVATE_FOREIGN_MANAGER|private-config-secret|correct password/);
});

for (const scenario of ['wrong-relation', 'project-denied', 'photo-denied', 'unsafe-photo']) {
  test(`personal manager enrichment tolerates ${scenario} without losing hours or exposing unsafe photos`, async t => {
    const f = await fixture({ MY_TIME_FIXTURE: 'standard', MANAGER_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/my-time', { method: 'POST', headers: { Cookie: auth }, body: '{}' });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.timesheets.totalHours, 2);
    assert.equal(result.planning.totalHours, 35);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PERSONAL_UPSTREAM_SECRET|PRIVATE_FOREIGN_MANAGER|private-config-secret|attacker\.example|<svg/);
    if (scenario === 'wrong-relation' || scenario === 'project-denied') {
      assert.ok(result.projects.every(project => project.manager === null));
      assert.ok(!f.calls.some(xml => xml.includes('<string>res.users</string>') && xml.includes('<string>search_read</string>')));
    } else {
      assert.equal(result.projects.find(project => project.id === 11).manager.id, 501);
      assert.equal(result.projects.find(project => project.id === 11).manager.photoDataUrl, null);
    }
  });
}

test('manager photos reject invalid encodings, unsupported content and unsafe dimensions or sizes', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = source.indexOf('function safeManagerPhotoDataUrl(');
  const end = source.indexOf('\nasync function enrichPersonalProjectManagers', start);
  assert.ok(start >= 0 && end > start);
  const context = { Buffer };
  vm.runInNewContext(`${source.slice(start, end)}; globalThis.safePhoto = safeManagerPhotoDataUrl;`, context);
  assert.equal(context.safePhoto(managerPng), `data:image/png;base64,${managerPng}`);
  assert.equal(context.safePhoto(` \n${managerPng}\r\n`), `data:image/png;base64,${managerPng}`);
  const tooWide = Buffer.from(managerPng, 'base64');
  tooWide.writeUInt32BE(513, 16);
  const zeroHeight = Buffer.from(managerPng, 'base64');
  zeroHeight.writeUInt32BE(0, 20);
  for (const value of [null, false, {}, '', 'not base64!', 'https://example.com/photo.png',
    Buffer.from('<svg onload="private-config-secret"/>').toString('base64'),
    Buffer.from(managerPng, 'base64').subarray(0, 33).toString('base64'),
    Buffer.concat([Buffer.from(managerPng, 'base64'), Buffer.from('trailing data')]).toString('base64'),
    tooWide.toString('base64'), zeroHeight.toString('base64'), Buffer.alloc(128 * 1024 + 1).toString('base64')]) {
    assert.equal(context.safePhoto(value), null);
  }
});

test('project hours uses one exact project and session identity with classified employee and resource records', async t => {
  const f = await fixture({ PROJECT_HOURS_FIXTURE: 'standard' });
  t.after(() => f.close());
  assert.equal((await f.request('/api/odoo/project-hours', { method: 'POST', body: '{"projectId":11}' })).status, 401);
  assert.equal(f.calls.length, 0);
  const auth = cookie(await f.login());
  assert.equal((await f.request('/api/odoo/project-hours', { headers: { Cookie: auth } })).status, 405);
  for (const body of [{}, { projectId: '11' }, { projectId: 0 }, { projectId: 11.5 }, { projectId: Number.MAX_SAFE_INTEGER + 1 }]) {
    const count = f.calls.length;
    const invalid = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: JSON.stringify(body) });
    assert.equal(invalid.status, 400);
    assert.equal(f.calls.length, count, 'Invalid IDs stop before an upstream request');
  }
  const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: JSON.stringify({
    projectId: 11, uid: 8, employeeId: 21, username: 'attacker@example.com', apiKey: 'attacker-key',
    url: 'https://attacker.example', database: 'attacker-db'
  }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.uid, 7);
  assert.deepEqual(result.project, { id: 11, name: 'Exact project' });
  assert.deepEqual(result.employee.ids, [20, 22]);
  assert.ok(result.timesheets.lines.every(row => row.projectId === 11));
  assert.ok(result.planning.slots.every(row => row.projectId === 11));
  assert.equal(result.timesheets.totalHours, 129);
  assert.equal(result.planning.totalHours, 62);
  assert.equal(result.timesheets.lines.find(row => row.employeeId === 23).isSubcontractor, true);
  assert.equal(result.planning.slots.find(row => row.id === 23).employeeId, 23);
  assert.equal(result.planning.slots.find(row => row.id === 23).isSubcontractor, true);
  assert.equal(result.timesheets.lines.find(row => row.employeeId === 24).subcontractorClassification, 'unknown');
  assert.ok(result.warnings.length > 0);
  const queries = f.calls.filter(xml => xml.includes('<string>search_read</string>'));
  for (const query of queries.filter(xml => /<string>(?:account\.analytic\.line|planning\.slot)<\/string>/.test(xml))) {
    assert.ok(query.includes(mockValue(['project_id', '=', 11])));
    assert.doesNotMatch(query, /<string>ilike<\/string>|attacker/);
  }
  assert.doesNotMatch(JSON.stringify(result), /attacker|PRIVATE_PERSONAL_UPSTREAM_SECRET|correct password|private-config-secret/);
});

for (const scenario of ['absent-project', 'actual-fault', 'planning-fault']) {
  test(`project hours handles ${scenario} with safe scoped results`, async t => {
    const f = await fixture({ PROJECT_HOURS_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
    const result = await response.json();
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PERSONAL_UPSTREAM_SECRET|correct password|private-config-secret/);
    if (scenario === 'absent-project') {
      assert.equal(response.status, 404);
      assert.ok(!f.calls.some(xml => /<string>(?:account\.analytic\.line|planning\.slot)<\/string>/.test(xml)));
    } else if (scenario === 'actual-fault') assert.equal(response.status, 502);
    else {
      assert.equal(response.status, 200);
      assert.equal(result.timesheets.totalHours, 129);
      assert.equal(result.planning, null);
      assert.match(result.planningError, /unavailable/i);
    }
  });
}

test('project hours task planning queries and postfilters exact project relations', async t => {
  const f = await fixture({ PROJECT_HOURS_FIXTURE: 'task-planning' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.planning.totalHours, 10);
  assert.deepEqual(result.planning.slots.map(row => row.id), [10]);
  assert.equal(result.planning.slots[0].projectId, 11);
  const planningQuery = f.calls.find(xml => xml.includes('<string>planning.slot</string>') && xml.includes('<string>search_read</string>'));
  assert.ok(planningQuery.includes(mockValue(['task_id.project_id', '=', 11])));
  const taskQuery = f.calls.find(xml => xml.includes('<string>project.task</string>') && xml.includes('<string>search_read</string>'));
  assert.ok(taskQuery.includes(mockValue(['id', 'in', [30, 34, 77, 78]])));
  assert.doesNotMatch(taskQuery, /ilike|Untrusted direct field/);
});

test('project contributors expose only exact scoped identities and validated optional employee photos', async t => {
  const f = await fixture({ PROJECT_HOURS_FIXTURE: 'standard', CONTRIBUTOR_FIXTURE: 'standard' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.hasOrmitters, true);
  const people = new Map(result.contributors.map(person => [person.employeeId, person]));
  assert.equal(people.get(20).photoDataUrl, `data:image/png;base64,${managerPng}`);
  assert.equal(people.get(21).photoDataUrl, null, 'Remote URLs are never exposed');
  assert.equal(people.get(23).photoDataUrl, null, 'SVG is never exposed');
  assert.equal(people.get(23).isSubcontractor, true);
  assert.ok(people.get(23).resourceIds.includes(123));
  assert.equal(people.has(88), false);
  assert.equal(people.has(25), false);
  assert.equal(result.timesheets.totalHours, 129);
  assert.equal(result.planning.totalHours, 62);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_FOREIGN_EMPLOYEE|private-config-secret|attacker\.example|<svg/);
  const profileQueries = f.calls.filter(xml => xml.includes('<string>search_read</string>') && xml.includes('<string>image_128</string>'));
  assert.ok(profileQueries.length > 0);
  assert.ok(profileQueries.every(xml => !xml.includes('<int>88</int>')));
  const assignmentQuery = f.calls.find(xml => xml.includes('<string>bw.staffing.convention</string>') && xml.includes('<string>search_read</string>'));
  assert.ok(assignmentQuery.includes(mockValue(['project_id', '=', 11])));
});

test('a metadata-confirmed assigned Ormitter enables inclusion with no actual or planned hours', async t => {
  const f = await fixture({ PROJECT_HOURS_FIXTURE: 'standard', CONTRIBUTOR_FIXTURE: 'assigned-only' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.hasOrmitters, true);
  const assigned = result.contributors.find(person => person.employeeId === 25);
  assert.equal(assigned.name, 'Assigned Ormitter');
  assert.equal(assigned.isSubcontractor, true);
  assert.ok(!result.timesheets.lines.some(row => row.employeeId === 25));
  assert.ok(!result.planning.slots.some(row => row.employeeId === 25));
  assert.equal(result.timesheets.totalHours, 109);
  assert.equal(result.planning.totalHours, 32);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_FOREIGN_EMPLOYEE|private-config-secret/);
});

for (const scenario of ['assignment-denied', 'wrong-assignment', 'photo-denied', 'user-photo-fallback']) {
  test(`optional contributor ${scenario} preserves hours and safe exact-ID boundaries`, async t => {
    const f = await fixture({ PROJECT_HOURS_FIXTURE: 'standard', CONTRIBUTOR_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
    const result = await response.json();
    assert.equal(response.status, 200);
    const assignmentUnavailable = ['assignment-denied', 'wrong-assignment'].includes(scenario);
    assert.equal(result.timesheets.totalHours, assignmentUnavailable ? 109 : 129);
    assert.equal(result.planning.totalHours, assignmentUnavailable ? 32 : 62);
    assert.equal(result.hasOrmitters, !assignmentUnavailable);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PERSONAL_UPSTREAM_SECRET|PRIVATE_FOREIGN_EMPLOYEE|private-config-secret|attacker\.example|<svg/);
    if (assignmentUnavailable) assert.ok(result.warnings.some(warning => /assign|staff/i.test(warning)));
    if (scenario === 'wrong-assignment') assert.ok(!f.calls.some(xml => xml.includes('<string>bw.staffing.convention</string>') && xml.includes('<string>search_read</string>')));
    if (scenario === 'photo-denied') assert.ok(result.contributors.every(person => person.photoDataUrl === null));
    if (scenario === 'user-photo-fallback') {
      assert.equal(result.contributors.find(person => person.employeeId === 20).photoDataUrl, `data:image/png;base64,${managerPng}`);
      const userQueries = f.calls.filter(xml => xml.includes('<string>res.users</string>') && xml.includes('<string>search_read</string>'));
      assert.ok(userQueries.length > 0);
      assert.ok(userQueries.every(xml => !xml.includes('<int>88</int>')));
    }
  });
}

test('lifetime convention reads the confirmed technical hour field at raw precision despite French-label and monetary decoys', async t => {
  const f = await fixture({ PROJECT_HOURS_FIXTURE: 'standard', LIFETIME_FIXTURE: 'standard' });
  t.after(() => f.close());
  const auth = cookie(await f.login());
  const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.lifetime, { conventionHours: conventionRawHours, conventionField: 'budget_staffing_convention_hours', conventionStatus: 'available',
    startDate: '2024-01-01', endDate: '2026-12-31' });
  assert.equal(result.planning.totalHours, 62);
  const optionalRead = f.calls.find(xml => xml.includes('<string>project.project</string>') && xml.includes('<string>search_read</string>') && xml.includes('<string>budget_staffing_convention_hours</string>'));
  assert.ok(optionalRead.includes(mockValue(['id', '=', 11])));
  assert.doesNotMatch(optionalRead, /<string>staffing_hours<\/string>|<string>x_bw_budget_personnel<\/string>|<string>budget_staffing_convention_amount<\/string>|<string>ilike<\/string>/);
  assert.doesNotMatch(JSON.stringify(result.lifetime), /999999|9999|2000-01-01/);
});

for (const scenario of ['missing', 'monetary', 'decoys', 'zero', 'negative', 'blank', 'invalid-dates', 'denied', 'omitted', 'malformed', 'nonfinite']) {
  test(`optional lifetime ${scenario} remains honest without losing project hours`, async t => {
    const f = await fixture({ PROJECT_HOURS_FIXTURE: 'standard', LIFETIME_FIXTURE: scenario });
    t.after(() => f.close());
    const auth = cookie(await f.login());
    const response = await f.request('/api/odoo/project-hours', { method: 'POST', headers: { Cookie: auth }, body: '{"projectId":11}' });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.timesheets.totalHours, 129);
    assert.equal(result.planning.totalHours, 62);
    const expected = scenario === 'zero' ? 0 : scenario === 'negative' ? -5 : ['invalid-dates', 'decoys'].includes(scenario) ? conventionRawHours : null;
    assert.equal(result.lifetime.conventionHours, expected);
    const expectedStatus = ['zero', 'negative', 'blank'].includes(scenario) ? 'empty' : ['invalid-dates', 'decoys'].includes(scenario) ? 'available' : 'unavailable';
    assert.equal(result.lifetime.conventionStatus, expectedStatus);
    if (['missing', 'monetary'].includes(scenario)) assert.equal(result.lifetime.conventionField, null);
    else assert.equal(result.lifetime.conventionField, 'budget_staffing_convention_hours');
    if (scenario === 'invalid-dates') {
      assert.equal(result.lifetime.startDate, null);
      assert.equal(result.lifetime.endDate, null);
    }
    if (scenario === 'denied') {
      assert.equal(result.lifetime.conventionField, 'budget_staffing_convention_hours');
      assert.equal(result.lifetime.startDate, '2024-01-01');
      assert.equal(result.lifetime.endDate, '2026-12-31', 'Budget field denial cannot erase readable dates');
    }
    assert.doesNotMatch(JSON.stringify(result.lifetime), /PRIVATE_PERSONAL_UPSTREAM_SECRET|private-config-secret|9999/);
  });
}
