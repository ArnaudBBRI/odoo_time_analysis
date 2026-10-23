"use strict";

// Session-scoped presentation only. No filesystem, network or Odoo access.
const { validateCatalogue, sourceKeyFor } = require("./project-tags");
const positiveId = value => Number.isSafeInteger(value) && value > 0;
const unavailable = () => ({ status: "unavailable", scannedAt: null, tagDefinitions: {}, projects: [] });

function createView(catalogue, visibleProjects, source) {
  try {
    if (!Array.isArray(visibleProjects)) return unavailable();
    const snapshot = validateCatalogue(catalogue);
    if (snapshot.scope.unitId !== 206 || snapshot.scope.sourceKey !== sourceKeyFor(source?.odooUrl, source?.database)) return unavailable();
    // A tag ID without a definition cannot be displayed as a translated tag.
    if (!snapshot.tagDefinitions && snapshot.projects.some(project => project.tags.length)) return unavailable();
    const visible = new Set(visibleProjects.filter(project => positiveId(project?.id)).map(project => project.id));
    const projects = snapshot.projects.filter(project => visible.has(project.id) && project.scanCompleted && project.tags.length)
      .map(project => ({ id: project.id, tags: project.tags.slice() })).sort((a, b) => a.id - b.id);
    const used = [...new Set(projects.flatMap(project => project.tags))].sort();
    const tagDefinitions = Object.fromEntries(used.map(id => [id,
      { fr: snapshot.tagDefinitions[id].fr, nl: snapshot.tagDefinitions[id].nl }]));
    return { status: "available", scannedAt: snapshot.scannedAt, tagDefinitions, projects };
  } catch (_) { return unavailable(); }
}

module.exports = { createView, unavailable };
