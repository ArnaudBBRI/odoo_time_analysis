"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function validLanguage(value) { return value === "fr" || value === "nl"; }

// This store owns one fixed local preference, independently of Odoo credentials.
// Neither caller-supplied paths nor configuration contents cross the HTTP API.
function createStore(root, fileSystem = fs) {
  const target = path.join(path.resolve(root), "config.local.json");
  function snapshot() {
    try {
      const stat = fileSystem.lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Unsupported config file");
      const source = fileSystem.readFileSync(target, "utf8");
      const values = JSON.parse(source);
      if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Invalid config object");
      return { source, values };
    } catch (error) {
      if (error.code === "ENOENT") return { source: null, values: {} };
      const failure = new Error("The local preference could not be read.");
      failure.code = "LANGUAGE_CONFIG_INVALID";
      throw failure;
    }
  }
  function read() {
    try { const value = snapshot().values.language; return validLanguage(value) ? value : "fr"; }
    catch (_) { return "fr"; }
  }
  function save(language) {
    if (!validLanguage(language)) {
      const error = new Error("Only French and Dutch are supported."); error.code = "LANGUAGE_INVALID"; throw error;
    }
    const current = snapshot();
    const next = JSON.stringify({ ...current.values, language }, null, 2) + "\n";
    const temporary = path.join(path.dirname(target), `.config-language-${crypto.randomUUID()}.tmp`);
    let created = false, descriptor = null;
    try {
      // Establish ownership before writing: even a partially failed write must
      // be cleaned up, while an existing file from another writer stays intact.
      descriptor = fileSystem.openSync(temporary, "wx", 0o600);
      created = true;
      fileSystem.writeFileSync(descriptor, next, { encoding: "utf8" });
      fileSystem.closeSync(descriptor);
      descriptor = null;
      // Do not replace a config edited externally while the temporary file was written.
      if (snapshot().source !== current.source) {
        const conflict = new Error("The configuration changed during the update.");
        conflict.code = "LANGUAGE_CONFIG_CHANGED"; throw conflict;
      }
      fileSystem.renameSync(temporary, target);
      created = false;
      return language;
    } catch (error) {
      if (error.code === "LANGUAGE_CONFIG_CHANGED" || error.code === "LANGUAGE_CONFIG_INVALID") throw error;
      const failure = new Error("The local language preference could not be saved.");
      failure.code = "LANGUAGE_SAVE_FAILED"; throw failure;
    } finally {
      if (descriptor !== null) { try { fileSystem.closeSync(descriptor); } catch (_) { /* Attempt removal below even if closing failed. */ } }
      if (created) { try { fileSystem.unlinkSync(temporary); } catch (_) { /* Preserve the existing configuration. */ } }
    }
  }
  return { read, save };
}

module.exports = { createStore, validLanguage };
