const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function dashboardFunctions(names, initial = {}) {
  const context = vm.createContext({ ...initial });
  for (const name of names) {
    const start = html.indexOf(`      function ${name}(`);
    assert.ok(start >= 0, `Missing dashboard function ${name}`);
    const next = html.slice(start + 1).search(/\n      (?:async )?function /);
    const end = next < 0 ? html.indexOf('    })();', start) : start + 1 + next;
    new vm.Script(html.slice(start, end)).runInContext(context);
  }
  return context;
}

test('owner portfolio lists zero-hour projects and keeps selected-year remaining totals', () => {
  const context = dashboardFunctions(['normalizeText', 'cleanLabel', 'extractProjectCode', 'projectMatchKey', 'projectColorKey', 'buildEmployeeRemainingRows'], {
    state: { portfolioProjects: [{ id: 11, name: 'Owned project' }, { id: 12, name: 'No hours yet' }] }
  });
  const result = context.buildEmployeeRemainingRows([{ name: 'Owned project', value: 8 }], [{ name: 'Owned project', value: 10 }]);
  assert.equal(result.length, 2);
  assert.equal(result.find(row => row.name === 'Owned project').remaining, 2);
  assert.equal(result.find(row => row.name === 'No hours yet').remaining, 0);
  const emptyYear = context.buildEmployeeRemainingRows([], []);
  assert.equal(emptyYear.length, 2);
  assert.ok(emptyYear.every(row => row.actual === 0 && row.planned === 0));
});

test('missing planning shows unknown values rather than a false negative remaining total', () => {
  const context = dashboardFunctions(['escapeHtml', 'formatHours', 'compactLegendLabel', 'compactLegendLabelWithDates', 'renderRemainingRow']);
  const html = context.renderRemainingRow({ name: 'Owned <project>', actual: 8, unknownPlanning: true }, 0);
  assert.match(html, /Planning unavailable/);
  assert.equal((html.match(/>—<\/td>/g) || []).length, 2);
  assert.ok(!html.includes('-8'));
  assert.ok(!html.includes('Owned <project>'));
  assert.match(html, /data-project-drilldown/);
});
