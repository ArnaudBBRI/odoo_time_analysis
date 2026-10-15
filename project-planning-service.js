"use strict";

function positiveId(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function relationId(value) {
  return positiveId(Array.isArray(value) ? value[0] : value);
}

function employeeRelation(definition) {
  return definition?.type === "many2one" && ["hr.employee", "hr.employee.public"].includes(definition.relation);
}

function employeeList(definition) {
  return ["one2many", "many2many"].includes(definition?.type) &&
    ["hr.employee", "hr.employee.public"].includes(definition.relation);
}

function toHireName(name) {
  return typeof name === "string" && /^TH_/i.test(name) && !!name.slice(3).trim();
}

async function load(rpc, projectId, slots) {
  const project = positiveId(projectId);
  if (!project) throw new Error("Invalid project planning identity scope");
  const records = Array.isArray(slots) ? slots : [];
  const scoped = records.filter(slot => positiveId(slot?.projectId) === project);
  const ids = [...new Set(scoped.map(slot => positiveId(slot.resourceId)).filter(Boolean))].sort((a, b) => a - b);
  const requested = new Set(ids), owners = new Map(ids.map(id => [id, new Set()]));
  const conflicts = new Set(), columns = new Map();
  for (const slot of scoped) {
    const employee = positiveId(slot.employeeId), resource = positiveId(slot.resourceId);
    if (employee && resource) owners.get(resource).add(employee);
  }

  let definitions = {};
  if (ids.length) {
    try {
      const value = await rpc.fields("resource.resource");
      if (value && typeof value === "object" && !Array.isArray(value)) definitions = value;
    } catch (_) { /* Optional identity metadata never hides project hours. */ }
  }
  const linkFields = ["employee_id", "employee_ids"].filter(field => employeeRelation(definitions[field]) || employeeList(definitions[field]));
  const fields = [...(["char", "text"].includes(definitions.name?.type) ? ["name"] : []), ...linkFields];
  const readColumns = async selected => {
    const rows = await rpc.read("resource.resource", [["id", "in", ids]], ["id", ...selected],
      { order: "id asc", context: { active_test: false } });
    if (!Array.isArray(rows)) throw new Error("Optional resource identities are unavailable");
    const byId = new Map();
    for (const row of rows) {
      const id = positiveId(row?.id);
      if (!requested.has(id)) continue;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(row);
    }
    for (const field of selected) {
      const values = new Map();
      for (const [id, matches] of byId) {
        if (matches.length === 1 && Object.hasOwn(matches[0], field)) values.set(id, matches[0][field]);
      }
      columns.set(field, values);
    }
  };
  if (ids.length && definitions.id?.type === "integer" && fields.length) {
    try { await readColumns(fields); }
    catch (_) {
      for (const field of fields) {
        try { await readColumns([field]); } catch (_) { /* Keep each denied field unknown. */ }
      }
    }
  }

  const negativeLinks = new Set(), confirmedLinks = new Set();
  for (const id of ids) {
    const links = [];
    for (const field of linkFields) {
      if (!columns.get(field)?.has(id)) continue;
      const value = columns.get(field).get(id);
      if (definitions[field].type === "many2one") {
        if (value === false || value === null) links.push([]);
        else {
          const employee = relationId(value);
          if (employee) links.push([employee]); else conflicts.add(id);
        }
      } else if (Array.isArray(value) && value.every(item => positiveId(item))) {
        links.push([...new Set(value.map(positiveId))]);
      } else conflicts.add(id);
    }
    if (!links.length) continue;
    if (links.some(link => link.length > 1) || links.some(link => link.length !== links[0].length || link[0] !== links[0][0])) {
      conflicts.add(id); continue;
    }
    if (links[0].length) { owners.get(id).add(links[0][0]); confirmedLinks.add(id); }
    else negativeLinks.add(id);
  }

  // A readable exact employee mapping proves a positive link. An empty search
  // does not prove absence: record rules may hide a linked employee.
  const pending = ids.filter(id => !negativeLinks.has(id) && !confirmedLinks.has(id) &&
    !conflicts.has(id) && owners.get(id).size === 0);
  const employeeResources = new Map();
  if (pending.length) {
    const pendingIds = new Set(pending);
    for (const model of ["hr.employee", "hr.employee.public"]) {
      try {
        const metadata = await rpc.fields(model);
        if (metadata?.id?.type !== "integer" || metadata.resource_id?.type !== "many2one" ||
          metadata.resource_id.relation !== "resource.resource") continue;
        const rows = await rpc.read(model, [["resource_id", "in", pending]], ["id", "resource_id"],
          { order: "id asc", context: { active_test: false } });
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          const resource = relationId(row?.resource_id);
          if (!pendingIds.has(resource)) continue;
          const employee = positiveId(row.id);
          if (!employee) { conflicts.add(resource); continue; }
          owners.get(resource).add(employee);
          if (!employeeResources.has(employee)) employeeResources.set(employee, new Set());
          employeeResources.get(employee).add(resource);
        }
      } catch (_) { /* Permission failures retain an unknown link. */ }
    }
  }
  for (const resources of employeeResources.values()) {
    if (resources.size > 1) resources.forEach(id => conflicts.add(id));
  }

  const resources = ids.map(id => {
    const value = columns.get("name")?.get(id);
    const name = typeof value === "string" && value.trim() && value.length <= 1024 ? value.trim() : null;
    const candidates = owners.get(id);
    const conflicting = conflicts.has(id) || candidates.size > 1 || negativeLinks.has(id) && candidates.size > 0;
    const employeeId = !conflicting && candidates.size === 1 ? [...candidates][0] : null;
    const linkStatus = conflicting ? "unknown" : employeeId ? "linked" : negativeLinks.has(id) ? "unlinked" : "unknown";
    // Odoo can represent a collective To Hire placeholder as an employee.
    // Its technical employee link does not turn it into a real person.
    const isToHire = name === null ? null : toHireName(name);
    return { id, name, employeeId, linkStatus, isToHire };
  });
  const byResource = new Map(resources.map(resource => [resource.id, resource]));
  const identities = records.map(slot => {
    if (positiveId(slot?.projectId) !== project) return { status: "unknown", employeeId: null };
    const employeeId = positiveId(slot.employeeId);
    if (!employeeId && ![null, undefined, false, ""].includes(slot.employeeId)) return { status: "unknown", employeeId: null };
    const resource = byResource.get(positiveId(slot.resourceId));
    if (resource?.isToHire === true) return { status: "to-hire", employeeId: null };
    if (resource && resource.name === null) {
      return { status: "unknown", employeeId: null };
    }
    if (employeeId) return { status: "person", employeeId };
    if (resource?.linkStatus === "linked") return { status: "person", employeeId: resource.employeeId };
    if (resource?.linkStatus === "unlinked" && resource.isToHire === false) return { status: "unlinked", employeeId: null };
    return { status: "unknown", employeeId: null };
  });
  return { resources, identities };
}

module.exports = { load };
