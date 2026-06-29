const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8765);
const ROOT = __dirname;
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_CONFIG = {
  odooUrl: "https://odoo.buildwise.be/",
  database: "buildwiseprd"
};
const CONFIG_FILE_NAME = "config.local.json";
const KNOWN_BUDGET_MODELS = [
  "project.budget",
  "project.project.budget",
  "project.budget.budget",
  "budget.analytic",
  "budget.budget",
  "account.budget",
  "crossovered.budget"
];
const KNOWN_BUDGET_LINE_MODELS = [
  "project.budget.line",
  "project.project.budget.line",
  "budget.line",
  "account.budget.line",
  "budget.analytic.line",
  "crossovered.budget.lines"
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${HOST}:${PORT}`);
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }
    if (url.pathname === "/api/config") {
      await handleDashboardConfig(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/test-connection") {
      await handleOdooConnectionTest(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/list-databases") {
      await handleOdooDatabaseList(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/employee-timesheets") {
      await handleEmployeeTimesheets(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/employee-planning") {
      await handleEmployeePlanning(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/project-timesheets") {
      await handleProjectTimesheets(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/project-planning") {
      await handleProjectPlanning(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/project-budgets") {
      await handleProjectBudgets(request, response);
      return;
    }
    await serveStaticFile(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message || "Unexpected server error"
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Odoo Time Dashboard running at http://${HOST}:${PORT}/`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Run with another port, for example: PORT=8766 node server.js`);
    process.exit(1);
  }
  throw error;
});

async function handleOdooConnectionTest(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let body;
  let odooUrl;
  let database;
  let username;
  let apiKey;
  try {
    body = await readJsonBody(request);
    ({ odooUrl, database, username, apiKey } = getAuthSettings(body));
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const uid = await authenticateOdoo(odooUrl, database, username, apiKey);

  if (!uid) {
    sendJson(response, 401, {
      ok: false,
      error: "Odoo rejected the database, username, or API key."
    });
    return;
  }

  let version = null;
  try {
    version = await xmlRpcCall(`${odooUrl}/xmlrpc/2/common`, "version", []);
  } catch (_) {
    version = null;
  }

  sendJson(response, 200, {
    ok: true,
    uid,
    serverVersion: version && version.server_version ? version.server_version : null
  });
}

async function handleOdooDatabaseList(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let odooUrl;
  try {
    const body = await readJsonBody(request);
    odooUrl = normalizeOdooUrl(getMergedConnectorSettings(body).odooUrl);
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const databases = await xmlRpcCall(`${odooUrl}/xmlrpc/2/db`, "list", []);
  if (!Array.isArray(databases)) {
    sendJson(response, 502, {
      ok: false,
      error: "Odoo returned an unexpected database-list response."
    });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    databases: databases.map((database) => String(database)).sort()
  });
}

async function handleEmployeeTimesheets(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let body;
  let odooUrl;
  let database;
  let username;
  let apiKey;
  let employeeName;
  try {
    body = await readJsonBody(request);
    ({ odooUrl, database, username, apiKey, employeeName } = getEmployeeFetchSettings(body));
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const uid = await authenticateOdoo(odooUrl, database, username, apiKey);
  if (!uid) {
    sendJson(response, 401, {
      ok: false,
      error: "Odoo rejected the database, username, or API key."
    });
    return;
  }

  const fields = ["id", "date", "unit_amount", "name", "employee_id", "project_id", "task_id"];
  const warnings = [];
  let domain = [["employee_id.name", "ilike", employeeName]];
  let lines;

  try {
    lines = await searchReadAll(odooUrl, database, uid, apiKey, "account.analytic.line", domain, fields, {
      order: "date asc, id asc"
    });
  } catch (error) {
    warnings.push(`Direct employee-name search failed: ${error.message}`);
    const employees = await searchReadAll(odooUrl, database, uid, apiKey, "hr.employee", [["name", "ilike", employeeName]], ["id", "name"], {
      order: "name asc"
    });
    const employeeIds = employees.map((employee) => Number(employee.id)).filter((id) => Number.isFinite(id));
    if (!employeeIds.length) {
      sendJson(response, 404, {
        ok: false,
        error: `No employee found matching "${employeeName}".`,
        warnings
      });
      return;
    }
    domain = [["employee_id", "in", employeeIds]];
    lines = await searchReadAll(odooUrl, database, uid, apiKey, "account.analytic.line", domain, fields, {
      order: "date asc, id asc"
    });
  }

  const normalizedLines = lines.map(normalizeTimesheetLine).filter((line) => line.date);
  const monthly = buildMonthlyTimesheetSummary(normalizedLines);

  sendJson(response, 200, {
    ok: true,
    uid,
    employeeName,
    model: "account.analytic.line",
    domain,
    lineCount: normalizedLines.length,
    totalHours: roundHours(normalizedLines.reduce((total, line) => total + line.hours, 0)),
    monthly,
    lines: normalizedLines,
    warnings
  });
}

async function handleEmployeePlanning(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let body;
  let odooUrl;
  let database;
  let username;
  let apiKey;
  let employeeName;
  try {
    body = await readJsonBody(request);
    ({ odooUrl, database, username, apiKey, employeeName } = getEmployeeFetchSettings(body));
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const uid = await authenticateOdoo(odooUrl, database, username, apiKey);
  if (!uid) {
    sendJson(response, 401, {
      ok: false,
      error: "Odoo rejected the database, username, or API key."
    });
    return;
  }

  const fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, "planning.slot");
  const availableFields = new Set(Object.keys(fieldDefs));
  const fields = [
    "id",
    "name",
    "start_datetime",
    "end_datetime",
    "allocated_hours",
    "allocated_percentage",
    "employee_id",
    "resource_id",
    "project_id",
    "task_id",
    "sale_line_id",
    "role_id"
  ].filter((field) => availableFields.has(field));

  const warnings = [];
  const domains = buildPlanningEmployeeDomains(availableFields, employeeName);
  let slots = null;
  let domain = null;

  for (const candidateDomain of domains) {
    try {
      const rows = await searchReadAll(odooUrl, database, uid, apiKey, "planning.slot", candidateDomain, fields, {
        order: availableFields.has("start_datetime") ? "start_datetime asc, id asc" : "id asc"
      });
      slots = rows;
      domain = candidateDomain;
      break;
    } catch (error) {
      warnings.push(`Planning search failed for ${JSON.stringify(candidateDomain)}: ${error.message}`);
    }
  }

  if (!slots) {
    throw new Error(warnings[warnings.length - 1] || "Could not search planning slots");
  }

  const normalizedSlots = slots.map(normalizePlanningSlot).filter((slot) => slot.start || slot.end || slot.hours > 0);
  const monthly = buildMonthlyPlanningSummary(normalizedSlots);

  sendJson(response, 200, {
    ok: true,
    uid,
    employeeName,
    model: "planning.slot",
    domain,
    fields,
    slotCount: normalizedSlots.length,
    totalHours: roundHours(normalizedSlots.reduce((total, slot) => total + slot.hours, 0)),
    monthly,
    slots: normalizedSlots,
    warnings
  });
}

async function handleProjectTimesheets(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let body;
  let odooUrl;
  let database;
  let username;
  let apiKey;
  let projectCode;
  try {
    body = await readJsonBody(request);
    ({ odooUrl, database, username, apiKey, projectCode } = getProjectFetchSettings(body));
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const uid = await authenticateOdoo(odooUrl, database, username, apiKey);
  if (!uid) {
    sendJson(response, 401, {
      ok: false,
      error: "Odoo rejected the database, username, or API key."
    });
    return;
  }

  const warnings = [];
  const projects = await findProjectsByCode(odooUrl, database, uid, apiKey, projectCode, warnings);
  const projectIds = projects.map((project) => Number(project.id)).filter((id) => Number.isFinite(id));
  const domain = projectIds.length
    ? [["project_id", "in", projectIds]]
    : [["project_id.name", "ilike", projectCode]];
  const fields = ["id", "date", "unit_amount", "name", "employee_id", "project_id", "task_id"];
  const lines = await searchReadAll(odooUrl, database, uid, apiKey, "account.analytic.line", domain, fields, {
    order: "date asc, id asc"
  });
  const normalizedLines = lines.map(normalizeTimesheetLine).filter((line) => line.date);
  const monthly = buildMonthlyTimesheetEmployeeSummary(normalizedLines);
  const projectName = formatProjectName(projectCode, mostFrequentName(normalizedLines.map((line) => line.project)) || (projects[0] && projects[0].name));

  sendJson(response, 200, {
    ok: true,
    uid,
    projectCode,
    projectName,
    projectIds,
    model: "account.analytic.line",
    domain,
    lineCount: normalizedLines.length,
    totalHours: roundHours(normalizedLines.reduce((total, line) => total + line.hours, 0)),
    monthly,
    lines: normalizedLines,
    warnings
  });
}

async function handleProjectPlanning(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let body;
  let odooUrl;
  let database;
  let username;
  let apiKey;
  let projectCode;
  try {
    body = await readJsonBody(request);
    ({ odooUrl, database, username, apiKey, projectCode } = getProjectFetchSettings(body));
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const uid = await authenticateOdoo(odooUrl, database, username, apiKey);
  if (!uid) {
    sendJson(response, 401, {
      ok: false,
      error: "Odoo rejected the database, username, or API key."
    });
    return;
  }

  const warnings = [];
  const projects = await findProjectsByCode(odooUrl, database, uid, apiKey, projectCode, warnings);
  const projectIds = projects.map((project) => Number(project.id)).filter((id) => Number.isFinite(id));
  const fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, "planning.slot");
  const availableFields = new Set(Object.keys(fieldDefs));
  const fields = [
    "id",
    "name",
    "start_datetime",
    "end_datetime",
    "allocated_hours",
    "allocated_percentage",
    "employee_id",
    "resource_id",
    "project_id",
    "task_id",
    "sale_line_id",
    "role_id"
  ].filter((field) => availableFields.has(field));
  const domains = buildPlanningProjectDomains(availableFields, projectCode, projectIds);
  let slots = null;
  let domain = null;

  for (const candidateDomain of domains) {
    try {
      const rows = await searchReadAll(odooUrl, database, uid, apiKey, "planning.slot", candidateDomain, fields, {
        order: availableFields.has("start_datetime") ? "start_datetime asc, id asc" : "id asc"
      });
      if (!slots || rows.length > 0) {
        slots = rows;
        domain = candidateDomain;
      }
      if (rows.length > 0) {
        break;
      }
    } catch (error) {
      warnings.push(`Planning search failed for ${JSON.stringify(candidateDomain)}: ${error.message}`);
    }
  }

  if (!slots) {
    throw new Error(warnings[warnings.length - 1] || "Could not search project planning slots");
  }

  const normalizedSlots = slots.map(normalizePlanningSlot).filter((slot) => slot.start || slot.end || slot.hours > 0);
  const monthly = buildMonthlyPlanningEmployeeSummary(normalizedSlots);
  const projectName = formatProjectName(projectCode, mostFrequentName(normalizedSlots.map((slot) => slot.project)) || (projects[0] && projects[0].name));

  sendJson(response, 200, {
    ok: true,
    uid,
    projectCode,
    projectName,
    projectIds,
    model: "planning.slot",
    domain,
    fields,
    slotCount: normalizedSlots.length,
    totalHours: roundHours(normalizedSlots.reduce((total, slot) => total + slot.hours, 0)),
    monthly,
    slots: normalizedSlots,
    warnings
  });
}

async function handleProjectBudgets(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }

  let body;
  let odooUrl;
  let database;
  let username;
  let apiKey;
  let projectCode;
  try {
    body = await readJsonBody(request);
    ({ odooUrl, database, username, apiKey, projectCode } = getProjectFetchSettings(body));
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error.message
    });
    return;
  }

  const uid = await authenticateOdoo(odooUrl, database, username, apiKey);
  if (!uid) {
    sendJson(response, 401, {
      ok: false,
      error: "Odoo rejected the database, username, or API key."
    });
    return;
  }

  const warnings = [];
  const projects = await findProjectsByCode(odooUrl, database, uid, apiKey, projectCode, warnings);
  const projectIds = projects.map((project) => Number(project.id)).filter((id) => Number.isFinite(id));
  const budgets = await fetchProjectBudgets(odooUrl, database, uid, apiKey, projectCode, projectIds, warnings);
  const projectName = formatProjectName(projectCode, projects[0] && projects[0].name);

  sendJson(response, 200, {
    ok: true,
    uid,
    projectCode,
    projectName,
    projectIds,
    currentYear: budgets.currentYear,
    modelCount: budgets.modelCount,
    budgetCount: budgets.budgetCount,
    excludedFutureAnnualBudgetCount: budgets.excludedFutureAnnualBudgetCount,
    budgets: {
      convention: budgets.convention,
      annual: budgets.annual
    },
    debug: budgets.debug,
    warnings
  });
}

async function handleDashboardConfig(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, error: "Use GET for this endpoint" });
    return;
  }

  try {
    const configInfo = readDashboardConfigInfo();
    const config = configInfo.values;
    const settings = getMergedConnectorSettings({});

    sendJson(response, 200, {
      ok: true,
      hasConfig: Boolean(configInfo.source),
      odooUrl: normalizeOdooUrl(settings.odooUrl),
      database: settings.database,
      username: settings.username,
      employeeName: settings.employeeName,
      projectCode: settings.projectCode,
      hasApiKey: Boolean(firstNonBlank(config.apiKey, config.api_key))
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message
    });
  }
}

async function serveStaticFile(pathname, response) {
  const requestPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const targetPath = path.resolve(ROOT, `.${requestPath}`);
  const relativePath = path.relative(ROOT, targetPath);

  if (isPrivateConfigPath(relativePath)) {
    sendJson(response, 403, { ok: false, error: "Local configuration files are not served" });
    return;
  }

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath) || !fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }

  response.writeHead(200, {
    "Content-Type": MIME_TYPES[path.extname(targetPath).toLowerCase()] || "application/octet-stream"
  });
  fs.createReadStream(targetPath).pipe(response);
}

function getAuthSettings(body) {
  const settings = getMergedConnectorSettings(body);
  return {
    odooUrl: normalizeOdooUrl(settings.odooUrl),
    database: cleanRequired(settings.database, "Database"),
    username: cleanRequired(settings.username, "Username"),
    apiKey: cleanRequired(settings.apiKey, "API key")
  };
}

function getEmployeeFetchSettings(body) {
  const settings = getMergedConnectorSettings(body);
  return {
    ...getAuthSettings(body),
    employeeName: cleanRequired(settings.employeeName, "Employee name")
  };
}

function getProjectFetchSettings(body) {
  const settings = getMergedConnectorSettings(body);
  return {
    ...getAuthSettings(body),
    projectCode: cleanProjectCode(settings.projectCode)
  };
}

function getMergedConnectorSettings(body = {}) {
  const config = readDashboardConfigInfo().values;
  return {
    odooUrl: firstNonBlank(body.url, body.odooUrl, config.odooUrl, config.url, DEFAULT_CONFIG.odooUrl),
    database: firstNonBlank(body.database, config.database, DEFAULT_CONFIG.database),
    username: firstNonBlank(body.username, config.username),
    apiKey: firstNonBlank(body.apiKey, config.apiKey, config.api_key),
    employeeName: firstNonBlank(body.employeeName, config.employeeName),
    projectCode: firstNonBlank(body.projectCode, body.projectName, body.projectQuery, config.projectId, config.projectID, config.projectCode)
  };
}

function readDashboardConfigInfo() {
  const configPath = path.join(ROOT, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) {
    return { values: {}, source: null };
  }

  try {
    const values = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("the file must contain a JSON object");
    }
    return { values, source: CONFIG_FILE_NAME };
  } catch (error) {
    throw new Error(`${CONFIG_FILE_NAME} could not be read: ${error.message}`);
  }
}

function isPrivateConfigPath(relativePath) {
  return path.basename(relativePath).toLowerCase() === CONFIG_FILE_NAME.toLowerCase();
}

function firstNonBlank(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        request.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function normalizeOdooUrl(value) {
  const text = cleanRequired(value, "Odoo URL").replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(text);
  } catch (_) {
    throw new Error("Odoo URL must be a valid http or https URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Odoo URL must start with http:// or https://");
  }
  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (!pathname || pathname === "/web") {
    return parsed.origin;
  }
  return parsed.origin + pathname;
}

function cleanRequired(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(`${label} is required`);
  }
  return text;
}

function cleanProjectCode(value) {
  const text = cleanRequired(value, "Project");
  const code = text.replace(/\D+/g, "");
  return code || text;
}

async function authenticateOdoo(odooUrl, database, username, apiKey) {
  return xmlRpcCall(`${odooUrl}/xmlrpc/2/common`, "authenticate", [
    database,
    username,
    apiKey,
    {}
  ]);
}

async function executeKw(odooUrl, database, uid, apiKey, model, method, args = [], kwargs = {}) {
  return xmlRpcCall(`${odooUrl}/xmlrpc/2/object`, "execute_kw", [
    database,
    uid,
    apiKey,
    model,
    method,
    args,
    kwargs
  ]);
}

async function getModelFields(odooUrl, database, uid, apiKey, model) {
  return executeKw(odooUrl, database, uid, apiKey, model, "fields_get", [], {
    attributes: ["string", "type", "relation", "selection"]
  });
}

async function searchReadAll(odooUrl, database, uid, apiKey, model, domain, fields, options = {}) {
  const pageSize = options.limit || 1000;
  const allRows = [];
  let offset = 0;

  while (true) {
    const rows = await executeKw(odooUrl, database, uid, apiKey, model, "search_read", [domain], {
      fields,
      offset,
      limit: pageSize,
      order: options.order || "id asc"
    });
    if (!Array.isArray(rows)) {
      throw new Error(`${model}.search_read returned an unexpected response`);
    }
    allRows.push(...rows);
    if (rows.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return allRows;
}

async function findProjectsByCode(odooUrl, database, uid, apiKey, projectCode, warnings) {
  try {
    return await searchReadAll(odooUrl, database, uid, apiKey, "project.project", [["name", "ilike", projectCode]], ["id", "name"], {
      order: "name asc"
    });
  } catch (error) {
    warnings.push(`Project lookup failed: ${error.message}`);
    return [];
  }
}

async function fetchProjectBudgets(odooUrl, database, uid, apiKey, projectCode, projectIds, warnings) {
  const currentYear = new Date().getFullYear();
  const context = {
    fieldCache: new Map(),
    lineModelCandidates: null,
    debug: {
      budgetModelCandidates: [],
      lineModelCandidates: [],
      lineModels: {},
      lineQueries: []
    }
  };
  const modelCandidates = await getBudgetModelCandidates(odooUrl, database, uid, apiKey, warnings);
  context.debug.budgetModelCandidates = modelCandidates.map((candidate) => ({
    model: candidate.model,
    name: candidate.name,
    priority: candidate.priority
  }));
  const budgetsByKey = new Map();

  for (const candidate of modelCandidates) {
    if (isLikelyBudgetLineModel(candidate.model)) {
      continue;
    }

    const fieldDefs = await getCachedModelFields(odooUrl, database, uid, apiKey, candidate.model, context, warnings);
    if (!fieldDefs) {
      continue;
    }

    const domains = buildBudgetProjectDomains(fieldDefs, projectCode, projectIds);
    if (!domains.length) {
      continue;
    }

    const fields = budgetRecordFields(fieldDefs);
    const rowsById = new Map();
    for (const domain of domains) {
      try {
        const rows = await searchReadAll(odooUrl, database, uid, apiKey, candidate.model, domain, fields, {
          limit: 200,
          order: "id asc"
        });
        rows.forEach((row) => rowsById.set(Number(row.id), row));
      } catch (error) {
        warnings.push(`${candidate.model} budget search failed: ${error.message}`);
      }
    }

    for (const row of rowsById.values()) {
      const lines = await readBudgetLinesForRecord(odooUrl, database, uid, apiKey, candidate.model, row, fieldDefs, context, projectIds, warnings);
      const budget = normalizeOdooBudgetRecord(candidate.model, row, fieldDefs, lines);
      if (!budget.lines.length) {
        continue;
      }
      budgetsByKey.set(`${candidate.model}:${row.id}`, budget);
    }
  }

  const resolved = resolveBudgetKinds(Array.from(budgetsByKey.values()), currentYear, warnings);
  return {
    currentYear,
    modelCount: modelCandidates.length,
    budgetCount: budgetsByKey.size,
    convention: resolved.convention,
    annual: resolved.annual,
    excludedFutureAnnualBudgetCount: resolved.excludedFutureAnnualBudgetCount,
    debug: compactBudgetDebug(context.debug)
  };
}

async function getBudgetModelCandidates(odooUrl, database, uid, apiKey, warnings) {
  const candidates = new Map();
  KNOWN_BUDGET_MODELS.forEach((model, index) => {
    candidates.set(model, { model, name: model, priority: index });
  });

  try {
    const discovered = await searchReadAll(odooUrl, database, uid, apiKey, "ir.model", [
      "|",
      ["model", "ilike", "budget"],
      ["name", "ilike", "budget"]
    ], ["model", "name"], {
      limit: 300,
      order: "model asc"
    });
    discovered.forEach((entry, index) => {
      const model = String(entry.model || "").trim();
      if (!model || model.startsWith("ir.")) {
        return;
      }
      if (!candidates.has(model)) {
        candidates.set(model, {
          model,
          name: String(entry.name || model),
          priority: KNOWN_BUDGET_MODELS.length + index
        });
      }
    });
  } catch (error) {
    warnings.push(`Budget model discovery failed: ${error.message}`);
  }

  return Array.from(candidates.values()).sort((a, b) => a.priority - b.priority || a.model.localeCompare(b.model));
}

async function getBudgetLineModelCandidates(odooUrl, database, uid, apiKey, context, warnings) {
  if (context.lineModelCandidates) {
    return context.lineModelCandidates;
  }

  const candidates = new Map();
  KNOWN_BUDGET_LINE_MODELS.forEach((model, index) => {
    candidates.set(model, { model, name: model, priority: index });
  });

  try {
    const discovered = await searchReadAll(odooUrl, database, uid, apiKey, "ir.model", [
      "|",
      ["model", "ilike", "budget"],
      ["name", "ilike", "budget"]
    ], ["model", "name"], {
      limit: 300,
      order: "model asc"
    });
    discovered.forEach((entry, index) => {
      const model = String(entry.model || "").trim();
      if (!model || model.startsWith("ir.") || !isLikelyBudgetLineModel(model, entry.name)) {
        return;
      }
      if (!candidates.has(model)) {
        candidates.set(model, {
          model,
          name: String(entry.name || model),
          priority: KNOWN_BUDGET_LINE_MODELS.length + index
        });
      }
    });
  } catch (error) {
    warnings.push(`Budget line model discovery failed: ${error.message}`);
  }

  context.lineModelCandidates = Array.from(candidates.values()).sort((a, b) => a.priority - b.priority || a.model.localeCompare(b.model));
  context.debug.lineModelCandidates = context.lineModelCandidates.map((candidate) => ({
    model: candidate.model,
    name: candidate.name,
    priority: candidate.priority
  }));
  return context.lineModelCandidates;
}

async function getCachedModelFields(odooUrl, database, uid, apiKey, model, context, warnings) {
  if (context.fieldCache.has(model)) {
    return context.fieldCache.get(model);
  }

  try {
    const fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, model);
    if (!fieldDefs || typeof fieldDefs !== "object") {
      throw new Error("fields_get returned an unexpected response");
    }
    context.fieldCache.set(model, fieldDefs);
    return fieldDefs;
  } catch (error) {
    context.fieldCache.set(model, null);
    warnings.push(`Could not inspect ${model}: ${error.message}`);
    return null;
  }
}

function isLikelyBudgetLineModel(model, name = "") {
  const text = normalizeSearchText(`${model} ${name}`);
  return text.includes("budget line") ||
    text.includes("budget lines") ||
    /\.lines?$/.test(String(model || "")) ||
    String(model || "").includes("budget.line") ||
    String(model || "").includes("budget.lines");
}

function buildBudgetProjectDomains(fieldDefs, projectCode, projectIds) {
  const domains = [];
  Object.entries(fieldDefs).forEach(([field, def]) => {
    const meta = fieldMetaText(field, def);
    if (def.relation === "project.project") {
      if (projectIds.length) {
        domains.push([[field, "in", projectIds]]);
      } else if (projectCode) {
        domains.push([[`${field}.name`, "ilike", projectCode]]);
      }
      return;
    }

    if (projectCode && (def.type === "char" || def.type === "text") && meta.includes("project")) {
      domains.push([[field, "ilike", projectCode]]);
    }
  });

  if (projectCode) {
    if (fieldDefs.name) {
      domains.push([["name", "ilike", projectCode]]);
    }
    if (fieldDefs.display_name) {
      domains.push([["display_name", "ilike", projectCode]]);
    }
  }

  return uniqueDomains(domains);
}

function uniqueDomains(domains) {
  const seen = new Set();
  return domains.filter((domain) => {
    const key = JSON.stringify(domain);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function budgetRecordFields(fieldDefs) {
  const fields = new Set(["id"]);
  ["name", "display_name"].forEach((field) => addFieldIfAvailable(fields, fieldDefs, field));
  Object.entries(fieldDefs).forEach(([field, def]) => {
    if (shouldReadBudgetRecordField(field, def)) {
      fields.add(field);
    }
  });
  return Array.from(fields);
}

function shouldReadBudgetRecordField(field, def) {
  const meta = fieldMetaText(field, def);
  if (def.relation === "project.project") {
    return true;
  }
  if ((def.type === "one2many" || def.type === "many2many") && def.relation && normalizeSearchText(def.relation).includes("budget")) {
    return meta.includes("line") || meta.includes("budget");
  }
  if (def.type === "many2one" && def.relation && normalizeSearchText(def.relation).includes("budget")) {
    return true;
  }
  if (["char", "text", "selection", "date", "datetime", "integer", "many2one"].includes(def.type)) {
    return [
      "type",
      "kind",
      "category",
      "budget",
      "convention",
      "annual",
      "year",
      "date",
      "period",
      "fiscal"
    ].some((keyword) => meta.includes(keyword));
  }
  return false;
}

function addFieldIfAvailable(fields, fieldDefs, field) {
  if (field === "id" || fieldDefs[field]) {
    fields.add(field);
  }
}

async function readBudgetLinesForRecord(odooUrl, database, uid, apiKey, budgetModel, budgetRow, budgetFieldDefs, context, projectIds, warnings) {
  const linesByKey = new Map();
  const addLines = (lines) => {
    lines.forEach((line) => {
      if (!line || !line.name) {
        return;
      }
      linesByKey.set(`${line.model}:${line.id || line.name}`, line);
    });
  };

  for (const [field, def] of Object.entries(budgetFieldDefs)) {
    if (def.type !== "one2many" && def.type !== "many2many") {
      continue;
    }
    if (!def.relation || !normalizeSearchText(def.relation).includes("budget")) {
      continue;
    }
    const ids = normalizeIdList(budgetRow[field]);
    if (!ids.length) {
      continue;
    }
    const fieldDefs = await getCachedModelFields(odooUrl, database, uid, apiKey, def.relation, context, warnings);
    if (!fieldDefs) {
      continue;
    }
    recordBudgetLineModelDebug(context, def.relation, fieldDefs);
    addLines(await readBudgetLineRows(odooUrl, database, uid, apiKey, def.relation, [["id", "in", ids]], fieldDefs, context, warnings));
  }

  const lineModelCandidates = await getBudgetLineModelCandidates(odooUrl, database, uid, apiKey, context, warnings);
  for (const candidate of lineModelCandidates) {
    const fieldDefs = await getCachedModelFields(odooUrl, database, uid, apiKey, candidate.model, context, warnings);
    if (!fieldDefs) {
      continue;
    }
    recordBudgetLineModelDebug(context, candidate.model, fieldDefs);
    const inverseFields = Object.entries(fieldDefs)
      .filter(([, def]) => def.relation === budgetModel && (def.type === "many2one" || def.type === "many2many"))
      .map(([field]) => field);

    for (const inverseField of inverseFields) {
      addLines(await readBudgetLineRows(odooUrl, database, uid, apiKey, candidate.model, [[inverseField, "=", Number(budgetRow.id)]], fieldDefs, context, warnings));
    }
  }

  if (!linesByKey.size && projectIds.length) {
    for (const candidate of lineModelCandidates) {
      const fieldDefs = await getCachedModelFields(odooUrl, database, uid, apiKey, candidate.model, context, warnings);
      if (!fieldDefs) {
        continue;
      }
      recordBudgetLineModelDebug(context, candidate.model, fieldDefs);
      const projectFields = Object.entries(fieldDefs)
        .filter(([, def]) => def.relation === "project.project")
        .map(([field]) => field);
      for (const projectField of projectFields) {
        addLines(await readBudgetLineRows(odooUrl, database, uid, apiKey, candidate.model, [[projectField, "in", projectIds]], fieldDefs, context, warnings));
      }
    }
  }

  return Array.from(linesByKey.values());
}

function normalizeIdList(value) {
  return Array.isArray(value)
    ? value.map((entry) => Number(entry)).filter((id) => Number.isFinite(id))
    : [];
}

async function readBudgetLineRows(odooUrl, database, uid, apiKey, model, domain, fieldDefs, context, warnings) {
  try {
    recordBudgetLineModelDebug(context, model, fieldDefs);
    const fields = budgetLineFields(fieldDefs);
    const rows = await searchReadAll(odooUrl, database, uid, apiKey, model, domain, fields, {
      limit: 1000,
      order: "id asc"
    });
    recordBudgetLineQueryDebug(context, model, domain, fields, rows, fieldDefs);
    return rows
      .map((row) => normalizeBudgetLine(model, row, fieldDefs))
      .filter((line) => Math.abs(line.budgeted) > 0.005);
  } catch (error) {
    warnings.push(`${model} budget line search failed: ${error.message}`);
    return [];
  }
}

function budgetLineFields(fieldDefs) {
  const fields = new Set(["id"]);
  ["name", "display_name"].forEach((field) => addFieldIfAvailable(fields, fieldDefs, field));
  Object.entries(fieldDefs).forEach(([field, def]) => {
    if (def.type === "many2one" || isBudgetLineLabelField(field, def) || isPotentialBudgetAmountField(field, def)) {
      fields.add(field);
    }
  });
  return Array.from(fields);
}

function recordBudgetLineModelDebug(context, model, fieldDefs) {
  if (!context || !context.debug || !fieldDefs) {
    return;
  }
  if (context.debug.lineModels[model]) {
    return;
  }

  const many2oneFields = Object.entries(fieldDefs)
    .filter(([, def]) => def.type === "many2one")
    .map(([field, def]) => ({
      field,
      label: def.string || field,
      relation: def.relation || "",
      categoryScore: scoreBudgetCategoryField(field, def)
    }))
    .sort((a, b) => b.categoryScore - a.categoryScore || a.field.localeCompare(b.field));

  const labelCandidateFields = Object.entries(fieldDefs)
    .filter(([, def]) => ["char", "text", "many2one"].includes(def.type))
    .map(([field, def]) => ({
      field,
      label: def.string || field,
      type: def.type,
      relation: def.relation || "",
      score: scoreBudgetLineLabelField(field, def)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.field.localeCompare(b.field));

  const amountCandidateFields = Object.entries(fieldDefs)
    .filter(([, def]) => ["float", "monetary", "integer"].includes(def.type))
    .map(([field, def]) => ({
      field,
      label: def.string || field,
      scores: {
        budgeted: scoreBudgetAmountField(field, def, "budgeted"),
        consumed: scoreBudgetAmountField(field, def, "consumed"),
        ordered: scoreBudgetAmountField(field, def, "ordered"),
        underReview: scoreBudgetAmountField(field, def, "underReview")
      }
    }))
    .filter((entry) => Math.max(...Object.values(entry.scores)) > 0)
    .sort((a, b) => {
      const maxA = Math.max(...Object.values(a.scores));
      const maxB = Math.max(...Object.values(b.scores));
      return maxB - maxA || a.field.localeCompare(b.field);
    });

  context.debug.lineModels[model] = {
    model,
    selectedAmountFields: selectBudgetAmountFields(fieldDefs),
    requestedFields: budgetLineFields(fieldDefs),
    many2oneFields,
    labelCandidateFields,
    amountCandidateFields,
    sampleRows: []
  };
}

function recordBudgetLineQueryDebug(context, model, domain, fields, rows, fieldDefs) {
  if (!context || !context.debug) {
    return;
  }
  const sampleRows = rows.slice(0, 5).map((row) => budgetLineDebugRow(row, fieldDefs));
  context.debug.lineQueries.push({
    model,
    domain,
    fields,
    rowCount: rows.length,
    sampleRows
  });

  const modelDebug = context.debug.lineModels[model];
  if (modelDebug) {
    const existingIds = new Set(modelDebug.sampleRows.map((row) => row.id));
    sampleRows.forEach((row) => {
      if (modelDebug.sampleRows.length >= 8 || existingIds.has(row.id)) {
        return;
      }
      modelDebug.sampleRows.push(row);
      existingIds.add(row.id);
    });
  }
}

function budgetLineDebugRow(row, fieldDefs) {
  const selectedAmountFields = selectBudgetAmountFields(fieldDefs);
  const relationValues = {};
  const amountValues = {};
  const textValues = {};

  Object.entries(fieldDefs).forEach(([field, def]) => {
    if (!(field in row)) {
      return;
    }
    if (def.type === "many2one") {
      const id = relationalId(row[field]);
      const name = relationalName(row[field]);
      if (id || name) {
        relationValues[field] = {
          id,
          name,
          label: def.string || field,
          relation: def.relation || "",
          categoryScore: scoreBudgetCategoryField(field, def)
        };
      }
      return;
    }

    if (["float", "monetary", "integer"].includes(def.type)) {
      const amount = toNumericAmount(row[field]);
      if (amount || Object.values(selectedAmountFields).includes(field)) {
        amountValues[field] = {
          value: amount,
          label: def.string || field
        };
      }
      return;
    }

    if ((def.type === "char" || def.type === "text") && (field === "name" || field === "display_name" || scoreBudgetLineLabelField(field, def) > 0)) {
      const value = cleanDisplayText(row[field]);
      if (value) {
        textValues[field] = value;
      }
    }
  });

  return {
    id: row.id,
    displayName: cleanDisplayText(row.display_name || row.name || ""),
    selectedAmountFields,
    relationValues,
    amountValues,
    textValues
  };
}

function compactBudgetDebug(debug) {
  return {
    budgetModelCandidates: debug.budgetModelCandidates,
    lineModelCandidates: debug.lineModelCandidates,
    lineModels: Object.values(debug.lineModels)
      .sort((a, b) => a.model.localeCompare(b.model)),
    lineQueries: debug.lineQueries.slice(0, 24)
  };
}

function scoreBudgetCategoryField(field, def) {
  if (def.type !== "many2one") {
    return 0;
  }
  const meta = fieldMetaText(field, def);
  const relation = normalizeSearchText(def.relation || "");
  if (field === "budget_analytic_id" || relation === "budget analytic") {
    return 0;
  }
  if (field === "x_plan8_id" || meta.includes("number budget")) {
    return 110;
  }
  if (field === "x_plan7_id" || meta.includes("rubriek") || meta.includes("rubrique") || meta.includes("rubric")) {
    return 105;
  }
  if (meta.includes("category") || meta.includes("categorie")) {
    return 100;
  }
  if (field === "general_budget_id" || field === "budget_post_id") {
    return 94;
  }
  if (meta.includes("budget line") || meta.includes("budget post") || meta.includes("budget position")) {
    return 90;
  }
  if (relation.includes("budget") && !relation.includes("line")) {
    return 70;
  }
  if (meta.includes("account") || meta.includes("analytic") || meta.includes("product") || meta.includes("task")) {
    return 45;
  }
  if (meta.includes("project")) {
    return 10;
  }
  return 0;
}

function scoreBudgetLineLabelField(field, def) {
  if (!["char", "text", "many2one"].includes(def.type)) {
    return 0;
  }
  const meta = fieldMetaText(field, def);
  const categoryScore = scoreBudgetCategoryField(field, def);
  if (categoryScore >= 70) {
    return categoryScore;
  }
  if (field === "name" || field === "display_name") {
    return 80;
  }
  if (meta.includes("category") || meta.includes("categorie")) {
    return 100;
  }
  if (meta.includes("budget line") || meta.includes("budget post") || meta.includes("budget position")) {
    return 92;
  }
  if (["line", "budget", "account", "analytic", "product", "task"].some((keyword) => meta.includes(keyword))) {
    return 60;
  }
  return 0;
}

function isBudgetLineLabelField(field, def) {
  return scoreBudgetLineLabelField(field, def) > 0;
}

function isPotentialBudgetAmountField(field, def) {
  if (!["float", "monetary", "integer"].includes(def.type)) {
    return false;
  }
  return Math.max(
    scoreBudgetAmountField(field, def, "budgeted"),
    scoreBudgetAmountField(field, def, "consumed"),
    scoreBudgetAmountField(field, def, "ordered"),
    scoreBudgetAmountField(field, def, "underReview")
  ) > 0;
}

function normalizeOdooBudgetRecord(model, row, fieldDefs, lines) {
  const name = cleanDisplayText(firstNonBlank(row.display_name, row.name, `Budget ${row.id}`));
  const year = inferBudgetYear(row, fieldDefs);
  const kind = classifyBudgetKind(row, fieldDefs, year);
  const sortedLines = aggregateBudgetLines(lines)
    .map((line) => ({
      name: line.name,
      budgeted: roundMoney(line.budgeted),
      engaged: roundMoney(line.consumed + line.ordered + line.underReview),
      consumed: roundMoney(line.consumed),
      ordered: roundMoney(line.ordered),
      underReview: roundMoney(line.underReview),
      categoryField: line.categoryField || "",
      categoryId: line.categoryId || null,
      sourceFields: line.sourceFields
    }))
    .filter((line) => Math.abs(line.budgeted) > 0.005)
    .sort((a, b) => b.budgeted - a.budgeted || a.name.localeCompare(b.name));
  const totals = sortedLines.reduce((acc, line) => {
    acc.budgeted += line.budgeted;
    acc.engaged += line.engaged;
    acc.consumed += line.consumed;
    acc.ordered += line.ordered;
    acc.underReview += line.underReview;
    return acc;
  }, { budgeted: 0, engaged: 0, consumed: 0, ordered: 0, underReview: 0 });

  Object.keys(totals).forEach((key) => {
    totals[key] = roundMoney(totals[key]);
  });

  return {
    id: row.id,
    model,
    name,
    kind,
    year,
    lineCount: sortedLines.length,
    totals,
    lines: sortedLines
  };
}

function normalizeBudgetLine(model, row, fieldDefs) {
  const sourceFields = selectBudgetAmountFields(fieldDefs);
  const consumed = amountFromRow(row, sourceFields.consumed);
  const ordered = amountFromRow(row, sourceFields.ordered);
  const underReview = amountFromRow(row, sourceFields.underReview);
  const category = budgetLineCategory(row, fieldDefs);

  return {
    id: row.id,
    model,
    name: category.name || budgetLineName(row, fieldDefs),
    categoryField: category.field,
    categoryId: category.id,
    budgeted: amountFromRow(row, sourceFields.budgeted),
    consumed,
    ordered,
    underReview,
    sourceFields
  };
}

function aggregateBudgetLines(lines) {
  const grouped = new Map();
  lines.forEach((line) => {
    const key = line.categoryField
      ? `${line.categoryField}:${line.categoryId || line.name}`
      : `${line.model}:${line.id || line.name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...line,
        budgeted: 0,
        consumed: 0,
        ordered: 0,
        underReview: 0
      });
    }
    const entry = grouped.get(key);
    entry.budgeted += line.budgeted;
    entry.consumed += line.consumed;
    entry.ordered += line.ordered;
    entry.underReview += line.underReview;
  });
  return Array.from(grouped.values());
}

function selectBudgetAmountFields(fieldDefs) {
  return {
    budgeted: pickBudgetAmountField(fieldDefs, "budgeted"),
    consumed: pickBudgetAmountField(fieldDefs, "consumed"),
    ordered: pickBudgetAmountField(fieldDefs, "ordered"),
    underReview: pickBudgetAmountField(fieldDefs, "underReview")
  };
}

function pickBudgetAmountField(fieldDefs, category) {
  return Object.entries(fieldDefs)
    .map(([field, def]) => ({ field, score: scoreBudgetAmountField(field, def, category) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.field.localeCompare(b.field))[0]?.field || "";
}

function scoreBudgetAmountField(field, def, category) {
  if (!["float", "monetary", "integer"].includes(def.type)) {
    return 0;
  }

  const exact = String(field || "").toLowerCase();
  const meta = fieldMetaText(field, def);
  const hasAny = (keywords) => keywords.some((keyword) => meta.includes(keyword));
  const hasOtherCategory = (keywords) => hasAny(keywords);
  const consumedWords = ["consumed", "practical", "actual", "spent", "used", "real", "realise"];
  const orderedWords = ["ordered", "order", "purchase", "po", "commande"];
  const reviewWords = ["under review", "approval", "approve", "pending", "review", "validation"];
  const budgetWords = ["budgeted", "budget", "planned", "allocated", "approved"];

  if (category === "budgeted") {
    if (["budgeted_amount", "budget_amount", "amount_budgeted", "planned_amount", "allocated_amount"].includes(exact)) {
      return 100;
    }
    if (hasOtherCategory([...consumedWords, ...orderedWords, ...reviewWords])) {
      return 0;
    }
    if (meta.includes("budgeted")) {
      return 92;
    }
    if (meta.includes("planned amount")) {
      return 86;
    }
    if (hasAny(budgetWords) && meta.includes("amount")) {
      return 78;
    }
    if (exact === "amount" || meta === "amount") {
      return 35;
    }
    return 0;
  }

  if (category === "consumed") {
    if (["consumed_amount", "amount_consumed", "practical_amount", "actual_amount", "spent_amount", "used_amount"].includes(exact)) {
      return 100;
    }
    if (hasAny(consumedWords) && meta.includes("amount")) {
      return 82;
    }
    if (hasAny(consumedWords)) {
      return 62;
    }
    return 0;
  }

  if (category === "ordered") {
    if (["ordered_amount", "amount_ordered", "purchase_order_amount", "po_amount"].includes(exact)) {
      return 100;
    }
    if (hasAny(reviewWords)) {
      return 0;
    }
    if (hasAny(orderedWords) && meta.includes("amount")) {
      return 82;
    }
    if (hasAny(orderedWords)) {
      return 62;
    }
    if (exact === "committed_amount" || meta.includes("committed amount")) {
      return 34;
    }
    return 0;
  }

  if (category === "underReview") {
    if (["under_review_amount", "amount_under_review", "approval_amount", "to_approve_amount", "pending_amount", "pending_approval_amount"].includes(exact)) {
      return 100;
    }
    if (hasAny(reviewWords) && meta.includes("amount")) {
      return 86;
    }
    if (hasAny(reviewWords)) {
      return 64;
    }
  }

  return 0;
}

function amountFromRow(row, field) {
  if (!field) {
    return 0;
  }
  return roundMoney(Math.abs(toNumericAmount(row[field])));
}

function toNumericAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return 0;
  }

  let text = value.trim();
  if (!text) {
    return 0;
  }
  text = text.replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    text = comma > dot
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (comma >= 0) {
    text = text.replace(",", ".");
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function budgetLineName(row, fieldDefs) {
  const preferred = [
    "x_plan8_id",
    "x_plan7_id",
    "budget_line_id",
    "budget_post_id",
    "general_budget_id",
    "category_id",
    "analytic_account_id",
    "account_id",
    "product_id",
    "task_id",
    "name",
    "display_name"
  ];

  for (const field of preferred) {
    if (!fieldDefs[field]) {
      continue;
    }
    const value = relationOrText(row[field]);
    if (value) {
      return value;
    }
  }

  for (const [field, def] of Object.entries(fieldDefs)) {
    if (!isBudgetLineLabelField(field, def)) {
      continue;
    }
    const value = relationOrText(row[field]);
    if (value) {
      return value;
    }
  }

  return `Budget line ${row.id || ""}`.trim();
}

function budgetLineCategory(row, fieldDefs) {
  const preferred = [
    "x_plan8_id",
    "x_plan7_id",
    "category_id",
    "budget_line_id",
    "budget_post_id",
    "general_budget_id"
  ];

  for (const field of preferred) {
    const category = budgetLineCategoryFromField(row, fieldDefs, field);
    if (category.name) {
      return category;
    }
  }

  const candidate = Object.entries(fieldDefs)
    .map(([field, def]) => ({ field, score: scoreBudgetCategoryField(field, def) }))
    .filter((entry) => entry.score >= 70)
    .sort((a, b) => b.score - a.score || a.field.localeCompare(b.field))[0];
  return candidate ? budgetLineCategoryFromField(row, fieldDefs, candidate.field) : { field: "", id: null, name: "" };
}

function budgetLineCategoryFromField(row, fieldDefs, field) {
  if (!fieldDefs[field]) {
    return { field: "", id: null, name: "" };
  }
  const name = relationalName(row[field]);
  if (!name) {
    return { field: "", id: null, name: "" };
  }
  return {
    field,
    id: relationalId(row[field]),
    name: cleanDisplayText(name)
  };
}

function relationOrText(value) {
  return cleanDisplayText(relationalName(value) || (Array.isArray(value) ? "" : value));
}

function classifyBudgetKind(row, fieldDefs, year) {
  const text = normalizeSearchText(budgetClassificationText(row, fieldDefs));
  if (text.includes("convention") || text.includes("agreement") || text.includes("grant")) {
    return "convention";
  }
  if (text.includes("annual") || text.includes("annuel") || text.includes("annuelle") || text.includes("yearly")) {
    return "annual";
  }
  if (year) {
    return "annual";
  }
  return "other";
}

function budgetClassificationText(row, fieldDefs) {
  const parts = [row.display_name, row.name];
  Object.entries(fieldDefs).forEach(([field, def]) => {
    const meta = fieldMetaText(field, def);
    if (!["char", "text", "selection", "many2one"].includes(def.type)) {
      return;
    }
    if (["type", "kind", "category", "budget", "convention", "annual", "year"].some((keyword) => meta.includes(keyword))) {
      parts.push(relationOrText(row[field]));
    }
  });
  return parts.filter(Boolean).join(" ");
}

function inferBudgetYear(row, fieldDefs) {
  const candidates = Object.entries(fieldDefs)
    .filter(([field, def]) => {
      const meta = fieldMetaText(field, def);
      return field === "name" ||
        field === "display_name" ||
        ["year", "fiscal", "period", "date", "start", "end", "from", "to"].some((keyword) => meta.includes(keyword));
    })
    .map(([field, def]) => ({
      field,
      priority: budgetYearFieldPriority(field, def)
    }))
    .sort((a, b) => b.priority - a.priority);

  for (const candidate of candidates) {
    const year = extractYearFromValue(row[candidate.field]);
    if (year) {
      return year;
    }
  }
  return null;
}

function budgetYearFieldPriority(field, def) {
  const meta = fieldMetaText(field, def);
  if (meta.includes("year") || meta.includes("fiscal")) {
    return 100;
  }
  if (meta.includes("date") || meta.includes("period")) {
    return 70;
  }
  if (field === "name" || field === "display_name") {
    return 20;
  }
  return 10;
}

function extractYearFromValue(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const year = extractYearFromValue(entry);
      if (year) {
        return year;
      }
    }
    return null;
  }
  if (typeof value === "number" && value >= 2000 && value <= 2100) {
    return Math.trunc(value);
  }
  const match = String(value || "").match(/\b(20\d{2}|19\d{2})\b/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  return year >= 2000 && year <= 2100 ? year : null;
}

function resolveBudgetKinds(budgets, currentYear, warnings) {
  const working = budgets.map((budget) => ({ ...budget }));
  let conventionCandidates = working.filter((budget) => budget.kind === "convention");
  const unknown = working.filter((budget) => budget.kind === "other");

  if (!conventionCandidates.length && unknown.length) {
    const candidate = unknown.find((budget) => !budget.year) || unknown[0];
    candidate.kind = "convention";
    conventionCandidates = [candidate];
  }

  conventionCandidates.sort((a, b) => b.totals.budgeted - a.totals.budgeted);
  if (conventionCandidates.length > 1) {
    warnings.push(`Found ${conventionCandidates.length} convention-like budgets; showing the largest one.`);
  }

  const annualCandidates = working
    .filter((budget) => budget.kind === "annual")
    .sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.name.localeCompare(b.name));
  const futureAnnual = annualCandidates.filter((budget) => budget.year && budget.year > currentYear);
  if (futureAnnual.length) {
    warnings.push(`Excluded ${futureAnnual.length} future annual budget${futureAnnual.length === 1 ? "" : "s"} after ${currentYear}.`);
  }

  return {
    convention: conventionCandidates[0] || null,
    annual: annualCandidates.filter((budget) => !budget.year || budget.year <= currentYear),
    excludedFutureAnnualBudgetCount: futureAnnual.length
  };
}

function fieldMetaText(field, def) {
  return normalizeSearchText(`${field} ${def.string || ""}`);
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanDisplayText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function buildPlanningEmployeeDomains(availableFields, employeeName) {
  const domains = [];
  if (availableFields.has("employee_id")) {
    domains.push([["employee_id.name", "ilike", employeeName]]);
  }
  if (availableFields.has("resource_id")) {
    domains.push([["resource_id.name", "ilike", employeeName]]);
  }
  return domains.length ? domains : [[["name", "ilike", employeeName]]];
}

function buildPlanningProjectDomains(availableFields, projectCode, projectIds) {
  const domains = [];
  if (availableFields.has("project_id")) {
    domains.push(projectIds.length
      ? [["project_id", "in", projectIds]]
      : [["project_id.name", "ilike", projectCode]]);
  }
  if (availableFields.has("task_id")) {
    domains.push(projectIds.length
      ? [["task_id.project_id", "in", projectIds]]
      : [["task_id.project_id.name", "ilike", projectCode]]);
  }
  domains.push([["name", "ilike", projectCode]]);
  return domains;
}

function normalizeTimesheetLine(line) {
  return {
    id: line.id,
    date: String(line.date || ""),
    month: monthKey(line.date),
    hours: roundHours(Number(line.unit_amount || 0)),
    employee: relationalName(line.employee_id),
    employeeId: relationalId(line.employee_id),
    project: relationalName(line.project_id),
    projectId: relationalId(line.project_id),
    task: relationalName(line.task_id),
    taskId: relationalId(line.task_id),
    description: String(line.name || "")
  };
}

function normalizePlanningSlot(slot) {
  const start = String(slot.start_datetime || "");
  const end = String(slot.end_datetime || "");
  const startDate = parseOdooDateTime(start);
  const endDate = parseOdooDateTime(end);
  const percentage = Number(slot.allocated_percentage || 0);
  const durationHours = startDate && endDate && endDate > startDate
    ? (endDate - startDate) / 36e5
    : 0;
  const hours = firstFiniteNumber(
    slot.allocated_hours,
    durationHours && percentage ? durationHours * (percentage / 100) : null
  );

  return {
    id: slot.id,
    start,
    end,
    startMonth: monthKey(start),
    endMonth: monthKey(end || start),
    hours: roundHours(hours),
    allocatedPercentage: Number.isFinite(percentage) ? percentage : 0,
    employee: relationalName(slot.employee_id) || relationalName(slot.resource_id),
    employeeId: relationalId(slot.employee_id) || relationalId(slot.resource_id),
    project: planningProjectName(slot),
    projectId: relationalId(slot.project_id) || relationalId(slot.task_id) || relationalId(slot.sale_line_id) || relationalId(slot.role_id),
    task: relationalName(slot.task_id),
    saleLine: relationalName(slot.sale_line_id),
    role: relationalName(slot.role_id),
    description: String(slot.name || "")
  };
}

function buildMonthlyTimesheetSummary(lines) {
  const byMonth = new Map();
  lines.forEach((line) => {
    if (!line.month) {
      return;
    }
    if (!byMonth.has(line.month)) {
      byMonth.set(line.month, {
        month: line.month,
        totalHours: 0,
        lineCount: 0,
        projects: new Map()
      });
    }

    const month = byMonth.get(line.month);
    month.totalHours += line.hours;
    month.lineCount += 1;
    const projectName = line.project || "(No project)";
    month.projects.set(projectName, (month.projects.get(projectName) || 0) + line.hours);
  });

  return Array.from(byMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((month) => ({
      month: month.month,
      totalHours: roundHours(month.totalHours),
      lineCount: month.lineCount,
      projects: Array.from(month.projects.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, hours]) => ({ name, hours: roundHours(hours) }))
    }));
}

function buildMonthlyTimesheetEmployeeSummary(lines) {
  const byMonth = new Map();
  lines.forEach((line) => {
    if (!line.month) {
      return;
    }
    if (!byMonth.has(line.month)) {
      byMonth.set(line.month, {
        month: line.month,
        totalHours: 0,
        lineCount: 0,
        employees: new Map()
      });
    }

    const month = byMonth.get(line.month);
    month.totalHours += line.hours;
    month.lineCount += 1;
    const employeeName = line.employee || "(No employee)";
    month.employees.set(employeeName, (month.employees.get(employeeName) || 0) + line.hours);
  });

  return Array.from(byMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((month) => ({
      month: month.month,
      totalHours: roundHours(month.totalHours),
      lineCount: month.lineCount,
      employees: Array.from(month.employees.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, hours]) => ({ name, hours: roundHours(hours) }))
    }));
}

function buildMonthlyPlanningSummary(slots) {
  const byMonth = new Map();
  slots.forEach((slot) => {
    const allocations = allocateHoursAcrossMonths(slot);
    allocations.forEach((hours, monthKeyValue) => {
      if (!byMonth.has(monthKeyValue)) {
        byMonth.set(monthKeyValue, {
          month: monthKeyValue,
          totalHours: 0,
          slotCount: 0,
          projects: new Map()
        });
      }

      const month = byMonth.get(monthKeyValue);
      month.totalHours += hours;
      month.slotCount += 1;
      const projectName = slot.project || "(No project)";
      month.projects.set(projectName, (month.projects.get(projectName) || 0) + hours);
    });
  });

  return Array.from(byMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((month) => ({
      month: month.month,
      totalHours: roundHours(month.totalHours),
      slotCount: month.slotCount,
      projects: Array.from(month.projects.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, hours]) => ({ name, hours: roundHours(hours) }))
    }));
}

function buildMonthlyPlanningEmployeeSummary(slots) {
  const byMonth = new Map();
  slots.forEach((slot) => {
    const allocations = allocateHoursAcrossMonths(slot);
    allocations.forEach((hours, monthKeyValue) => {
      if (!byMonth.has(monthKeyValue)) {
        byMonth.set(monthKeyValue, {
          month: monthKeyValue,
          totalHours: 0,
          slotCount: 0,
          employees: new Map()
        });
      }

      const month = byMonth.get(monthKeyValue);
      month.totalHours += hours;
      month.slotCount += 1;
      const employeeName = slot.employee || "(No employee)";
      month.employees.set(employeeName, (month.employees.get(employeeName) || 0) + hours);
    });
  });

  return Array.from(byMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((month) => ({
      month: month.month,
      totalHours: roundHours(month.totalHours),
      slotCount: month.slotCount,
      employees: Array.from(month.employees.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, hours]) => ({ name, hours: roundHours(hours) }))
    }));
}

function allocateHoursAcrossMonths(slot) {
  const allocations = new Map();
  if (slot.hours <= 0) {
    return allocations;
  }

  const startDate = parseOdooDateTime(slot.start);
  const endDate = parseOdooDateTime(slot.end);
  if (!startDate || !endDate || endDate <= startDate) {
    const key = slot.startMonth || slot.endMonth;
    if (key) {
      allocations.set(key, slot.hours);
    }
    return allocations;
  }

  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const totalMs = endDate - startDate;
  while (cursor < endDate) {
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const overlapStart = startDate > cursor ? startDate : cursor;
    const overlapEnd = endDate < nextMonth ? endDate : nextMonth;
    if (overlapEnd > overlapStart) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      allocations.set(key, (allocations.get(key) || 0) + slot.hours * ((overlapEnd - overlapStart) / totalMs));
    }
    cursor = nextMonth;
  }

  return allocations;
}

function monthKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function parseOdooDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) {
    return null;
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  );
}

function relationalId(value) {
  return Array.isArray(value) && value.length ? value[0] : null;
}

function relationalName(value) {
  return Array.isArray(value) && value.length > 1 ? String(value[1] || "") : "";
}

function planningProjectName(slot) {
  return relationalName(slot.project_id) ||
    relationalName(slot.task_id) ||
    relationalName(slot.sale_line_id) ||
    relationalName(slot.role_id) ||
    String(slot.name || "") ||
    "(No project)";
}

function mostFrequentName(names) {
  const counts = new Map();
  names.filter(Boolean).forEach((name) => {
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function formatProjectName(projectCode, name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return `[${projectCode}] Project ${projectCode}`;
  }
  return clean.includes(projectCode) ? clean : `[${projectCode}] ${clean}`;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === false || value == null || value === "") {
      continue;
    }
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return 0;
}

function roundHours(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function xmlRpcCall(endpoint, methodName, params) {
  const body = buildXmlRpcRequest(methodName, params);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let result;
  try {
    result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "User-Agent": "odoo-time-dashboard/1.0"
      },
      body,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Odoo did not respond within 15 seconds");
    }
    throw new Error(`Could not reach Odoo: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  const xml = await result.text();
  if (!result.ok) {
    throw new Error(`Odoo returned HTTP ${result.status}`);
  }
  return parseXmlRpcResponse(xml);
}

function buildXmlRpcRequest(methodName, params) {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${escapeXml(methodName)}</methodName>
  <params>
    ${params.map((param) => `<param>${xmlRpcValue(param)}</param>`).join("\n    ")}
  </params>
</methodCall>`;
}

function xmlRpcValue(value) {
  if (value == null) {
    return "<value><nil/></value>";
  }
  if (typeof value === "boolean") {
    return `<value><boolean>${value ? "1" : "0"}</boolean></value>`;
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `<value><int>${value}</int></value>`
      : `<value><double>${value}</double></value>`;
  }
  if (Array.isArray(value)) {
    return `<value><array><data>${value.map(xmlRpcValue).join("")}</data></array></value>`;
  }
  if (typeof value === "object") {
    return `<value><struct>${Object.entries(value).map(([key, entry]) => (
      `<member><name>${escapeXml(key)}</name>${xmlRpcValue(entry)}</member>`
    )).join("")}</struct></value>`;
  }
  return `<value><string>${escapeXml(String(value))}</string></value>`;
}

function parseXmlRpcResponse(xml) {
  if (/<fault>/i.test(xml)) {
    const faultElement = extractElement(xml, "fault");
    const faultValue = faultElement ? extractElement(faultElement.content, "value") : null;
    const fault = parseStruct(faultValue ? faultValue.content : xml);
    throw new Error(fault.faultString || "Odoo returned an XML-RPC fault");
  }

  const paramStart = xml.search(/<param\b/i);
  const valueElement = extractElement(xml, "value", paramStart >= 0 ? paramStart : 0);
  if (!valueElement) {
    throw new Error("Odoo response did not contain a value");
  }
  return parseValue(valueElement.content);
}

function parseValue(xml) {
  const text = xml.trim();
  const rootTag = ((text.match(/^<([a-z0-9.:-]+)/i) || [])[1] || "").toLowerCase();

  if (rootTag === "array") {
    return parseArray(text);
  }

  if (rootTag === "struct") {
    return parseStruct(text);
  }

  if (rootTag === "nil" || /^<nil\s*\/>/i.test(text)) {
    return null;
  }

  const intValue = extractFirst(text, /<(?:int|i4)>([\s\S]*?)<\/(?:int|i4)>/i);
  if (intValue != null) {
    return Number(intValue);
  }

  const booleanValue = extractFirst(text, /<boolean>([\s\S]*?)<\/boolean>/i);
  if (booleanValue != null) {
    return booleanValue.trim() === "1";
  }

  const doubleValue = extractFirst(text, /<double>([\s\S]*?)<\/double>/i);
  if (doubleValue != null) {
    return Number(doubleValue);
  }

  const stringValue = extractFirst(text, /<string>([\s\S]*?)<\/string>/i);
  if (stringValue != null) {
    return unescapeXml(stringValue);
  }

  return unescapeXml(text.replace(/<[^>]+>/g, ""));
}

function parseArray(xml) {
  const dataElement = extractElement(xml, "data");
  const dataXml = dataElement ? dataElement.content : xml;
  const values = [];
  let cursor = 0;

  while (cursor < dataXml.length) {
    const valueElement = extractElement(dataXml, "value", cursor);
    if (!valueElement) {
      break;
    }
    values.push(parseValue(valueElement.content));
    cursor = valueElement.end;
  }

  return values;
}

function parseStruct(xml) {
  const result = {};
  let cursor = 0;

  while (cursor < xml.length) {
    const memberElement = extractElement(xml, "member", cursor);
    if (!memberElement) {
      break;
    }

    const nameElement = extractElement(memberElement.content, "name");
    const valueElement = extractElement(memberElement.content, "value");
    if (nameElement && valueElement) {
      result[unescapeXml(nameElement.content)] = parseValue(valueElement.content);
    }
    cursor = memberElement.end;
  }
  return result;
}

function extractElement(xml, tagName, fromIndex = 0) {
  const pattern = new RegExp(`<\\/?${tagName}(?:\\s[^>]*)?>`, "gi");
  pattern.lastIndex = Math.max(0, fromIndex);

  let depth = 0;
  let contentStart = -1;
  let match;
  while ((match = pattern.exec(xml))) {
    const token = match[0];
    const isClosing = token.startsWith("</");
    const isSelfClosing = token.endsWith("/>");

    if (!isClosing) {
      if (depth === 0) {
        contentStart = pattern.lastIndex;
      }
      if (!isSelfClosing) {
        depth += 1;
      }
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return {
        content: xml.slice(contentStart, match.index),
        start: match.index,
        end: pattern.lastIndex
      };
    }
  }

  return null;
}

function extractFirst(text, pattern) {
  const match = pattern.exec(text);
  return match ? match[1] : null;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(value) {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
