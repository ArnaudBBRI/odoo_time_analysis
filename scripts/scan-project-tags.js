#!/usr/bin/env node
"use strict";

// An explicitly invoked diagnostic only. Ordinary app startup never imports or
// runs this file, and no generated candidate is merged into the shipped tags.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createRequire } = require("node:module"), crypto = require("node:crypto");
const tags = require("../project-tags"), { scan } = require("../project-tag-scan");
const ROOT = path.resolve(__dirname, "..");

function physicalOutputPath(file) {
  const absolute = path.resolve(file), suffix = [path.basename(absolute)];
  let ancestor = path.dirname(absolute);
  // Resolve the existing directory prefix before creating missing report
  // directories, so a junction/symlink alias cannot hide a reserved target.
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error("Report parent cannot be resolved");
    suffix.unshift(path.basename(ancestor)); ancestor = parent;
  }
  return path.join(fs.realpathSync(ancestor), ...suffix);
}
function checkedReportPath(output, root = ROOT) {
  const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
  const absolute = path.resolve(output), physical = physicalOutputPath(absolute);
  const reserved = ["config.local.json", "data/project-tags.json"].map(file => path.resolve(root, file));
  if (reserved.some(file => comparable(file) === comparable(absolute)
    || comparable(physicalOutputPath(file)) === comparable(physical))) {
    throw new Error("The scan report cannot replace configuration or the reviewed catalogue");
  }
  return physical;
}
function parseArgs(args, root = ROOT) {
  let output = path.join(root, ".local", "project-tag-scan.json");
  for (let index = 0; index < args.length; index++) {
    if (args[index] !== "--output" || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("Use --output <report.json> only");
    output = path.resolve(args[++index]);
  }
  return { output: checkedReportPath(output, root) };
}
function createGuardedRpc(root = ROOT) {
  const serverFile = path.join(root, "server.js"), requireFromServer = createRequire(serverFile);
  const noListener = { listen() { return this; }, on() { return this; } };
  const context = { __dirname: root, process: { env: {} }, console: { log() {}, error() {} },
    URL, AbortController, Buffer, setTimeout, clearTimeout, fetch,
    require(name) {
      // Stub HTTP startup only. Actual server XML-RPC functions, including the
      // read-only assertion before fetch, execute unchanged below.
      return ["http", "node:http"].includes(name) ? { createServer: () => noListener } : requireFromServer(name);
    } };
  vm.runInNewContext(fs.readFileSync(serverFile, "utf8"), context, { filename: serverFile, timeout: 2000 });
  return async () => {
    const settings = context.getAuthSettings({});
    const uid = await context.authenticateOdoo(settings.odooUrl, settings.database, settings.username, settings.apiKey);
    if (!Number.isSafeInteger(uid) || uid <= 0) throw new Error("Odoo authentication unavailable");
    const args = [settings.odooUrl, settings.database, uid, settings.apiKey];
    return { sourceKey: tags.sourceKeyFor(settings.odooUrl, settings.database),
      rpc: { fields: model => context.getModelFields(...args, model),
        read: (model, domain, fields, options) => context.searchReadAll(...args, model, domain, fields, options) } };
  };
}
function writeReport(output, report, root = ROOT) {
  let target = checkedReportPath(output, root);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // Recheck at the write boundary instead of trusting argument parsing; use
  // the resolved physical path for both the temporary file and final rename.
  target = checkedReportPath(target, root);
  const temporary = path.join(path.dirname(target), `.project-tag-scan-${crypto.randomBytes(8).toString("hex")}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
async function main(args = process.argv.slice(2)) {
  const { output } = parseArgs(args);
  const { rpc, sourceKey } = await createGuardedRpc()();
  const catalogueFile = path.join(ROOT, "data", "project-tags.json");
  const catalogue = fs.existsSync(catalogueFile) ? tags.validateCatalogue(JSON.parse(fs.readFileSync(catalogueFile, "utf8")))
    : tags.emptyCatalogue({ sourceKey, unitId: 206 });
  const report = await scan(rpc, catalogue, sourceKey);
  writeReport(output, report);
  process.stdout.write(JSON.stringify({ report: output, ...report.summary }) + "\n");
  return report;
}

if (require.main === module) main().catch(() => {
  // Never echo stored credentials, descriptions or upstream RPC faults.
  process.stderr.write("Project tag scan failed. Check local configuration, source namespace and read access; no catalogue was changed.\n");
  process.exitCode = 1;
});

module.exports = { parseArgs, createGuardedRpc, writeReport, main };
