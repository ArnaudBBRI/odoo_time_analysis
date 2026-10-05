const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");
const steeringService = require("./steering-service");

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
      if (["/steering.js", "/steering-client.js", "/steering-client.css"].includes(url.pathname)) {
        await serveStaticFile(url.pathname, response);
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

async function handleLogin(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Use POST for this endpoint" });
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
    sendJson(response, 400, { ok: false, error: "Please provide a valid email and password" });
    return;
  }
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 4096) {
    sendJson(response, 400, { ok: false, error: "Please provide a valid email and password" });
    return;
  }
  let odooUrl, database, uid;
  try {
    const config = readDashboardConfigInfo().values;
    odooUrl = normalizeOdooUrl(firstNonBlank(config.odooUrl, config.url, DEFAULT_CONFIG.odooUrl));
    database = cleanRequired(firstNonBlank(config.database, DEFAULT_CONFIG.database), "Database");
    uid = await authenticateOdoo(odooUrl, database, email, password);
  } catch (error) {
    if (/access.?denied|invalid credentials/i.test(error.message || "")) {
      sendJson(response, 401, { ok: false, error: "Email or password not recognized by Odoo" });
    } else sendJson(response, 502, { ok: false, error: "Odoo sign-in is unavailable. Please try again later." });
    return;
  }
  if (!uid) {
    sendJson(response, 401, { ok: false, error: "Email or password not recognized by Odoo" });
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
    attributes: ["string", "type", "relation"]
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
  try {
    return await searchReadAll(odooUrl, database, uid, apiKey, "project.project", [["name", "ilike", projectCode]], ["id", "name"], {
      order: "name asc"
    });
  } catch (error) {
    warnings.push(`Project lookup failed: ${error.message}`);
    return [];
  }
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
  if (projectIds.length) {
    const actualRows = await searchReadAll(...args, "account.analytic.line", [["project_id", "in", projectIds]],
      ["id", "date", "unit_amount", "name", "employee_id", "project_id", "task_id"], { order: "date asc, id asc" });
    lines = actualRows.map(normalizeTimesheetLine).filter(line => line.date && names.has(Number(line.projectId)));
    lines.forEach(line => { line.project = names.get(Number(line.projectId)); });
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
    } catch (error) { planningError = error.message; }
  }
  sendJson(response, 200, {
    ok: true, team: { id: teamId, name: team.name }, ownerField: field.name, domain,
    projects: projects.map(project => ({ id: project.id, name: project.name,
      timesheets: { projectName: project.name, projectCode: String(project.id),
        monthly: buildMonthlyTimesheetEmployeeSummary(lines.filter(line => Number(line.projectId) === Number(project.id))) },
      planning: planningError ? null : { projectName: project.name, projectCode: String(project.id),
        monthly: buildMonthlyPlanningEmployeeSummary(slots.filter(slot => Number(slot.projectId) === Number(project.id))) }
    })),
    timesheets: { ok: true, lineCount: lines.length, totalHours: roundHours(lines.reduce((sum, line) => sum + line.hours, 0)),
      monthly: buildMonthlyTimesheetSummary(lines), lines },
    planning: planningError ? null : { ok: true, slotCount: slots.length, totalHours: roundHours(slots.reduce((sum, slot) => sum + slot.hours, 0)),
      monthly: buildMonthlyPlanningSummary(slots), slots },
    planningError
  });
}
