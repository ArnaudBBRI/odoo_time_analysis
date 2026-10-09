const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const data = require("./steering-fixture");
function xmlValue(value) {
  const escape = text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  if (Array.isArray(value)) return `<array><data>${value.map(item => `<value>${xmlValue(item)}</value>`).join("")}</data></array>`;
  if (value && typeof value === "object") return `<struct>${Object.entries(value).map(([name, item]) => `<member><name>${escape(name)}</name><value>${xmlValue(item)}</value></member>`).join("")}</struct>`;
  if (typeof value === "boolean") return `<boolean>${value ? 1 : 0}</boolean>`;
  if (typeof value === "number") return Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
  return `<string>${escape(value)}</string>`;
}
async function startRuntime(options = {}) {
  const calls = [], failures = [];
  const mock = http.createServer(async (req, res) => {
    let xml = ""; for await (const chunk of req) xml += chunk;
    calls.push(xml);
    let result = [];
    if (xml.includes("<methodName>authenticate</methodName>")) result = xml.includes("<string>correct password</string>") ? xml.includes("second@example.com") ? 8 : 7 : false;
    if (xml.includes("<methodName>execute_kw</methodName>")) {
      const model = /<string>([^<]+)<\/string><\/value><\/param>\s*<param><value><string>(?:fields_get|search_read|read_group)<\/string>/.exec(xml)?.[1];
      if (xml.includes("<string>fields_get</string>")) result = data.definitions[model] || {};
      else {
        result = structuredClone(data.records[model] || []);
        if (xml.includes("<param><value><int>8</int></value></param>")) result = result.filter(row => model === "project.project" ? row.id === 12 : row.project_id?.[0] === 12);
        if (model === "project.project") {
          const match = /<string>id<\/string><\/value><value><string>=<\/string><\/value><value><int>(\d+)<\/int>/.exec(xml);
          if (match) result = result.filter(row => row.id === Number(match[1]));
        }
        if (options.failModel === model) { failures.push(model); res.end(`<methodResponse><fault><value><struct><member><name>faultString</name><value><string>private-upstream-secret</string></value></member></struct></value></fault></methodResponse>`); return; }
      }
    }
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(`<methodResponse><params><param><value>${xmlValue(result)}</value></param></params></methodResponse>`);
  });
  mock.listen(0, "127.0.0.1"); await once(mock, "listening");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bw-pilotage-fixture-"));
  for (const file of ["server.js", "index.html", "login.html", "steering.js", "steering-service.js", "steering-client.js", "steering-client.css", "personal-time.js", "personal-time.css", "project-monthly.js", "project-browser.js", "project-browser.css"]) fs.copyFileSync(path.join(__dirname, "..", file), path.join(directory, file));
  // Only the isolated test copy is labelled. Fixtures are never included in the real dashboard.
  const index = path.join(directory, "index.html");
  fs.writeFileSync(index, fs.readFileSync(index, "utf8").replace("<body>", '<body><p style="text-align:center;background:#e9f4f7;padding:8px">Données simulées · contrôle local</p>'));
  fs.mkdirSync(path.join(directory, "assets")); fs.copyFileSync(path.join(__dirname, "..", "assets", "buildwise-logo.svg"), path.join(directory, "assets", "buildwise-logo.svg"));
  fs.writeFileSync(path.join(directory, "config.local.json"), JSON.stringify({ odooUrl: `http://127.0.0.1:${mock.address().port}`, database: "fixture", apiKey: "ignored-config-secret", pilotage: options.disabled ? {} : data.config }));
  const child = spawn(process.execPath, ["server.js"], { cwd: directory, env: { ...process.env, HOST: "127.0.0.1", PORT: "0", SESSION_COOKIE_SECURE: "false" } });
  let output = ""; child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Fixture startup timeout")), 5000);
    child.once("exit", code => { clearTimeout(timer); reject(new Error(`Fixture exited ${code}`)); });
    child.stdout.on("data", () => { const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output); if (match) { clearTimeout(timer); resolve(match[0]); } });
  });
  const request = (route, init = {}) => fetch(base + route, { redirect: "manual", ...init });
  return { base, directory, calls, failures, request,
    login: (email = "person@example.com") => request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "correct password" }) }),
    async close() {
      child.kill(); if (child.exitCode === null) await once(child, "exit");
      await new Promise(resolve => mock.close(resolve));
      const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(directory));
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Refusing cleanup outside the fixture temp directory");
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
}
module.exports = { startRuntime };
if (require.main === module) startRuntime().then(runtime => {
  process.stdout.write(`Simulated pilotage preview: ${runtime.base}\n`);
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { await runtime.close(); process.exit(0); });
});
