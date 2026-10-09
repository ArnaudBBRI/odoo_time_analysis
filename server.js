const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");
const steeringService = require("./steering-service");
const projectFinanceService = require("./project-finance-service");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8765);
const ROOT = __dirname;
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_CONFIG = {
  odooUrl: "https://odoo.buildwise.be/",
  database: "buildwiseprd"
};
const CONFIG_FILE_NAME = "config.local.json";
const authContext = new AsyncLocalStorage();
const sessions = new Map();
const loginAttempts = new Map();
const SESSION_COOKIE = "bw_session";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_SECONDS || 28800) * 1000;
const SECURE_COOKIE = process.env.SESSION_COOKIE_SECURE === "true";
if (!Number.isFinite(SESSION_TTL_MS) || SESSION_TTL_MS <= 0) {
  throw new Error("SESSION_TTL_SECONDS must be a positive number");
}
const DICO_RESPONSIBLE_UNIT = "RESEARCH AND DEVELOPMENT / DIGITAL CONSTRUCTION UNIT";
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
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".svg": "image/svg+xml"
};

const server = http.createServer((request, response) => {
  const session = getSession(request);
  authContext.run(session, async () => {
    try {
      const url = new URL(request.url, `http://${HOST}:${PORT}`);
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Referrer-Policy", "same-origin");
      response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
      if (request.method === "POST" && !isSameOrigin(request)) {
        sendJson(response, 403, { ok: false, error: "Cross-origin requests are not allowed" });
        return;
      }
      if (url.pathname === "/api/auth/login") {
        await handleLogin(request, response);
        return;
      }
      if (url.pathname === "/api/auth/login-config") {
        await handleLogin(request, response, true);
        return;
      }
      if (url.pathname === "/api/auth/logout") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
          return;
        }
        if (session) sessions.delete(session.token);
        response.setHeader("Set-Cookie", sessionCookie("", 0));
        sendJson(response, 200, { ok: true });
        return;
      }
      if (url.pathname === "/" || url.pathname === "/login" || url.pathname === "/login.html") {
        if (session) redirect(response, "/dashboard");
        else await serveStaticFile("/login.html", response);
        return;
      }
      if (url.pathname === "/assets/buildwise-logo.svg") {
        await serveStaticFile(url.pathname, response);
        return;
      }
      if (url.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }
      if (!session) {
        if (url.pathname.startsWith("/api/")) {
          sendJson(response, 401, { ok: false, error: "Please sign in to continue", authenticationRequired: true });
        } else redirect(response, "/login");
        return;
      }
      if (url.pathname === "/api/auth/session") {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, error: "Use GET for this endpoint" });
        } else sendJson(response, 200, { ok: true, email: session.username, expiresAt: session.expiresAt });
        return;
      }
      if (url.pathname === "/api/config") {
        await handleDashboardConfig(request, response);
        return;
      }
      if (["/api/odoo/pilotage/metadata", "/api/odoo/pilotage/portfolio", "/api/odoo/pilotage/project"].includes(url.pathname)) {
        await handleSteering(request, response, url.pathname);
        return;
      }
      if (["/steering.js", "/steering-client.js", "/steering-client.css", "/personal-time.js", "/personal-time.css", "/project-monthly.js", "/project-browser.js", "/project-browser.css", "/project-budget.js", "/project-budget.css"].includes(url.pathname)) {
        await serveStaticFile(url.pathname, response);
        return;
      }
      if (url.pathname === "/api/odoo/my-time") {
        await handleMyTime(request, response);
        return;
      }
      if (url.pathname === "/api/odoo/project-hours") {
        await handleProjectHours(request, response);
        return;
      }
      if (url.pathname === "/api/odoo/project-finance") {
        await handleProjectFinance(request, response);
        return;
      }
      if (["/api/odoo/my-lead-unit", "/api/odoo/team-projects"].includes(url.pathname)) {
        await handleTeamPortfolio(request, response, url.pathname);
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
      const projectRoutes = { "/api/odoo/project-workpackages": handleProjectWorkPackages, "/api/odoo/project-milestones": handleProjectMilestones, "/api/odoo/project-budgets": handleProjectBudgets, "/api/odoo/dico-projects": handleDicoProjects };
      if (projectRoutes[url.pathname]) { await projectRoutes[url.pathname](request, response); return; }
      if (url.pathname === "/dashboard" || url.pathname === "/index.html") {
        await serveStaticFile("/index.html", response);
      } else sendJson(response, 404, { ok: false, error: "Not found" });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error.message || "Unexpected server error"
      });
    }
  });
});

function redirect(response, location) {
  response.writeHead(303, { Location: location });
  response.end();
}

function sessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? "; Secure" : ""}`;
}

function getSession(request) {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
  const cookie = String(request.headers.cookie || "").split(";")
    .map((value) => value.trim()).find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  return cookie ? sessions.get(cookie.slice(SESSION_COOKIE.length + 1)) || null : null;
}

function isSameOrigin(request) {
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  if (!request.headers.origin) return true;
  try {
    const origin = new URL(request.headers.origin);
    return origin.host === request.headers.host && origin.protocol === (SECURE_COOKIE ? "https:" : "http:");
  } catch (_) { return false; }
}

function isLocalConfigLogin(request) {
  const address = request.socket.remoteAddress;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) return false;
  try {
    const host = new URL(`http://${request.headers.host}`).hostname;
    return ["localhost", "127.0.0.1", "[::1]"].includes(host);
  } catch (_) { return false; }
}

function sendConfigLoginError(response, status, code, error) {
  sendJson(response, status, { ok: false, code, error });
}

async function handleLogin(request, response, useConfig = false) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }
  if (useConfig && !isLocalConfigLogin(request)) {
    sendConfigLoginError(response, 403, "CONFIG_LOCAL_ONLY", "Config-file sign-in is available only on this computer via localhost.");
    return;
  }
  const now = Date.now();
  for (const [address, attempt] of loginAttempts) {
    if (attempt.until <= now) loginAttempts.delete(address);
  }
  const address = request.socket.remoteAddress;
  const attempt = loginAttempts.get(address) || { count: 0, until: now + 15 * 60 * 1000 };
  if (attempt.count >= 10 || loginAttempts.size >= 10000 && !loginAttempts.has(address)) {
    response.setHeader("Retry-After", String(Math.max(1, Math.ceil((attempt.until - now) / 1000))));
    sendJson(response, 429, { ok: false, error: "Too many attempts. Please try again later." });
    return;
  }
  attempt.count += 1;
  loginAttempts.set(address, attempt);
  let body;
  try { body = await readJsonBody(request); }
  catch (_) {
    sendJson(response, 400, { ok: false, error: useConfig ? "Request body must be valid JSON" : "Please provide a valid email and password" });
    return;
  }
  let email = typeof body?.email === "string" ? body.email.trim() : "";
  let password = typeof body?.password === "string" ? body.password : "";
  if (!useConfig && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 4096)) {
    sendJson(response, 400, { ok: false, error: "Please provide a valid email and password" });
    return;
  }
  let odooUrl, database, uid;
  if (useConfig) {
    let info;
    try { info = readDashboardConfigInfo(); }
    catch (_) {
      sendConfigLoginError(response, 400, "CONFIG_INVALID", "The local config file could not be read. Check its JSON and token settings.");
      return;
    }
    if (!info.source) {
      sendConfigLoginError(response, 400, "CONFIG_MISSING", "No config.local.json file is present.");
      return;
    }
    const config = info.values;
    email = typeof config.username === "string" ? config.username.trim() : "";
    password = [config.apiKey, config.api_key].find(value => typeof value === "string" && value.trim()) || "";
    try {
      if (!email || email.length > 254 || !password || password.length > 4096) throw new Error("Invalid config credentials");
      odooUrl = normalizeOdooUrl(firstNonBlank(config.odooUrl, config.url, DEFAULT_CONFIG.odooUrl));
      database = cleanRequired(firstNonBlank(config.database, DEFAULT_CONFIG.database), "Database");
    } catch (_) {
      sendConfigLoginError(response, 400, "CONFIG_INVALID", "The local config file needs a valid username, API token and Odoo connection settings.");
      return;
    }
  }
  try {
    if (!useConfig) {
      const config = readDashboardConfigInfo().values;
      odooUrl = normalizeOdooUrl(firstNonBlank(config.odooUrl, config.url, DEFAULT_CONFIG.odooUrl));
      database = cleanRequired(firstNonBlank(config.database, DEFAULT_CONFIG.database), "Database");
    }
    uid = await authenticateOdoo(odooUrl, database, email, password);
  } catch (error) {
    if (/access.?denied|invalid credentials/i.test(error.message || "")) {
      if (useConfig) sendConfigLoginError(response, 401, "CONFIG_TOKEN_REJECTED", "The configured token was rejected by Odoo. It may be invalid or expired.");
      else sendJson(response, 401, { ok: false, error: "Email or password not recognized by Odoo" });
    } else sendJson(response, 502, { ok: false, error: "Odoo sign-in is unavailable. Please try again later." });
    return;
  }
  if (!Number.isSafeInteger(uid) || uid <= 0) {
    if (useConfig) sendConfigLoginError(response, 401, "CONFIG_TOKEN_REJECTED", "The configured token was rejected by Odoo. It may be invalid or expired.");
    else sendJson(response, 401, { ok: false, error: "Email or password not recognized by Odoo" });
    return;
  }
  if (sessions.size >= 1000) {
    sendJson(response, 503, { ok: false, error: "Sign-in is temporarily unavailable. Please try again later." });
    return;
  }
  loginAttempts.delete(address);
  const previous = authContext.getStore();
  if (previous) sessions.delete(previous.token);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { token, expiresAt, username: email, apiKey: password, odooUrl, database, uid });
  response.setHeader("Set-Cookie", sessionCookie(token, Math.ceil(SESSION_TTL_MS / 1000)));
  sendJson(response, 200, { ok: true, email, expiresAt });
}

server.listen(PORT, HOST, () => {
  console.log(`Odoo Time Dashboard running at http://${HOST}:${server.address().port}/`);
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
  await enrichEmployeeFunctions(odooUrl, database, uid, apiKey, normalizedLines, warnings);
  const monthly = buildMonthlyTimesheetSummary(normalizedLines);
  const employeeMonthly = buildMonthlyTimesheetSummary(normalizedLines.filter((line) => !line.isSubcontractor));

  sendJson(response, 200, {
    ok: true,
    uid,
    employeeName,
    model: "account.analytic.line",
    domain,
    lineCount: normalizedLines.length,
    totalHours: roundHours(normalizedLines.reduce((total, line) => total + line.hours, 0)),
    monthly,
    employeeMonthly,
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
  await enrichEmployeeFunctions(odooUrl, database, uid, apiKey, normalizedSlots, warnings);
  const monthly = buildMonthlyPlanningSummary(normalizedSlots);
  const employeeMonthly = buildMonthlyPlanningSummary(normalizedSlots.filter((slot) => !slot.isSubcontractor));

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
    employeeMonthly,
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
  await enrichEmployeeFunctions(odooUrl, database, uid, apiKey, normalizedLines, warnings);
  const monthly = buildMonthlyTimesheetEmployeeSummary(normalizedLines);
  const employeeMonthly = buildMonthlyTimesheetEmployeeSummary(normalizedLines.filter((line) => !line.isSubcontractor));
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
    employeeMonthly,
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
  await enrichEmployeeFunctions(odooUrl, database, uid, apiKey, normalizedSlots, warnings);
  const monthly = buildMonthlyPlanningEmployeeSummary(normalizedSlots);
  const employeeMonthly = buildMonthlyPlanningEmployeeSummary(normalizedSlots.filter((slot) => !slot.isSubcontractor));
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
    employeeMonthly,
    slots: normalizedSlots,
    warnings
  });
}

async function handleProjectWorkPackages(request, response) {
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
  const fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, "project.task");
  const availableFields = new Set(Object.keys(fieldDefs));
  const fields = buildWorkPackageTaskFields(fieldDefs);
  const domains = buildProjectTaskDomains(availableFields, projectCode, projectIds);
  let tasks = null;
  let domain = null;

  for (const candidateDomain of domains) {
    try {
      const rows = await searchReadAll(odooUrl, database, uid, apiKey, "project.task", candidateDomain, fields, {
        order: availableFields.has("sequence") ? "sequence asc, id asc" : "id asc"
      });
      if (!tasks || rows.length > 0) {
        tasks = rows;
        domain = candidateDomain;
      }
      if (rows.length > 0) {
        break;
      }
    } catch (error) {
      warnings.push(`Task search failed for ${JSON.stringify(candidateDomain)}: ${error.message}`);
    }
  }

  if (!tasks) {
    throw new Error(warnings[warnings.length - 1] || "Could not search project tasks");
  }

  const normalizedTasks = tasks.map((task) => normalizeWorkPackageTask(task, fieldDefs));
  const workPackageCount = normalizedTasks.filter((task) => task.isWorkPackage).length;
  normalizedTasks.sort(compareWorkPackages);
  if (!workPackageCount && normalizedTasks.length) {
    warnings.push("No workpackage tasks were detected in the fetched project tasks.");
  }

  const projectName = formatProjectName(
    projectCode,
    mostFrequentName(normalizedTasks.map((task) => task.project)) || (projects[0] && projects[0].name)
  );

  sendJson(response, 200, {
    ok: true,
    uid,
    projectCode,
    projectName,
    projectIds,
    model: "project.task",
    domain,
    fields,
    taskCount: normalizedTasks.length,
    workPackageCount,
    workPackages: normalizedTasks,
    warnings
  });
}

async function handleProjectMilestones(request, response) {
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
  let fieldDefs;
  try {
    fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, "project.milestone");
  } catch (error) {
    warnings.push(`Project milestone lookup failed: ${error.message}`);
    sendJson(response, 200, {
      ok: true,
      uid,
      projectCode,
      projectName: formatProjectName(projectCode, projects[0] && projects[0].name),
      projectIds,
      model: "project.milestone",
      domain: null,
      fields: [],
      milestoneCount: 0,
      milestones: [],
      warnings
    });
    return;
  }

  const availableFields = new Set(Object.keys(fieldDefs));
  const fields = buildMilestoneFields(fieldDefs);
  const domains = buildProjectMilestoneDomains(availableFields, projectCode, projectIds);
  let milestones = null;
  let domain = null;

  for (const candidateDomain of domains) {
    try {
      const rows = await searchReadAll(odooUrl, database, uid, apiKey, "project.milestone", candidateDomain, fields, {
        order: availableFields.has("deadline") ? "deadline asc, id asc" : "id asc"
      });
      if (!milestones || rows.length > 0) {
        milestones = rows;
        domain = candidateDomain;
      }
      if (rows.length > 0) {
        break;
      }
    } catch (error) {
      warnings.push(`Milestone search failed for ${JSON.stringify(candidateDomain)}: ${error.message}`);
    }
  }

  if (!milestones) {
    throw new Error(warnings[warnings.length - 1] || "Could not search project milestones");
  }

  const normalizedMilestones = milestones
    .map((milestone) => normalizeMilestone(milestone, fieldDefs))
    .filter((milestone) => milestone.date)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: "base" }));
  const projectName = formatProjectName(
    projectCode,
    mostFrequentName(normalizedMilestones.map((milestone) => milestone.project)) || (projects[0] && projects[0].name)
  );

  sendJson(response, 200, {
    ok: true,
    uid,
    projectCode,
    projectName,
    projectIds,
    model: "project.milestone",
    domain,
    fields,
    milestoneCount: normalizedMilestones.length,
    milestones: normalizedMilestones,
    warnings
  });
}

async function handleDicoProjects(request, response) {
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

  const warnings = [];
  const fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, "project.project");
  const candidates = findResponsibleUnitProjectFields(fieldDefs);
  if (!candidates.length) {
    warnings.push("No likely project responsible-unit field was found.");
    sendJson(response, 200, {
      ok: true,
      uid,
      responsibleUnit: DICO_RESPONSIBLE_UNIT,
      model: "project.project",
      domain: null,
      fields: [],
      matchedField: "",
      projectCount: 0,
      projects: [],
      warnings
    });
    return;
  }

  const fields = buildDicoProjectFields(fieldDefs, candidates);
  let rows = [];
  let domain = null;
  let matchedField = "";

  for (const candidate of candidates) {
    for (const searchValue of dicoResponsibleUnitSearchValues()) {
      const candidateDomain = buildResponsibleUnitDomain(candidate, searchValue);
      try {
        const candidateRows = await searchReadAll(odooUrl, database, uid, apiKey, "project.project", candidateDomain, fields, {
          order: "name asc"
        });
        if (candidateRows.length) {
          rows = candidateRows;
          domain = candidateDomain;
          matchedField = candidate.field;
          break;
        }
      } catch (error) {
        warnings.push(`Dico project search failed for ${candidate.field}: ${error.message}`);
      }
    }
    if (rows.length) {
      break;
    }
  }

  if (!rows.length) {
    warnings.push(`No projects found with responsible unit "${DICO_RESPONSIBLE_UNIT}" using ${candidates.map((candidate) => candidate.field).join(", ")}.`);
  }

  const projects = rows.map((project) => normalizeDicoProject(project, matchedField)).filter((project) => project.name);
  const projectIds = projects.map((project) => Number(project.id)).filter((id) => Number.isFinite(id));
  let actualMonthly = [];
  let employeeActualMonthly = [];
  let actualLines = [];
  let actualLineCount = 0;
  let actualTotalHours = 0;
  let plannedMonthly = [];
  let employeePlannedMonthly = [];
  let plannedSlots = [];
  let plannedSlotCount = 0;
  let plannedTotalHours = 0;

  if (projectIds.length) {
    try {
      const lineFields = ["id", "date", "unit_amount", "name", "employee_id", "project_id", "task_id"];
      const lines = await searchReadAll(odooUrl, database, uid, apiKey, "account.analytic.line", [["project_id", "in", projectIds]], lineFields, {
        order: "date asc, id asc"
      });
      const normalizedLines = lines.map(normalizeTimesheetLine).filter((line) => line.date);
      await enrichEmployeeFunctions(odooUrl, database, uid, apiKey, normalizedLines, warnings);
      actualLines = normalizedLines;
      actualMonthly = buildMonthlyTimesheetSummary(normalizedLines);
      employeeActualMonthly = buildMonthlyTimesheetSummary(normalizedLines.filter((line) => !line.isSubcontractor));
      actualLineCount = normalizedLines.length;
      actualTotalHours = roundHours(normalizedLines.reduce((total, line) => total + line.hours, 0));
    } catch (error) {
      warnings.push(`Dico project timesheet fetch failed: ${error.message}`);
    }

    try {
      const planningFieldDefs = await getModelFields(odooUrl, database, uid, apiKey, "planning.slot");
      const availablePlanningFields = new Set(Object.keys(planningFieldDefs));
      const planningFields = [
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
      ].filter((field) => availablePlanningFields.has(field));
      const planningDomains = buildPlanningProjectIdDomains(availablePlanningFields, projectIds);
      let slots = [];
      let planningDomain = null;
      for (const candidateDomain of planningDomains) {
        const candidateSlots = await searchReadAll(odooUrl, database, uid, apiKey, "planning.slot", candidateDomain, planningFields, {
          order: availablePlanningFields.has("start_datetime") ? "start_datetime asc, id asc" : "id asc"
        });
        if (!slots.length || candidateSlots.length > 0) {
          slots = candidateSlots;
          planningDomain = candidateDomain;
        }
        if (candidateSlots.length > 0) {
          break;
        }
      }
      const normalizedSlots = slots.map(normalizePlanningSlot).filter((slot) => slot.start || slot.end || slot.hours > 0);
      await enrichEmployeeFunctions(odooUrl, database, uid, apiKey, normalizedSlots, warnings);
      plannedSlots = normalizedSlots;
      plannedMonthly = buildMonthlyPlanningSummary(normalizedSlots);
      employeePlannedMonthly = buildMonthlyPlanningSummary(normalizedSlots.filter((slot) => !slot.isSubcontractor));
      plannedSlotCount = normalizedSlots.length;
      plannedTotalHours = roundHours(normalizedSlots.reduce((total, slot) => total + slot.hours, 0));
      if (!planningDomain) {
        warnings.push("No project planning domain was available for Dico projects.");
      }
    } catch (error) {
      warnings.push(`Dico project planning fetch failed: ${error.message}`);
    }
  }

  sendJson(response, 200, {
    ok: true,
    uid,
    responsibleUnit: DICO_RESPONSIBLE_UNIT,
    model: "project.project",
    domain,
    fields,
    matchedField,
    projectCount: projects.length,
    projects,
    actualMonthly,
    employeeActualMonthly,
    lines: actualLines,
    actualLineCount,
    actualTotalHours,
    plannedMonthly,
    employeePlannedMonthly,
    slots: plannedSlots,
    plannedSlotCount,
    plannedTotalHours,
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
    const settings = getMergedConnectorSettings({});

    sendJson(response, 200, {
      ok: true,
      hasConfig: Boolean(configInfo.source),
      odooUrl: normalizeOdooUrl(settings.odooUrl),
      database: settings.database,
      username: settings.username,
      employeeName: settings.employeeName,
      projectCode: settings.projectCode,
      hasApiKey: false,
      authenticated: true
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
    apiKey: cleanCredential(settings.apiKey)
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
    projectCode: Number.isSafeInteger(body.projectId) && body.projectId > 0 ? `id:${body.projectId}` : cleanProjectCode(settings.projectCode)
  };
}

function getMergedConnectorSettings(body = {}) {
  const session = authContext.getStore();
  if (session) {
    return {
      odooUrl: session.odooUrl,
      database: session.database,
      username: session.username,
      apiKey: session.apiKey,
      employeeName: firstNonBlank(body.employeeName),
      projectCode: firstNonBlank(body.projectCode, body.projectName, body.projectQuery)
    };
  }
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
  } catch (_) {
    throw new Error(`${CONFIG_FILE_NAME} could not be read. Check that it contains a valid JSON object.`);
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

function cleanCredential(value) {
  if (typeof value !== "string" || !value.length) throw new Error("API key is required");
  return value;
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
      order: options.order || "id asc",
      ...(options.context ? { context: options.context } : {})
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
  if (/^id:\d+$/.test(projectCode)) {
    const projects = await searchReadAll(odooUrl, database, uid, apiKey, "project.project", [["id", "=", Number(projectCode.slice(3))]], ["id", "name"], {context: {active_test: false}});
    if (!projects.length) throw new Error("Selected project is unavailable");
    return projects;
  }
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
  return normalizeSearchText(`${field} ${def.string || ""}`)
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

function buildPlanningProjectIdDomains(availableFields, projectIds) {
  const domains = [];
  if (!projectIds.length) {
    return domains;
  }
  if (availableFields.has("project_id")) {
    domains.push([["project_id", "in", projectIds]]);
  }
  if (availableFields.has("task_id")) {
    domains.push([["task_id.project_id", "in", projectIds]]);
  }
  return domains;
}

function buildProjectTaskDomains(availableFields, projectCode, projectIds) {
  const domains = [];
  if (availableFields.has("project_id")) {
    domains.push(projectIds.length
      ? [["project_id", "in", projectIds]]
      : [["project_id.name", "ilike", projectCode]]);
  }
  if (availableFields.has("display_name")) {
    domains.push([["display_name", "ilike", projectCode]]);
  }
  domains.push([["name", "ilike", projectCode]]);
  return domains;
}

function buildProjectMilestoneDomains(availableFields, projectCode, projectIds) {
  const domains = [];
  if (availableFields.has("project_id")) {
    domains.push(projectIds.length
      ? [["project_id", "in", projectIds]]
      : [["project_id.name", "ilike", projectCode]]);
  }
  if (availableFields.has("project_ids")) {
    domains.push(projectIds.length
      ? [["project_ids", "in", projectIds]]
      : [["project_ids.name", "ilike", projectCode]]);
  }
  if (availableFields.has("display_name")) {
    domains.push([["display_name", "ilike", projectCode]]);
  }
  domains.push([["name", "ilike", projectCode]]);
  return domains;
}

function findResponsibleUnitProjectFields(fieldDefs) {
  return Object.entries(fieldDefs)
    .map(([field, definition]) => ({
      field,
      definition,
      score: responsibleUnitFieldScore(field, definition)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.field.localeCompare(b.field));
}

function responsibleUnitFieldScore(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  const compact = text.replace(/[^a-z0-9]+/g, "");
  const type = definition.type || "";
  if (!["char", "many2many", "many2one", "selection", "text"].includes(type)) {
    return 0;
  }
  if (compact.includes("responsibleunit") || text.includes("responsible unit") || text.includes("unite responsable")) {
    return 100;
  }
  if (text.includes("responsible") && /\b(unit|department|service|division|pole|entity)\b/.test(text)) {
    return 85;
  }
  if (/\b(unit|department|service|division|pole|entity|unite|departement)\b/.test(text) && /\b(responsible|owner|lead|manager|responsable)\b/.test(text)) {
    return 75;
  }
  if (/\b(unit|department|service|division|pole|entity|unite|departement)\b/.test(text)) {
    return 35;
  }
  return 0;
}

function buildDicoProjectFields(fieldDefs, candidates) {
  const fields = [];
  const addField = (field) => {
    if (fieldDefs[field] && !fields.includes(field)) {
      fields.push(field);
    }
  };
  ["id", "name", "display_name"].forEach(addField);
  candidates.slice(0, 12).forEach((candidate) => addField(candidate.field));
  return fields;
}

function dicoResponsibleUnitSearchValues() {
  return [
    DICO_RESPONSIBLE_UNIT,
    "DIGITAL CONSTRUCTION UNIT",
    "Dico"
  ];
}

function buildResponsibleUnitDomain(candidate, searchValue) {
  const type = candidate.definition.type || "";
  if (type === "many2one" || type === "many2many") {
    return [[`${candidate.field}.name`, "ilike", searchValue]];
  }
  return [[candidate.field, "ilike", searchValue]];
}

function normalizeDicoProject(project, responsibleField) {
  return {
    id: project.id,
    name: String(project.display_name || project.name || `Project ${project.id || ""}`).trim(),
    responsibleUnit: projectFieldDisplayValue(project[responsibleField]),
    responsibleField
  };
}

function projectFieldDisplayValue(value) {
  if (Array.isArray(value) && value.length && Array.isArray(value[0])) {
    return relationalNames(value).join(", ");
  }
  if (Array.isArray(value)) {
    return relationalName(value) || relationalNames(value).join(", ") || String(value[0] || "");
  }
  if (value === false || value == null) {
    return "";
  }
  return String(value);
}

function buildMilestoneFields(fieldDefs) {
  const exactFields = new Set([
    "id",
    "name",
    "display_name",
    "project_id",
    "project_ids",
    "deadline",
    "date_deadline",
    "date",
    "target_date",
    "due_date",
    "milestone_date",
    "is_reached",
    "reached_date"
  ]);
  const fields = [];
  const addField = (field) => {
    if (fieldDefs[field] && isReadableMilestoneField(fieldDefs[field]) && !fields.includes(field)) {
      fields.push(field);
    }
  };

  exactFields.forEach(addField);
  Object.entries(fieldDefs).forEach(([field, definition]) => {
    if (isReadableMilestoneField(definition) && isRelevantMilestoneField(field, definition)) {
      addField(field);
    }
  });

  return fields.length ? fields : ["id", "name"].filter((field) => fieldDefs[field]);
}

function isReadableMilestoneField(definition = {}) {
  return [
    "boolean",
    "char",
    "date",
    "datetime",
    "integer",
    "many2many",
    "many2one",
    "selection",
    "text"
  ].includes(definition.type);
}

function isRelevantMilestoneField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return /\b(project|milestone|jalon|deadline|target|due|date|reached|atteint)\b/.test(text);
}

function normalizeMilestone(milestone, fieldDefs) {
  const datePick = pickMilestoneDateField(milestone, fieldDefs);
  return {
    id: milestone.id,
    name: String(milestone.display_name || milestone.name || `Milestone ${milestone.id || ""}`).trim(),
    date: datePick.value,
    project: relationalName(milestone.project_id) || relationalNames(milestone.project_ids).join(", "),
    projectId: relationalId(milestone.project_id),
    isReached: Boolean(milestone.is_reached),
    reachedDate: normalizeTaskDate(milestone.reached_date),
    sourceFields: {
      date: datePick.field,
      project: milestone.project_id ? "project_id" : milestone.project_ids ? "project_ids" : ""
    }
  };
}

function pickMilestoneDateField(milestone, fieldDefs) {
  const exactFields = [
    "deadline",
    "date_deadline",
    "target_date",
    "due_date",
    "milestone_date",
    "date"
  ];

  for (const field of exactFields) {
    if (!(field in milestone)) {
      continue;
    }
    const value = normalizeTaskDate(milestone[field]);
    if (value) {
      return { field, value };
    }
  }

  for (const field of Object.keys(milestone)) {
    const definition = fieldDefs[field] || {};
    if (exactFields.includes(field) || !isMilestoneDateField(field, definition)) {
      continue;
    }
    const value = normalizeTaskDate(milestone[field]);
    if (value) {
      return { field, value };
    }
  }

  return { field: "", value: "" };
}

function isMilestoneDateField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return ["date", "datetime"].includes(definition.type || "") &&
    /\b(deadline|target|due|milestone|jalon|date)\b/.test(text) &&
    !/\b(reached|atteint|done|completed)\b/.test(text);
}

function buildWorkPackageTaskFields(fieldDefs) {
  const exactFields = new Set([
    "id",
    "name",
    "display_name",
    "project_id",
    "parent_id",
    "sequence",
    "date_deadline",
    "planned_date_begin",
    "planned_date_end",
    "date_start",
    "date_end",
    "start_date",
    "end_date",
    "date_begin",
    "progress",
    "progress_percent",
    "progress_percentage",
    "percentage",
    "percent_complete",
    "completion",
    "effective_hours",
    "total_hours_spent",
    "timesheet_hours",
    "timesheet_time",
    "spent_hours",
    "hours_spent",
    "worked_hours",
    "actual_hours",
    "planned_hours",
    "allocated_hours",
    "subtask_planned_hours",
    "forecast_hours",
    "foreseen_hours",
    "estimated_hours",
    "initially_planned_hours",
    "remaining_hours",
    "task_type",
    "task_type_id",
    "type_id",
    "type",
    "task_kind",
    "kind",
    "is_workpackage",
    "is_work_package",
    "workpackage",
    "work_package",
    "x_is_workpackage",
    "x_workpackage",
    "x_type",
    "x_task_type",
    "x_progress",
    "x_progress_percentage",
    "x_planned_hours",
    "x_foreseen_hours",
    "x_estimated_hours",
    "x_start_date",
    "x_end_date"
  ]);
  const fields = [];
  const addField = (field) => {
    if (fieldDefs[field] && isReadableTaskField(fieldDefs[field]) && !fields.includes(field)) {
      fields.push(field);
    }
  };

  exactFields.forEach(addField);
  Object.entries(fieldDefs).forEach(([field, definition]) => {
    if (isReadableTaskField(definition) && isRelevantWorkPackageField(field, definition)) {
      addField(field);
    }
  });

  return fields.length ? fields : ["id", "name"].filter((field) => fieldDefs[field]);
}

function isReadableTaskField(definition = {}) {
  return [
    "boolean",
    "char",
    "date",
    "datetime",
    "float",
    "integer",
    "many2one",
    "monetary",
    "selection",
    "text"
  ].includes(definition.type);
}

function isRelevantWorkPackageField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  const compact = text.replace(/[^a-z0-9]+/g, "");
  const type = definition.type || "";

  if (compact.includes("workpackage") || text.includes("work package")) {
    return true;
  }
  if (/\bwp\b/.test(text) && /\b(type|kind|category|categorie)\b/.test(text)) {
    return true;
  }
  if (/\b(type|kind|category|categorie)\b/.test(text) && ["char", "many2one", "selection"].includes(type)) {
    return true;
  }
  if (/\b(progress|percentage|percent|completion|advancement|avancement)\b/.test(text)) {
    return true;
  }
  if (/\b(hour|hours|heure|heures|time)\b/.test(text) &&
      /\b(planned|allocated|forecast|foreseen|estimated|spent|effective|timesheet|worked|consumed|remaining|prevu|prevue|previsionnel|alloue|allouee|consomme)\b/.test(text)) {
    return true;
  }
  if (["date", "datetime"].includes(type) &&
      /\b(start|begin|deadline|due|end|finish|planned|debut|fin|echeance|planifie)\b/.test(text)) {
    return true;
  }
  return false;
}

function normalizeWorkPackageTask(task, fieldDefs) {
  const progressPick = pickNumericTaskField(task, fieldDefs, [
    "progress",
    "progress_percent",
    "progress_percentage",
    "percentage",
    "percent_complete",
    "completion",
    "x_progress",
    "x_progress_percentage",
    "x_avancement"
  ], isProgressTaskField);
  const progressPercent = normalizePercent(progressPick.value);
  const spentPick = pickNumericTaskField(task, fieldDefs, [
    "effective_hours",
    "total_hours_spent",
    "timesheet_hours",
    "timesheet_time",
    "spent_hours",
    "hours_spent",
    "worked_hours",
    "actual_hours",
    "x_effective_hours",
    "x_spent_hours",
    "x_timesheet_hours"
  ], isSpentHoursTaskField);
  const remainingPick = pickNumericTaskField(task, fieldDefs, [
    "remaining_hours",
    "x_remaining_hours"
  ], isRemainingHoursTaskField, new Set([spentPick.field, progressPick.field].filter(Boolean)));
  const plannedPick = pickNumericTaskField(task, fieldDefs, [
    "planned_hours",
    "allocated_hours",
    "subtask_planned_hours",
    "forecast_hours",
    "foreseen_hours",
    "estimated_hours",
    "initially_planned_hours",
    "x_planned_hours",
    "x_foreseen_hours",
    "x_estimated_hours"
  ], isPlannedHoursTaskField, new Set([spentPick.field, progressPick.field, remainingPick.field].filter(Boolean)));
  let plannedHours = plannedPick.value;
  let plannedHoursField = plannedPick.field;

  if ((plannedHours == null || plannedHours <= 0) && remainingPick.value > 0) {
    plannedHours = (spentPick.value || 0) + remainingPick.value;
    plannedHoursField = remainingPick.field ? `${spentPick.field || "spent"} + ${remainingPick.field}` : plannedHoursField;
  }
  if ((plannedHours == null || plannedHours <= 0) && spentPick.value > 0 && progressPercent > 0) {
    plannedHours = spentPick.value / (progressPercent / 100);
    plannedHoursField = `${spentPick.field || "spent"} / ${progressPick.field || "progress"}`;
  }

  const startPick = pickDateTaskField(task, fieldDefs, [
    "planned_date_begin",
    "date_start",
    "start_date",
    "date_begin",
    "x_start_date",
    "x_date_start",
    "x_planned_start_date"
  ], isStartDateTaskField);
  const endPick = pickDateTaskField(task, fieldDefs, [
    "planned_date_end",
    "date_deadline",
    "date_end",
    "end_date",
    "x_end_date",
    "x_date_end",
    "x_planned_end_date"
  ], isEndDateTaskField);
  const typePick = pickTaskType(task, fieldDefs);
  const expectedProgressPercent = calculateExpectedProgressPercent(startPick.value, endPick.value, new Date());
  const hoursSpent = roundHours(spentPick.value || 0);
  const normalizedPlannedHours = roundHours(plannedHours || 0);

  return {
    id: task.id,
    name: String(task.display_name || task.name || `Task ${task.id || ""}`).trim(),
    displayName: String(task.display_name || ""),
    project: relationalName(task.project_id),
    projectId: relationalId(task.project_id),
    parent: relationalName(task.parent_id),
    parentId: relationalId(task.parent_id),
    taskType: typePick.value,
    typeField: typePick.field,
    isWorkPackage: taskContainsWorkPackage(task, fieldDefs),
    startDate: startPick.value,
    endDate: endPick.value,
    progressPercent: progressPercent == null ? null : roundPercent(progressPercent),
    expectedProgressPercent: expectedProgressPercent == null ? null : roundPercent(expectedProgressPercent),
    hoursSpent,
    plannedHours: normalizedPlannedHours,
    consumptionPercent: normalizedPlannedHours > 0 ? roundPercent((hoursSpent / normalizedPlannedHours) * 100) : null,
    sourceFields: {
      startDate: startPick.field,
      endDate: endPick.field,
      progressPercent: progressPick.field,
      hoursSpent: spentPick.field,
      plannedHours: plannedHoursField,
      remainingHours: remainingPick.field,
      taskType: typePick.field
    }
  };
}

function pickNumericTaskField(task, fieldDefs, exactFields, predicate, excludedFields = new Set()) {
  for (const field of exactFields) {
    if (excludedFields.has(field) || !(field in task)) {
      continue;
    }
    const value = parseTaskNumber(task[field]);
    if (value != null) {
      return { field, value };
    }
  }

  for (const field of Object.keys(task)) {
    if (excludedFields.has(field) || exactFields.includes(field) || !predicate(field, fieldDefs[field])) {
      continue;
    }
    const value = parseTaskNumber(task[field]);
    if (value != null) {
      return { field, value };
    }
  }
  return { field: "", value: null };
}

function pickDateTaskField(task, fieldDefs, exactFields, predicate) {
  for (const field of exactFields) {
    if (!(field in task)) {
      continue;
    }
    const value = normalizeTaskDate(task[field]);
    if (value) {
      return { field, value };
    }
  }

  for (const field of Object.keys(task)) {
    if (exactFields.includes(field) || !predicate(field, fieldDefs[field])) {
      continue;
    }
    const value = normalizeTaskDate(task[field]);
    if (value) {
      return { field, value };
    }
  }
  return { field: "", value: "" };
}

function pickTaskType(task, fieldDefs) {
  for (const field of Object.keys(task)) {
    const definition = fieldDefs[field] || {};
    if (!isTaskTypeField(field, definition)) {
      continue;
    }
    const value = taskValueText(task[field]);
    if (value) {
      return { field, value };
    }
  }
  return { field: "", value: "" };
}

function isProgressTaskField(field, definition = {}) {
  return /\b(progress|percentage|percent|completion|advancement|avancement)\b/.test(fieldInfoText(field, definition));
}

function isSpentHoursTaskField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return /\b(hour|hours|heure|heures|time)\b/.test(text) &&
    /\b(spent|effective|timesheet|worked|actual|consumed|consomme)\b/.test(text);
}

function isRemainingHoursTaskField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return /\b(hour|hours|heure|heures|time)\b/.test(text) && /\b(remaining|reste|restant)\b/.test(text);
}

function isPlannedHoursTaskField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return /\b(hour|hours|heure|heures|time)\b/.test(text) &&
    /\b(planned|allocated|forecast|foreseen|estimated|prevu|prevue|previsionnel|alloue|allouee)\b/.test(text);
}

function isStartDateTaskField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return /\b(start|begin|debut)\b/.test(text) && !/\b(end|deadline|due|fin|echeance)\b/.test(text);
}

function isEndDateTaskField(field, definition = {}) {
  return /\b(end|deadline|due|finish|fin|echeance)\b/.test(fieldInfoText(field, definition));
}

function isTaskTypeField(field, definition = {}) {
  const text = fieldInfoText(field, definition);
  return (["char", "many2one", "selection"].includes(definition.type || "") &&
    /\b(type|kind|category|categorie)\b/.test(text)) ||
    text.replace(/[^a-z0-9]+/g, "").includes("workpackage");
}

function taskContainsWorkPackage(task, fieldDefs) {
  for (const [field, value] of Object.entries(task)) {
    const definition = fieldDefs[field] || {};
    const text = fieldInfoText(field, definition);
    const compact = text.replace(/[^a-z0-9]+/g, "");
    if (typeof value === "boolean") {
      if (value && (compact.includes("workpackage") || text.includes("work package"))) {
        return true;
      }
      continue;
    }
    if (!isTaskTypeField(field, definition) &&
        !compact.includes("workpackage") &&
        !text.includes("work package") &&
        !/\bwp\b/.test(text)) {
      continue;
    }
    if (looksLikeWorkPackageText(taskValueText(value))) {
      return true;
    }
  }

  return looksLikeWorkPackageText(`${task.display_name || ""} ${task.name || ""}`);
}

function looksLikeWorkPackageText(value) {
  const text = normalizeSearchText(value);
  const compact = text.replace(/[^a-z0-9]+/g, "");
  return compact.includes("workpackage") ||
    text.includes("work package") ||
    /\bwp[\s._-]*[a-z0-9]+\b/.test(text);
}

function compareWorkPackages(a, b) {
  const startA = parseOdooDateTime(a.startDate);
  const startB = parseOdooDateTime(b.startDate);
  if (startA && startB && startA.getTime() !== startB.getTime()) {
    return startA - startB;
  }
  if (startA && !startB) {
    return -1;
  }
  if (!startA && startB) {
    return 1;
  }
  return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true, sensitivity: "base" });
}

function isSubcontractorFunction(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  return normalized === "ai consultant" || normalized === "ai consultant ormit";
}

function employeeFunctionDetails(employee, model) {
  const candidates = [
    { value: String(employee.job_title || "").trim(), source: `${model}.job_title` },
    { value: relationalName(employee.job_id).trim(), source: `${model}.job_id` }
  ].filter((candidate) => candidate.value);
  const chosen = candidates.find((candidate) => isSubcontractorFunction(candidate.value)) || candidates[0];
  return {
    employeeFunction: chosen ? chosen.value : "",
    employeeFunctionSource: chosen ? chosen.source : "",
    isSubcontractor: !!chosen && isSubcontractorFunction(chosen.value)
  };
}

// Resolve only employees/resources already present in fetched records. Both
// metadata and record requests use the existing read-only RPC boundary.
async function enrichEmployeeFunctions(odooUrl, database, uid, apiKey, records, warnings) {
  if (!records.length) {
    return;
  }
  const positiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const employeeIds = new Set(records.map((record) => positiveId(record.employeeId)).filter(Boolean));
  const resourceIds = new Set(records.filter((record) => !positiveId(record.employeeId))
    .map((record) => positiveId(record.resourceId)).filter(Boolean));
  const byEmployee = new Map();
  const byResource = new Map();

  for (const model of ["hr.employee", "hr.employee.public"]) {
    const pendingEmployeeIds = new Set(Array.from(employeeIds)
      .filter((id) => !byEmployee.get(id)?.employeeFunction));
    const pendingResourceIds = new Set(Array.from(resourceIds)
      .filter((id) => !byResource.get(id)?.employeeFunction));
    // A resource may have resolved an employee whose function was inaccessible.
    for (const id of pendingResourceIds) {
      const employee = byResource.get(id);
      if (employee) {
        pendingEmployeeIds.add(employee.id);
      }
    }
    if (!pendingEmployeeIds.size && !pendingResourceIds.size) {
      break;
    }
    try {
      const fieldDefs = await getModelFields(odooUrl, database, uid, apiKey, model);
      const fields = ["id", "name", "job_title", "job_id", "resource_id"]
        .filter((field) => field === "id" || Object.hasOwn(fieldDefs, field));
      const conditions = [];
      if (pendingEmployeeIds.size) {
        conditions.push(["id", "in", Array.from(pendingEmployeeIds)]);
      }
      if (pendingResourceIds.size && fields.includes("resource_id")) {
        conditions.push(["resource_id", "in", Array.from(pendingResourceIds)]);
      }
      if (!conditions.length) {
        continue;
      }
      const domain = conditions.length === 2 ? ["|", ...conditions] : conditions;
      const employees = await searchReadAll(odooUrl, database, uid, apiKey, model, domain, fields, {
        order: "id asc",
        context: { active_test: false }
      });
      for (const employee of employees) {
        const id = positiveId(employee.id);
        const resourceId = positiveId(relationalId(employee.resource_id));
        // Do not accept unrequested identities returned by a malformed source.
        if (!id || (!pendingEmployeeIds.has(id) && !pendingResourceIds.has(resourceId))) {
          continue;
        }
        const details = { id, name: String(employee.name || ""), ...employeeFunctionDetails(employee, model) };
        if (!byEmployee.get(id)?.employeeFunction) {
          byEmployee.set(id, details);
        }
        if (resourceId && pendingResourceIds.has(resourceId) && !byResource.get(resourceId)?.employeeFunction) {
          byResource.set(resourceId, byEmployee.get(id));
        }
      }
    } catch (error) {
      warnings.push(`Employee function lookup via ${model} failed: ${error.message}`);
    }
  }

  let unknownCount = 0;
  let planningFallbackCount = 0;
  for (const record of records) {
    const employeeId = positiveId(record.employeeId);
    const mappedEmployee = byResource.get(positiveId(record.resourceId));
    // Public metadata may enrich the resolved ID without exposing resource_id.
    const employee = employeeId ? byEmployee.get(employeeId)
      : byEmployee.get(mappedEmployee?.id) || mappedEmployee;
    if (employee) {
      record.employeeId = employee.id;
      record.employee = record.employee || employee.name;
    }
    if (employee?.employeeFunction) {
      record.employeeFunction = employee.employeeFunction;
      record.employeeFunctionSource = employee.employeeFunctionSource;
      record.isSubcontractor = employee.isSubcontractor;
      record.subcontractorClassification = "employee-function";
    } else if (String(record.role || "").trim()) {
      // Planning roles are a disclosed fallback only when HR function is absent.
      record.employeeFunction = String(record.role).trim();
      record.employeeFunctionSource = "planning.role_id";
      record.isSubcontractor = isSubcontractorFunction(record.employeeFunction);
      record.subcontractorClassification = "planning-role";
      planningFallbackCount += 1;
    } else {
      record.employeeFunction = "";
      record.employeeFunctionSource = "";
      record.isSubcontractor = false;
      record.subcontractorClassification = "unknown";
      unknownCount += 1;
    }
  }
  if (planningFallbackCount) {
    warnings.push(`Employee function unavailable for ${planningFallbackCount} planning record(s); subcontractor classification uses the planning role instead.`);
  }
  if (unknownCount) {
    warnings.push(`Employee function unavailable for ${unknownCount} record(s); their hours remain included because subcontractor status cannot be verified.`);
  }
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
    employeeId: relationalId(slot.employee_id),
    resourceId: relationalId(slot.resource_id),
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

function relationalNames(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length && Array.isArray(value[0])) {
    return value.map(relationalName).filter(Boolean);
  }
  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function taskValueText(value) {
  if (Array.isArray(value)) {
    return value.length > 1 ? String(value[1] || "") : String(value[0] || "");
  }
  if (value === false || value == null) {
    return "";
  }
  return String(value);
}

function parseTaskNumber(value) {
  if (value === false || value == null || value === "" || Array.isArray(value)) {
    return null;
  }
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function normalizeTaskDate(value) {
  const text = taskValueText(value).trim();
  if (!parseOdooDateTime(text)) {
    return "";
  }
  return text.slice(0, 10);
}

function normalizePercent(value) {
  if (value == null) {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  const percent = number > 0 && number <= 1 ? number * 100 : number;
  return clamp(percent, 0, 100);
}

function calculateExpectedProgressPercent(startValue, endValue, referenceDate) {
  const start = parseOdooDateTime(startValue);
  const end = parseOdooDateTime(endValue);
  if (!start || !end) {
    return null;
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (endDay <= startDay) {
    return today >= endDay ? 100 : 0;
  }
  if (today <= startDay) {
    return 0;
  }
  if (today >= endDay) {
    return 100;
  }
  return clamp(((today - startDay) / (endDay - startDay)) * 100, 0, 100);
}

function fieldInfoText(field, definition = {}) {
  return normalizeSearchText(`${field} ${definition.string || ""}`);
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
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

function roundPercent(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Fail closed under docs/ai-context/PROJECT_RULES.md. Any write needs explicit
// user approval before reviewed implementation; there is no automatic bypass.
function assertReadOnlyOdooCall(endpoint, methodName, params) {
  let service = "";
  try {
    const url = new URL(endpoint);
    const match = url.pathname.match(/\/xmlrpc\/2\/(common|db|object)$/);
    if (["http:", "https:"].includes(url.protocol) && !url.search && !url.hash && match) {
      service = match[1];
    }
  } catch (_) {
    // Invalid endpoints are rejected with the same policy error below.
  }

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  if (Array.isArray(params)) {
    if (service === "common" && methodName === "version" && params.length === 0) {
      return;
    }
    if (service === "common" && methodName === "authenticate" && params.length === 4
      && params.slice(0, 3).every((value) => typeof value === "string") && isObject(params[3])) {
      return;
    }
    if (service === "db" && methodName === "list" && params.length === 0) {
      return;
    }
    if (service === "object" && methodName === "execute_kw" && params.length === 7
      && typeof params[3] === "string" && params[3].trim()
      && ["fields_get", "search_read", "read_group"].includes(params[4])
      && Array.isArray(params[5]) && isObject(params[6])) {
      return;
    }
  }

  throw new Error("Odoo is strictly read-only: this RPC operation is blocked. Any write requires explicit user approval before implementation or execution.");
}

async function xmlRpcCall(endpoint, methodName, params) {
  assertReadOnlyOdooCall(endpoint, methodName, params);
  const body = buildXmlRpcRequest(methodName, params);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const result = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "text/xml",
        "User-Agent": "odoo-time-dashboard/1.0"
      },
      body,
      signal: controller.signal
    });
    const xml = await result.text();
    if (!result.ok) {
      throw new Error(`Odoo returned HTTP ${result.status}`);
    }
    return parseXmlRpcResponse(xml);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Odoo did not respond within 15 seconds");
    }
    if (methodName === "authenticate" || methodName === "execute_kw") {
      if (/access.?denied|invalid credentials/i.test(error.message || "")) {
        throw new Error("Access denied by Odoo.");
      }
      throw new Error("Odoo request failed. Check the connection and account permissions.");
    }
    throw new Error(`Could not reach Odoo: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
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

async function handleSteering(request, response, route) {
  if (request.method !== "POST") { sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" }); return; }
  let body;
  try { body = await readJsonBody(request); }
  catch (error) { sendJson(response, 400, { ok: false, error: error.message }); return; }
  try {
  const settings = getAuthSettings({});
  const uid = await authenticateOdoo(settings.odooUrl, settings.database, settings.username, settings.apiKey);
  if (!uid) { sendJson(response, 401, { ok: false, error: "Odoo rejected your credentials", authenticationRequired: true }); return; }
  const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
  const rpc = {
    fields: model => getModelFields(...args, model),
    read: (model, domain, fields) => searchReadAll(...args, model, domain, fields, { context: { active_test: false }, order: "id asc" }),
    group: (model, domain, kwargs) => executeKw(...args, model, "read_group", [domain], kwargs)
  };
  const config = readDashboardConfigInfo().values.pilotage || {};
    if (route.endsWith("/metadata")) {
      sendJson(response, 200, { ok: true, ...steeringService.publicMetadata(await steeringService.metadata(config, rpc)) });
      return;
    }
    let projectId = null;
    if (route.endsWith("/project")) {
      projectId = body?.projectId;
      if (!Number.isSafeInteger(projectId) || projectId <= 0) { sendJson(response, 400, { ok: false, error: "projectId must be a positive integer" }); return; }
    }
    const result = await steeringService.load(config, rpc, uid, projectId);
    sendJson(response, result.notFound ? 404 : 200, result);
  } catch (_) {
    // Upstream fault strings can contain record details or secrets; never expose them here.
    sendJson(response, 502, { ok: false, error: "Lecture du pilotage indisponible. Vérifier le filtre DiCo, le référentiel programmes et les accès Odoo." });
  }
}

function leadUnitRelations(definitions, relation) {
  const rank = (name, field) => {
    const label = String(field.string || "").toLowerCase().replace(/[^a-z]/g, "");
    if (name === "lead_unit_id" || label === "leadunit") return 1;
    if (name === "unit_id" || label === "unit") return 2;
    if (name === "department_id") return 3;
    return 0;
  };
  return Object.entries(definitions).filter(([name, field]) =>
    field.type === "many2one" && field.relation === relation && rank(name, field)
  ).map(([name, field]) => ({ name, rank: rank(name, field) })).sort((a, b) => a.rank - b.rank);
}

async function ownLeadUnit(settings, uid) {
  const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
  const projectFields = await getModelFields(...args, "project.project");
  const field = projectFields.lead_unit_id;
  if (!field || field.type !== "many2one" || !field.relation) throw new Error("Odoo project Lead Unit (lead_unit_id) is unavailable");
  const userFields = await getModelFields(...args, "res.users");
  const userLinks = leadUnitRelations(userFields, field.relation);
  let identities = [];
  if (userLinks.length) {
    const users = await searchReadAll(...args, "res.users", [["id", "=", uid]], userLinks.map(link => link.name));
    identities = users.map(user => ({ record: user, links: userLinks }));
  }
  if (!identities.some(({ record, links }) => links.some(link => relationalId(record[link.name])))) {
    let lookupError;
    for (const model of ["hr.employee", "hr.employee.public"]) {
      try {
        const employeeFields = await getModelFields(...args, model);
        const links = leadUnitRelations(employeeFields, field.relation);
        if (employeeFields.user_id?.relation !== "res.users" || !links.length) continue;
        const employees = await searchReadAll(...args, model, [["user_id", "=", uid]], links.map(link => link.name));
        if (employees.length) { identities = employees.map(record => ({ record, links })); break; }
      } catch (error) { lookupError = error; }
    }
    if (!identities.length && lookupError) throw new Error("Your employee Lead Unit cannot be read with your Odoo permissions");
  }
  const relatedFields = await getModelFields(...args, field.relation);
  const directLinks = leadUnitRelations(relatedFields, field.relation).filter(link => link.rank < 3);
  const unitFields = ["id", "name", ...directLinks.map(link => link.name),
    ...(relatedFields.parent_id?.relation === field.relation ? ["parent_id"] : []),
    ...(relatedFields.is_unit?.type === "boolean" ? ["is_unit"] : [])];
  const units = [];
  for (const { record, links } of identities) {
    const link = links.find(entry => relationalId(record[entry.name]));
    if (!link) continue;
    let id = Number(relationalId(record[link.name]));
    const seen = new Set();
    while (id && !seen.has(id) && seen.size < 32) {
      seen.add(id);
      const nodes = await searchReadAll(...args, field.relation, [["id", "=", id]], unitFields);
      const node = nodes[0];
      if (!node) break;
      if (link.rank < 3 || node.is_unit === true || /\bunit\s*$/i.test(String(node.name))) {
        units.push({ id: Number(node.id), name: node.name }); break;
      }
      const direct = directLinks.find(entry => relationalId(node[entry.name]) && Number(relationalId(node[entry.name])) !== id);
      if (direct) {
        const target = await searchReadAll(...args, field.relation, [["id", "=", Number(relationalId(node[direct.name]))]], ["id", "name"]);
        if (target[0]) units.push({ id: Number(target[0].id), name: target[0].name });
        break;
      }
      id = Number(relationalId(node.parent_id));
    }
  }
  const unique = [...new Map(units.map(unit => [unit.id, unit])).values()];
  if (unique.length !== 1) throw new Error(unique.length ? "Your Odoo account has multiple Lead Units; contact your administrator" : "No Lead Unit is linked to your Odoo account");
  return { field: { name: "lead_unit_id", relation: field.relation }, team: unique[0] };
}

async function handleTeamPortfolio(request, response, route) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }
  let body;
  try { body = await readJsonBody(request); }
  catch (error) { sendJson(response, 400, { ok: false, error: error.message }); return; }
  const settings = getAuthSettings({});
  const uid = await authenticateOdoo(settings.odooUrl, settings.database, settings.username, settings.apiKey);
  if (!uid) { sendJson(response, 401, { ok: false, error: "Odoo rejected your credentials" }); return; }
  let resolved;
  try { resolved = await ownLeadUnit(settings, uid); }
  catch (error) { sendJson(response, 422, { ok: false, error: error.message }); return; }
  const { field, team } = resolved;
  const teamId = team.id;
  if (route === "/api/odoo/my-lead-unit") {
    sendJson(response, 200, { ok: true, leadUnit: team }); return;
  }
  const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
  const domain = [[field.name, "in", [teamId]]];
  const projects = await searchReadAll(...args, "project.project", domain, ["id", "name", field.name], {
    order: "name asc", context: { active_test: false }
  });
  const counts = new Map();
  projects.forEach(project => counts.set(String(project.name), (counts.get(String(project.name)) || 0) + 1));
  projects.forEach(project => { if (counts.get(String(project.name)) > 1) project.name = `${project.name} (ID ${project.id})`; });
  const projectIds = projects.map(project => Number(project.id));
  const names = new Map(projects.map(project => [Number(project.id), String(project.name)]));
  let lines = [], slots = [], planningError = null;
  const warnings = [];
  if (projectIds.length) {
    const actualRows = await searchReadAll(...args, "account.analytic.line", [["project_id", "in", projectIds]],
      ["id", "date", "unit_amount", "name", "employee_id", "project_id", "task_id"], { order: "date asc, id asc" });
    lines = actualRows.map(normalizeTimesheetLine).filter(line => line.date && names.has(Number(line.projectId)));
    lines.forEach(line => { line.project = names.get(Number(line.projectId)); });
    await enrichEmployeeFunctions(...args, lines, warnings);
    try {
      const definitions = await getModelFields(...args, "planning.slot");
      const available = new Set(Object.keys(definitions));
      const slotFields = ["id", "name", "start_datetime", "end_datetime", "allocated_hours", "allocated_percentage",
        "employee_id", "resource_id", "project_id", "task_id", "sale_line_id", "role_id"].filter(name => available.has(name));
      let planningDomain;
      if (definitions.project_id?.relation === "project.project") {
        planningDomain = [["project_id", "in", projectIds]];
      } else if (definitions.task_id?.relation) {
        const taskDefinitions = await getModelFields(...args, definitions.task_id.relation);
        if (taskDefinitions.project_id?.relation === "project.project") planningDomain = [["task_id.project_id", "in", projectIds]];
      }
      if (!planningDomain) throw new Error("Planning has no supported project relation; no unfiltered query was made");
      const rawSlots = await searchReadAll(...args, "planning.slot", planningDomain, slotFields, { order: "id asc" });
      if (!available.has("project_id")) {
        const taskIds = [...new Set(rawSlots.map(slot => relationalId(slot.task_id)).filter(Boolean))];
        const tasks = taskIds.length ? await searchReadAll(...args, definitions.task_id.relation, [["id", "in", taskIds]], ["id", "project_id"]) : [];
        const taskProjects = new Map(tasks.map(task => [Number(task.id), task.project_id]));
        rawSlots.forEach(slot => { slot.project_id = taskProjects.get(Number(relationalId(slot.task_id))) || false; });
      }
      slots = rawSlots.map(normalizePlanningSlot).filter(slot => names.has(Number(slot.projectId)));
      slots.forEach(slot => { slot.project = names.get(Number(slot.projectId)); });
      await enrichEmployeeFunctions(...args, slots, warnings);
    } catch (error) { planningError = error.message; }
  }
  sendJson(response, 200, {
    ok: true, team: { id: teamId, name: team.name }, ownerField: field.name, domain,
    projects: projects.map(project => ({ id: project.id, name: project.name,
      timesheets: { projectName: project.name, projectCode: String(project.id),
        lines: lines.filter(line => Number(line.projectId) === Number(project.id)),
        employeeMonthly: buildMonthlyTimesheetEmployeeSummary(lines.filter(line => Number(line.projectId) === Number(project.id) && !line.isSubcontractor)),
        monthly: buildMonthlyTimesheetEmployeeSummary(lines.filter(line => Number(line.projectId) === Number(project.id))) },
      planning: planningError ? null : { projectName: project.name, projectCode: String(project.id),
        slots: slots.filter(slot => Number(slot.projectId) === Number(project.id)),
        employeeMonthly: buildMonthlyPlanningEmployeeSummary(slots.filter(slot => Number(slot.projectId) === Number(project.id) && !slot.isSubcontractor)),
        monthly: buildMonthlyPlanningEmployeeSummary(slots.filter(slot => Number(slot.projectId) === Number(project.id))) }
    })),
    timesheets: { ok: true, lineCount: lines.length, totalHours: roundHours(lines.reduce((sum, line) => sum + line.hours, 0)),
      employeeMonthly: buildMonthlyTimesheetSummary(lines.filter(line => !line.isSubcontractor)),
      monthly: buildMonthlyTimesheetSummary(lines), lines },
    planning: planningError ? null : { ok: true, slotCount: slots.length, totalHours: roundHours(slots.reduce((sum, slot) => sum + slot.hours, 0)),
      employeeMonthly: buildMonthlyPlanningSummary(slots.filter(slot => !slot.isSubcontractor)),
      monthly: buildMonthlyPlanningSummary(slots), slots },
    planningError
  });
}

function personalRelationId(value) {
  const id = relationalId(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isPersonalEmployeeRelation(field) {
  return field?.type === "many2one" && ["hr.employee", "hr.employee.public"].includes(field.relation);
}

function isPersonalRelation(field, relation) {
  return field?.type === "many2one" && field.relation === relation;
}

async function resolvePersonalEmployee(args, uid, username) {
  const ids = new Set();
  const resourceIds = new Set();
  const employeesWithResource = new Set();
  let name = "";
  for (const model of ["hr.employee", "hr.employee.public"]) {
    try {
      const definitions = await getModelFields(...args, model);
      if (!isPersonalRelation(definitions.user_id, "res.users")) continue;
      const hasResource = isPersonalRelation(definitions.resource_id, "resource.resource");
      const fields = ["id", "user_id", ...(definitions.name ? ["name"] : []), ...(hasResource ? ["resource_id"] : [])];
      const employees = await searchReadAll(...args, model, [["user_id", "=", uid]], fields, { context: { active_test: false } });
      for (const employee of employees) {
        if (!Number.isSafeInteger(employee.id) || employee.id <= 0 || personalRelationId(employee.user_id) !== uid) continue;
        ids.add(employee.id);
        if (!name && typeof employee.name === "string") name = employee.name;
        const resourceId = hasResource ? personalRelationId(employee.resource_id) : null;
        if (resourceId) {
          resourceIds.add(resourceId);
          employeesWithResource.add(employee.id);
        }
      }
    } catch (_) {
      // Some accounts can read only the public employee model. Never fall back
      // to a name or an unfiltered employee search.
    }
  }
  if (!ids.size) throw new Error("Your Odoo account could not be linked to an accessible employee.");
  if (employeesWithResource.size < ids.size) {
    try {
      const definitions = await getModelFields(...args, "resource.resource");
      if (isPersonalRelation(definitions.user_id, "res.users")) {
        const resources = await searchReadAll(...args, "resource.resource", [["user_id", "=", uid]], ["id", "user_id"], { context: { active_test: false } });
        for (const resource of resources) {
          if (Number.isSafeInteger(resource.id) && resource.id > 0 && personalRelationId(resource.user_id) === uid) resourceIds.add(resource.id);
        }
      }
    } catch (_) {
      // Employee-linked planning can still be available without resource access.
    }
  }
  return { ids: [...ids].sort((a, b) => a - b), resourceIds: [...resourceIds].sort((a, b) => a - b), name: name || username };
}

function parsePersonalUtcDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?Z?$/);
  if (!match) return null;
  const parts = match.slice(1, 7).map(part => Number(part || 0));
  const [year, month, day, hour, minute, second] = parts;
  const milliseconds = Number((match[7] || "").padEnd(3, "0"));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, milliseconds));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && date.getUTCHours() === hour && date.getUTCMinutes() === minute && date.getUTCSeconds() === second ? date : null;
}

function normalizePersonalPlanningSlot(slot) {
  const start = parsePersonalUtcDateTime(slot.start_datetime);
  const end = parsePersonalUtcDateTime(slot.end_datetime);
  if (!start || !end || end <= start) throw new Error("Planning interval is unavailable");
  const allocated = slot.allocated_hours;
  const percentage = slot.allocated_percentage;
  const hasHours = allocated !== false && allocated != null && allocated !== "" && Number.isFinite(Number(allocated));
  const hasPercentage = percentage !== false && percentage != null && percentage !== "" && Number.isFinite(Number(percentage));
  if (!hasHours && !hasPercentage) throw new Error("Planning hours are unavailable");
  const hours = hasHours ? Number(allocated) : (end - start) / 36e5 * Number(percentage) / 100;
  const projectId = personalRelationId(slot.project_id);
  return {
    id: slot.id, start: start.toISOString(), end: end.toISOString(),
    startMonth: start.toISOString().slice(0, 7), endMonth: end.toISOString().slice(0, 7),
    hours: roundHours(hours), allocatedPercentage: hasPercentage ? Number(percentage) : null,
    employee: relationalName(slot.employee_id) || relationalName(slot.resource_id),
    employeeId: personalRelationId(slot.employee_id), resourceId: personalRelationId(slot.resource_id),
    projectId, project: projectId ? relationalName(slot.project_id) || `Project ${projectId}` : "",
    task: relationalName(slot.task_id), taskId: personalRelationId(slot.task_id),
    description: String(slot.name || "")
  };
}

function buildPersonalPlanningMonthly(slots) {
  const months = new Map();
  for (const slot of slots) {
    const start = new Date(slot.start), end = new Date(slot.end);
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor < end) {
      const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      const overlap = Math.min(end.getTime(), next.getTime()) - Math.max(start.getTime(), cursor.getTime());
      if (overlap > 0) {
        const key = cursor.toISOString().slice(0, 7);
        if (!months.has(key)) months.set(key, { month: key, totalHours: 0, slotCount: 0, projects: new Map() });
        const month = months.get(key);
        const hours = slot.hours * overlap / (end - start);
        month.totalHours += hours;
        month.slotCount += 1;
        const name = slot.project || "(No project)";
        month.projects.set(name, (month.projects.get(name) || 0) + hours);
      }
      cursor = next;
    }
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map(month => ({
    month: month.month, totalHours: roundHours(month.totalHours), slotCount: month.slotCount,
    projects: [...month.projects].sort((a, b) => b[1] - a[1]).map(([name, hours]) => ({ name, hours: roundHours(hours) }))
  }));
}

async function readPersonalPlanning(args, employee) {
  const definitions = await getModelFields(...args, "planning.slot");
  const hasEmployee = isPersonalEmployeeRelation(definitions.employee_id);
  const hasResource = isPersonalRelation(definitions.resource_id, "resource.resource") && employee.resourceIds.length > 0;
  const conditions = [];
  if (hasEmployee) conditions.push(["employee_id", "in", employee.ids]);
  if (hasResource) conditions.push(["resource_id", "in", employee.resourceIds]);
  if (!conditions.length || !definitions.start_datetime || !definitions.end_datetime
    || !definitions.allocated_hours && !definitions.allocated_percentage) throw new Error("Personal planning fields are unavailable");
  const domain = conditions.length === 2 ? ["|", ...conditions] : conditions;
  const hasProject = isPersonalRelation(definitions.project_id, "project.project");
  let taskModel = null;
  if (!hasProject && definitions.task_id?.type === "many2one" && definitions.task_id.relation) {
    const taskDefinitions = await getModelFields(...args, definitions.task_id.relation);
    if (isPersonalRelation(taskDefinitions.project_id, "project.project")) taskModel = definitions.task_id.relation;
  }
  if (!hasProject && !taskModel) throw new Error("Personal planning has no supported project relation");
  const fields = ["id", ...["name", "start_datetime", "end_datetime", "allocated_hours", "allocated_percentage", "task_id"]
    .filter(field => definitions[field]), ...(hasEmployee ? ["employee_id"] : []), ...(hasResource ? ["resource_id"] : []), ...(hasProject ? ["project_id"] : [])];
  const ownIds = new Set(employee.ids), ownResources = new Set(employee.resourceIds);
  const rows = (await searchReadAll(...args, "planning.slot", domain, fields, { context: { active_test: false } }))
    .filter(slot => {
      const employeeId = hasEmployee ? personalRelationId(slot.employee_id) : null;
      return employeeId ? ownIds.has(employeeId) : hasResource && ownResources.has(personalRelationId(slot.resource_id));
    });
  const taskProjects = new Map();
  if (taskModel) {
    const taskIds = [...new Set(rows.map(slot => personalRelationId(slot.task_id)).filter(Boolean))];
    if (taskIds.length) {
      const tasks = await searchReadAll(...args, taskModel, [["id", "in", taskIds]], ["id", "project_id"], { context: { active_test: false } });
      for (const task of tasks) {
        if (taskIds.includes(task.id)) taskProjects.set(task.id, task.project_id);
      }
    }
  }
  const slots = rows.map(slot => normalizePersonalPlanningSlot({ ...slot,
    employee_id: hasEmployee ? slot.employee_id : false, resource_id: hasResource ? slot.resource_id : false,
    project_id: hasProject ? slot.project_id : taskProjects.get(personalRelationId(slot.task_id)) || false
  }));
  const monthly = buildPersonalPlanningMonthly(slots);
  return { ok: true, employeeName: employee.name, slotCount: slots.length,
    totalHours: roundHours(slots.reduce((sum, slot) => sum + slot.hours, 0)), slots, monthly, employeeMonthly: monthly, domain };
}

function safeManagerPhotoDataUrl(value) {
  const maxBytes = 128 * 1024;
  const maxEncodedLength = Math.ceil(maxBytes / 3) * 4;
  if (typeof value !== "string" || !value.length || value.length > maxEncodedLength + 1024) return null;
  const encoded = value.replace(/[\t\r\n ]/g, "");
  if (!encoded.length || encoded.length > maxEncodedLength || encoded.length % 4
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > maxBytes || bytes.toString("base64") !== encoded) return null;
  const validSize = (width, height) => width > 0 && height > 0 && width <= 512 && height <= 512;
  let mime = null;
  if (bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR"
      || !validSize(bytes.readUInt32BE(16), bytes.readUInt32BE(20))) return null;
    let offset = 8, hasPixels = false, complete = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset), end = offset + length + 12;
      if (end > bytes.length) return null;
      const chunk = bytes.toString("ascii", offset + 4, offset + 8);
      if (chunk === "IDAT" && length > 0) hasPixels = true;
      if (chunk === "IEND") { complete = length === 0 && end === bytes.length; break; }
      offset = end;
    }
    if (hasPixels && complete) mime = "image/png";
  } else if (bytes.length >= 14 && bytes[0] === 0xff && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2, sized = false;
    while (offset < bytes.length - 2) {
      if (bytes[offset++] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda) { if (sized) mime = "image/jpeg"; break; }
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      if (offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if (frameMarkers.has(marker)) {
        if (length < 8 || !validSize(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3))) return null;
        sized = true;
      }
      offset += length;
    }
  } else if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.readUInt32LE(4) === bytes.length - 8 && bytes.toString("ascii", 8, 12) === "WEBP") {
    let offset = 12, hasPixels = false;
    while (offset + 8 <= bytes.length) {
      const chunk = bytes.toString("ascii", offset, offset + 4), length = bytes.readUInt32LE(offset + 4);
      const data = offset + 8, end = data + length;
      if (end > bytes.length || chunk === "ANIM" || chunk === "ANMF") return null;
      if (chunk === "VP8X") {
        if (length < 10 || bytes[data] & 0x02
          || !validSize(bytes.readUIntLE(data + 4, 3) + 1, bytes.readUIntLE(data + 7, 3) + 1)) return null;
      } else if (chunk === "VP8 ") {
        if (length < 10 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a
          || !validSize(bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff)) return null;
        hasPixels = true;
      } else if (chunk === "VP8L") {
        if (length < 5 || bytes[data] !== 0x2f) return null;
        const dimensions = bytes.readUInt32LE(data + 1);
        if (!validSize((dimensions & 0x3fff) + 1, (dimensions >>> 14 & 0x3fff) + 1)) return null;
        hasPixels = true;
      }
      offset = end + length % 2;
    }
    if (hasPixels && offset === bytes.length) mime = "image/webp";
  }
  return mime ? `data:${mime};base64,${encoded}` : null;
}

async function enrichPersonalProjectManagers(args, projects) {
  for (const project of projects.values()) project.manager = null;
  const projectIds = [...projects.keys()];
  if (!projectIds.length) return;
  const managers = new Map();
  try {
    const definitions = await getModelFields(...args, "project.project");
    if (!isPersonalRelation(definitions.user_id, "res.users")) return;
    const rows = await searchReadAll(...args, "project.project", [["id", "in", projectIds]], ["id", "user_id"], { context: { active_test: false } });
    for (const row of rows) {
      if (!projects.has(row.id)) continue;
      const managerId = personalRelationId(row.user_id);
      if (!managerId) continue;
      if (!managers.has(managerId)) managers.set(managerId, { id: managerId, name: relationalName(row.user_id), photoDataUrl: null });
      projects.get(row.id).manager = managers.get(managerId);
    }
  } catch (_) { return; }
  if (!managers.size) return;
  try {
    const definitions = await getModelFields(...args, "res.users");
    const hasName = definitions.name?.type === "char";
    const hasPhoto = definitions.image_128?.type === "binary";
    if (!hasName && !hasPhoto) return;
    const rows = await searchReadAll(...args, "res.users", [["id", "in", [...managers.keys()]]],
      ["id", ...(hasName ? ["name"] : []), ...(hasPhoto ? ["image_128"] : [])], { context: { active_test: false } });
    for (const row of rows) {
      if (!managers.has(row.id)) continue;
      const manager = managers.get(row.id);
      if (hasName && typeof row.name === "string" && row.name.trim()) manager.name = row.name;
      if (hasPhoto) manager.photoDataUrl = safeManagerPhotoDataUrl(row.image_128);
    }
  } catch (_) {
    // Photos and optional manager metadata must never make personal time fail.
  }
}

async function handleMyTime(request, response) {
  if (!authContext.getStore()) {
    sendJson(response, 401, { ok: false, error: "Please sign in to continue", authenticationRequired: true });
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }
  try { await readJsonBody(request); }
  catch (_) { sendJson(response, 400, { ok: false, error: "Request body must be valid JSON" }); return; }
  let settings, uid;
  try {
    settings = getAuthSettings({});
    uid = await authenticateOdoo(settings.odooUrl, settings.database, settings.username, settings.apiKey);
  } catch (error) {
    const rejected = /access.?denied|invalid credentials/i.test(error.message || "");
    sendJson(response, rejected ? 401 : 502, rejected
      ? { ok: false, error: "Odoo rejected your credentials", authenticationRequired: true }
      : { ok: false, error: "Personal time is unavailable. Please try again later." });
    return;
  }
  if (!Number.isSafeInteger(uid) || uid <= 0 || uid !== authContext.getStore().uid) {
    sendJson(response, 401, { ok: false, error: "Odoo rejected your credentials", authenticationRequired: true });
    return;
  }
  const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
  let employee;
  try { employee = await resolvePersonalEmployee(args, uid, settings.username); }
  catch (_) { sendJson(response, 422, { ok: false, error: "Your Odoo account could not be linked to an accessible employee." }); return; }
  let timesheets;
  try {
    const definitions = await getModelFields(...args, "account.analytic.line");
    if (!isPersonalEmployeeRelation(definitions.employee_id) || !isPersonalRelation(definitions.project_id, "project.project")
      || !definitions.date || !definitions.unit_amount) throw new Error("Personal timesheet fields are unavailable");
    const fields = ["id", "date", "unit_amount", "employee_id", "project_id", ...["name", "task_id"].filter(field => definitions[field])];
    const domain = [["employee_id", "in", employee.ids]];
    const ownIds = new Set(employee.ids);
    const rows = await searchReadAll(...args, "account.analytic.line", domain, fields, { order: "date asc, id asc", context: { active_test: false } });
    const lines = rows.filter(line => ownIds.has(personalRelationId(line.employee_id))).map(line => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(line.date)) || !parsePersonalUtcDateTime(line.date)
        || !Number.isFinite(Number(line.unit_amount))) throw new Error("Personal timesheet values are unavailable");
      const normalized = normalizeTimesheetLine(line);
      normalized.projectId = personalRelationId(line.project_id);
      normalized.project = normalized.projectId ? relationalName(line.project_id) || `Project ${normalized.projectId}` : "";
      return normalized;
    });
    const monthly = buildMonthlyTimesheetSummary(lines);
    timesheets = { ok: true, employeeName: employee.name, lineCount: lines.length,
      totalHours: roundHours(lines.reduce((sum, line) => sum + line.hours, 0)), lines, monthly, employeeMonthly: monthly, domain };
  } catch (_) {
    sendJson(response, 502, { ok: false, error: "Personal timesheets are unavailable with your current Odoo access or schema." });
    return;
  }
  let planning = null, planningError = null;
  try { planning = await readPersonalPlanning(args, employee); }
  catch (_) { planningError = "Personal planning is unavailable with your current Odoo access or schema."; }
  const projects = new Map();
  for (const record of [...timesheets.lines, ...(planning?.slots || [])]) {
    if (record.projectId && !projects.has(record.projectId)) projects.set(record.projectId, { id: record.projectId, name: record.project });
  }
  const nameCounts = new Map();
  for (const project of projects.values()) nameCounts.set(project.name, (nameCounts.get(project.name) || 0) + 1);
  for (const project of projects.values()) {
    if (nameCounts.get(project.name) > 1) project.name = `${project.name} (ID ${project.id})`;
  }
  for (const record of [...timesheets.lines, ...(planning?.slots || [])]) {
    if (projects.has(record.projectId)) record.project = projects.get(record.projectId).name;
  }
  timesheets.monthly = buildMonthlyTimesheetSummary(timesheets.lines);
  timesheets.employeeMonthly = timesheets.monthly;
  if (planning) {
    planning.monthly = buildPersonalPlanningMonthly(planning.slots);
    planning.employeeMonthly = planning.monthly;
  }
  await enrichPersonalProjectManagers(args, projects);
  sendJson(response, 200, { ok: true, uid, employee, projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
    timesheets, planning, planningError });
}

async function readScopedProjectHoursPlanning(args, project) {
  const definitions = await getModelFields(...args, "planning.slot");
  const hasEmployee = isPersonalEmployeeRelation(definitions.employee_id);
  const hasResource = isPersonalRelation(definitions.resource_id, "resource.resource");
  if ((!hasEmployee && !hasResource) || !definitions.start_datetime || !definitions.end_datetime
    || !definitions.allocated_hours && !definitions.allocated_percentage) throw new Error("Project planning fields are unavailable");
  const hasProject = isPersonalRelation(definitions.project_id, "project.project");
  let taskModel = null;
  if (!hasProject && definitions.task_id?.type === "many2one" && definitions.task_id.relation) {
    const taskDefinitions = await getModelFields(...args, definitions.task_id.relation);
    if (isPersonalRelation(taskDefinitions.project_id, "project.project")) taskModel = definitions.task_id.relation;
  }
  if (!hasProject && !taskModel) throw new Error("Project planning has no supported project relation");
  const domain = [[hasProject ? "project_id" : "task_id.project_id", "=", project.id]];
  const hasRole = definitions.role_id?.type === "many2one";
  const fields = ["id", ...["name", "start_datetime", "end_datetime", "allocated_hours", "allocated_percentage", "task_id"]
    .filter(field => definitions[field]), ...(hasEmployee ? ["employee_id"] : []), ...(hasResource ? ["resource_id"] : []),
    ...(hasProject ? ["project_id"] : []), ...(hasRole ? ["role_id"] : [])];
  const rawSlots = await searchReadAll(...args, "planning.slot", domain, fields, { context: { active_test: false } });
  const taskProjects = new Map();
  if (taskModel) {
    const taskIds = new Set(rawSlots.map(slot => personalRelationId(slot.task_id)).filter(Boolean));
    if (taskIds.size) {
      const tasks = await searchReadAll(...args, taskModel, [["id", "in", [...taskIds]]], ["id", "project_id"], { context: { active_test: false } });
      for (const task of tasks) {
        if (taskIds.has(task.id) && personalRelationId(task.project_id) === project.id) taskProjects.set(task.id, task.project_id);
      }
    }
  }
  const slots = rawSlots.map(slot => ({ ...slot,
    employee_id: hasEmployee ? slot.employee_id : false, resource_id: hasResource ? slot.resource_id : false,
    project_id: hasProject ? slot.project_id : taskProjects.get(personalRelationId(slot.task_id)) || false
  })).filter(slot => personalRelationId(slot.project_id) === project.id).map(slot => ({
    ...normalizePersonalPlanningSlot(slot), project: project.name,
    role: hasRole ? relationalName(slot.role_id) : ""
  }));
  return { slots, domain };
}

async function readScopedProjectAssignments(args, projectId) {
  // Staffing conventions are an established project/employee assignment source.
  // Do not infer assignment semantics from arbitrary project membership fields.
  const definitions = await getModelFields(...args, "bw.staffing.convention");
  if (!isPersonalRelation(definitions.project_id, "project.project")
    || !isPersonalEmployeeRelation(definitions.employee_id)) throw new Error("Project assignments are unavailable");
  const rows = await searchReadAll(...args, "bw.staffing.convention", [["project_id", "=", projectId]],
    ["id", "project_id", "employee_id"], { context: { active_test: false } });
  const assignments = new Map();
  for (const row of rows) {
    const employeeId = personalRelationId(row.employee_id);
    if (personalRelationId(row.project_id) !== projectId || !employeeId) continue;
    if (!assignments.has(employeeId)) assignments.set(employeeId, {
      employeeId, employee: relationalName(row.employee_id), hours: 0
    });
  }
  return [...assignments.values()];
}

async function buildProjectContributors(args, records) {
  const contributors = new Map();
  const positiveId = value => Number.isSafeInteger(value) && value > 0 ? value : null;
  for (const record of records) {
    const employeeId = positiveId(record.employeeId), resourceId = positiveId(record.resourceId);
    const key = employeeId ? `employee:${employeeId}` : resourceId ? `resource:${resourceId}` : "unknown";
    if (!contributors.has(key)) contributors.set(key, {
      employeeId, resourceIds: [], name: typeof record.employee === "string" ? record.employee : "",
      photoDataUrl: null, isSubcontractor: false
    });
    const contributor = contributors.get(key);
    if (resourceId && !contributor.resourceIds.includes(resourceId)) contributor.resourceIds.push(resourceId);
    if (!contributor.name && typeof record.employee === "string") contributor.name = record.employee;
    // Record-level classification remains authoritative for hour filtering.
    contributor.isSubcontractor ||= record.isSubcontractor === true;
  }
  const byEmployee = new Map([...contributors.values()].filter(item => item.employeeId)
    .map(item => [item.employeeId, item]));
  const employeeIds = [...byEmployee.keys()];
  const usersByEmployee = new Map();
  const resolvedNames = new Set();
  if (employeeIds.length) {
    for (const model of ["hr.employee", "hr.employee.public"]) {
      try {
        const definitions = await getModelFields(...args, model);
        const hasName = definitions.name?.type === "char";
        const hasPhoto = definitions.image_128?.type === "binary";
        const hasUser = isPersonalRelation(definitions.user_id, "res.users");
        const hasResource = isPersonalRelation(definitions.resource_id, "resource.resource");
        if (!hasName && !hasPhoto && !hasUser && !hasResource) continue;
        const fields = ["id", ...(hasName ? ["name"] : []), ...(hasPhoto ? ["image_128"] : []),
          ...(hasUser ? ["user_id"] : []), ...(hasResource ? ["resource_id"] : [])];
        const rows = await searchReadAll(...args, model, [["id", "in", employeeIds]], fields,
          { context: { active_test: false } });
        for (const row of rows) {
          const contributor = byEmployee.get(row.id);
          if (!contributor) continue;
          if (hasName && !resolvedNames.has(row.id) && typeof row.name === "string" && row.name.trim()) {
            contributor.name = row.name;
            resolvedNames.add(row.id);
          }
          if (hasPhoto && !contributor.photoDataUrl) contributor.photoDataUrl = safeManagerPhotoDataUrl(row.image_128);
          const resourceId = hasResource ? personalRelationId(row.resource_id) : null;
          if (resourceId && !contributor.resourceIds.includes(resourceId)) contributor.resourceIds.push(resourceId);
          const userId = hasUser ? personalRelationId(row.user_id) : null;
          if (userId && !usersByEmployee.has(row.id)) usersByEmployee.set(row.id, userId);
        }
      } catch (_) {
        // Optional accessible names/photos cannot turn known hours into a failure.
      }
    }
    const userIds = new Set([...usersByEmployee].filter(([id]) => !byEmployee.get(id).photoDataUrl)
      .map(([, userId]) => userId));
    if (userIds.size) {
      try {
        const definitions = await getModelFields(...args, "res.users");
        if (definitions.image_128?.type === "binary") {
          const rows = await searchReadAll(...args, "res.users", [["id", "in", [...userIds]]], ["id", "image_128"],
            { context: { active_test: false } });
          const photos = new Map();
          for (const row of rows) {
            if (userIds.has(row.id)) photos.set(row.id, safeManagerPhotoDataUrl(row.image_128));
          }
          for (const [employeeId, userId] of usersByEmployee) {
            const contributor = byEmployee.get(employeeId);
            if (!contributor.photoDataUrl) contributor.photoDataUrl = photos.get(userId) || null;
          }
        }
      } catch (_) {
        // Missing user-photo permission retains the employee's name and initials.
      }
    }
  }
  return [...contributors.values()].map(contributor => ({ ...contributor,
    name: contributor.name || (contributor.employeeId ? `Employee ${contributor.employeeId}` : "Unknown employee"),
    resourceIds: contributor.resourceIds.sort((a, b) => a - b)
  }));
}

async function readProjectLifetimeMetadata(args, projectId, warnings) {
  const lifetime = { conventionHours: null, conventionField: null, conventionStatus: "unavailable", startDate: null, endDate: null };
  let definitions;
  try {
    definitions = await getModelFields(...args, "project.project");
    if (!definitions || typeof definitions !== "object" || Array.isArray(definitions)) throw new Error("Optional project metadata is unavailable");
  }
  catch (_) {
    warnings.push("Project lifetime metadata is unavailable with your current Odoo access.");
    return lifetime;
  }
  // Confirmed project-form hours source; translated/view labels and monetary
  // or staffing/planning alternatives cannot select another field.
  const conventionField = "budget_staffing_convention_hours";
  if (["float", "integer"].includes(definitions[conventionField]?.type)) lifetime.conventionField = conventionField;
  const dateFields = ["date_start", "date"].filter(field => ["date", "datetime"].includes(definitions[field]?.type));
  const domain = [["id", "=", projectId]];
  const readProject = async fields => {
    const rows = await searchReadAll(...args, "project.project", domain, ["id", ...fields], { context: { active_test: false } });
    const row = rows.find(item => item.id === projectId);
    if (!row) throw new Error("Optional project fields are unavailable");
    return row;
  };
  // Isolate the budget read so a field-specific denial cannot hide valid dates
  // or make the required project/hour reads fail.
  if (lifetime.conventionField) {
    try {
      const row = await readProject([lifetime.conventionField]);
      const value = row[lifetime.conventionField];
      if (!Object.hasOwn(row, lifetime.conventionField)) {
        lifetime.conventionStatus = "unavailable";
      } else if (value === false || value === null || typeof value === "string" && !value.trim()) {
        lifetime.conventionStatus = "empty";
      } else if ((typeof value === "number" || typeof value === "string") && Number.isFinite(Number(value))) {
        lifetime.conventionHours = Number(value);
        lifetime.conventionStatus = lifetime.conventionHours > 0 ? "available" : "empty";
      }
    } catch (_) { warnings.push("Project convention budget is unavailable with your current Odoo access."); }
  }
  if (dateFields.length) {
    try {
      const row = await readProject(dateFields);
      for (const field of dateFields) {
        const value = row[field];
        if (typeof value !== "string" || definitions[field].type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) continue;
        const parsed = parsePersonalUtcDateTime(value);
        if (parsed) lifetime[field === "date_start" ? "startDate" : "endDate"] = parsed.toISOString().slice(0, 10);
      }
    } catch (_) { warnings.push("Project dates are unavailable with your current Odoo access."); }
  }
  return lifetime;
}

async function handleProjectFinance(request, response) {
  const session = authContext.getStore();
  if (!session) { sendJson(response, 401, { ok: false, error: "Please sign in to continue", authenticationRequired: true }); return; }
  if (request.method !== "POST") { sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" }); return; }
  let body;
  try { body = await readJsonBody(request); }
  catch (_) { sendJson(response, 400, { ok: false, error: "Request body must be valid JSON" }); return; }
  if (!Number.isSafeInteger(body?.projectId) || body.projectId <= 0) {
    sendJson(response, 400, { ok: false, error: "A positive integer projectId is required" }); return;
  }
  try {
    const settings = getAuthSettings({});
    const uid = await authenticateOdoo(settings.odooUrl, settings.database, settings.username, settings.apiKey);
    if (!Number.isSafeInteger(uid) || uid <= 0 || uid !== session.uid) {
      sendJson(response, 401, { ok: false, error: "Odoo rejected your credentials", authenticationRequired: true }); return;
    }
    const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
    const rpc = {
      fields: model => executeKw(...args, model, "fields_get", [], { attributes: ["string", "type", "relation", "selection", "currency_field", "related"] }),
      read: (model, domain, fields) => searchReadAll(...args, model, domain, fields, { context: { active_test: false, lang: "en_US" }, order: "id asc" })
    };
    const result = await projectFinanceService.load(body.projectId, rpc);
    sendJson(response, result.notFound ? 404 : 200, result);
  } catch (_) {
    // Do not reflect credential-bearing RPC faults or financial source records.
    sendJson(response, 502, { ok: false, error: "Les budgets du projet sont indisponibles. Réessayez ou vérifiez vos accès Odoo." });
  }
}

async function handleProjectHours(request, response) {
  const session = authContext.getStore();
  if (!session) {
    sendJson(response, 401, { ok: false, error: "Please sign in to continue", authenticationRequired: true });
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
    return;
  }
  let body;
  try { body = await readJsonBody(request); }
  catch (_) { sendJson(response, 400, { ok: false, error: "Request body must be valid JSON" }); return; }
  if (!Number.isSafeInteger(body?.projectId) || body.projectId <= 0) {
    sendJson(response, 400, { ok: false, error: "A positive integer projectId is required" });
    return;
  }
  const projectId = body.projectId;
  let settings, uid;
  try {
    settings = getAuthSettings({});
    uid = await authenticateOdoo(settings.odooUrl, settings.database, settings.username, settings.apiKey);
  } catch (error) {
    const rejected = /access.?denied|invalid credentials/i.test(error.message || "");
    sendJson(response, rejected ? 401 : 502, rejected
      ? { ok: false, error: "Odoo rejected your credentials", authenticationRequired: true }
      : { ok: false, error: "Project hours are unavailable. Please try again later." });
    return;
  }
  if (!Number.isSafeInteger(uid) || uid <= 0 || uid !== session.uid) {
    sendJson(response, 401, { ok: false, error: "Odoo rejected your credentials", authenticationRequired: true });
    return;
  }
  const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
  let project;
  try {
    const projects = await searchReadAll(...args, "project.project", [["id", "=", projectId]], ["id", "name"], { context: { active_test: false } });
    const selected = projects.find(record => record.id === projectId);
    if (selected) project = { id: projectId, name: typeof selected.name === "string" && selected.name ? selected.name : `Project ${projectId}` };
  } catch (_) {
    sendJson(response, 502, { ok: false, error: "The selected project is unavailable with your current Odoo access." });
    return;
  }
  if (!project) {
    sendJson(response, 404, { ok: false, error: "The selected project is unavailable with your current Odoo access." });
    return;
  }
  let employee;
  try { employee = await resolvePersonalEmployee(args, uid, settings.username); }
  catch (_) { sendJson(response, 422, { ok: false, error: "Your Odoo account could not be linked to an accessible employee." }); return; }
  let lines;
  const actualDomain = [["project_id", "=", projectId]];
  try {
    const definitions = await getModelFields(...args, "account.analytic.line");
    if (!isPersonalRelation(definitions.project_id, "project.project") || !isPersonalEmployeeRelation(definitions.employee_id)
      || !definitions.date || !definitions.unit_amount) throw new Error("Project timesheet fields are unavailable");
    const fields = ["id", "date", "unit_amount", "employee_id", "project_id", ...["name", "task_id"].filter(field => definitions[field])];
    const rows = await searchReadAll(...args, "account.analytic.line", actualDomain, fields, { order: "date asc, id asc", context: { active_test: false } });
    lines = rows.filter(line => personalRelationId(line.project_id) === projectId).map(line => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(line.date)) || !parsePersonalUtcDateTime(line.date)
        || !Number.isFinite(Number(line.unit_amount))) throw new Error("Project timesheet values are unavailable");
      return { ...normalizeTimesheetLine(line), employeeId: personalRelationId(line.employee_id), projectId, project: project.name };
    });
  } catch (_) {
    sendJson(response, 502, { ok: false, error: "Project timesheets are unavailable with your current Odoo access or schema." });
    return;
  }
  let planning = null, planningError = null;
  try {
    const result = await readScopedProjectHoursPlanning(args, project);
    planning = { ok: true, slots: result.slots, domain: result.domain };
  } catch (_) { planningError = "Project planning is unavailable with your current Odoo access or schema."; }
  const warnings = [];
  const hourRecords = [...lines, ...(planning?.slots || [])];
  await enrichEmployeeFunctions(...args, hourRecords, warnings);
  let assignments = [];
  try {
    assignments = await readScopedProjectAssignments(args, projectId);
    const assignmentWarnings = [];
    await enrichEmployeeFunctions(...args, assignments, assignmentWarnings);
    if (assignments.some(record => record.subcontractorClassification === "unknown")) {
      warnings.push("Project assignment functions are unavailable; Ormitter presence is based on confirmed records only.");
    }
  } catch (_) {
    warnings.push("Project assignments are unavailable; Ormitter presence is based on confirmed hour records only.");
  }
  const contributors = await buildProjectContributors(args, [...hourRecords, ...assignments]);
  const hasOrmitters = hourRecords.some(record => record.isSubcontractor === true && Number.isFinite(record.hours) && record.hours !== 0)
    || assignments.some(record => record.isSubcontractor === true);
  const lifetime = await readProjectLifetimeMetadata(args, projectId, warnings);
  const timesheets = { ok: true, lines, domain: actualDomain, lineCount: lines.length,
    totalHours: roundHours(lines.reduce((sum, line) => sum + line.hours, 0)),
    monthly: buildMonthlyTimesheetSummary(lines), employeeMonthly: buildMonthlyTimesheetSummary(lines.filter(line => !line.isSubcontractor)) };
  if (planning) {
    planning.slotCount = planning.slots.length;
    planning.totalHours = roundHours(planning.slots.reduce((sum, slot) => sum + slot.hours, 0));
    planning.monthly = buildPersonalPlanningMonthly(planning.slots);
    planning.employeeMonthly = buildPersonalPlanningMonthly(planning.slots.filter(slot => !slot.isSubcontractor));
  }
  sendJson(response, 200, { ok: true, uid, project, employee, timesheets, planning, planningError, warnings, contributors, hasOrmitters, lifetime });
}
