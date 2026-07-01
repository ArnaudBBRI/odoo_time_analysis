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
const DICO_RESPONSIBLE_UNIT = "RESEARCH AND DEVELOPMENT / DIGITAL CONSTRUCTION UNIT";

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
    if (url.pathname === "/api/odoo/project-workpackages") {
      await handleProjectWorkPackages(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/project-milestones") {
      await handleProjectMilestones(request, response);
      return;
    }
    if (url.pathname === "/api/odoo/dico-projects") {
      await handleDicoProjects(request, response);
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
  let actualLineCount = 0;
  let actualTotalHours = 0;
  let plannedMonthly = [];
  let plannedSlotCount = 0;
  let plannedTotalHours = 0;

  if (projectIds.length) {
    try {
      const lineFields = ["id", "date", "unit_amount", "name", "employee_id", "project_id", "task_id"];
      const lines = await searchReadAll(odooUrl, database, uid, apiKey, "account.analytic.line", [["project_id", "in", projectIds]], lineFields, {
        order: "date asc, id asc"
      });
      const normalizedLines = lines.map(normalizeTimesheetLine).filter((line) => line.date);
      actualMonthly = buildMonthlyTimesheetSummary(normalizedLines);
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
      plannedMonthly = buildMonthlyPlanningSummary(normalizedSlots);
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
    actualLineCount,
    actualTotalHours,
    plannedMonthly,
    plannedSlotCount,
    plannedTotalHours,
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
