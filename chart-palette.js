(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ChartPalette = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  const storageKey = "odoo-time-analysis.chart-palette";
  const palettes = Object.freeze({
    classic: Object.freeze(["#f7909f", "#e2647f", "#d1698c", "#e8555f", "#da332a", "#fe672a", "#ff7a34", "#ffb22c", "#83ba69", "#4ca64e", "#2a897e", "#287f91", "#62b0dc", "#6492cb", "#4975c4", "#3b4f93", "#32436f", "#5f5395", "#6f4483", "#5a3340"]),
    "dico-vibes": Object.freeze(["#F89700", "#CAC800", "#4DD000", "#00EF75", "#00E0BF", "#00E7FF", "#00C2FF", "#00B8FF", "#9289FF", "#E480FF", "#FF55FF", "#FF53D3", "#FF3272", "#FF5E00", "#FF7000"]),
    "vibrant-emotions": Object.freeze(["#FF5733", "#C70039", "#FFC300", "#DAF7A6", "#581845", "#5D3F6A", "#FFC0CB", "#900C3F", "#FF9F00", "#2980B9"])
  });
  const listeners = new Set();
  let selected = "dico-vibes", initialized = false, storage = null;
  const valid = id => typeof id === "string" && Object.hasOwn(palettes, id);
  function publish(id) {
    if (selected === id) return false;
    selected = id;
    for (const listener of listeners) listener(id);
    return true;
  }
  function initialize(options = {}) {
    if (initialized) return selected;
    initialized = true;
    try {
      storage = Object.hasOwn(options, "storage") ? options.storage : root.localStorage;
      const saved = storage?.getItem(storageKey);
      if (valid(saved)) publish(saved);
    } catch (_) { /* A blocked browser store must not prevent chart rendering. */ }
    return selected;
  }
  function set(id) {
    if (!valid(id)) return false;
    if (!initialized) initialize();
    if (selected === id) return false;
    try { storage?.setItem(storageKey, id); } catch (_) { /* Keep the choice for this session. */ }
    return publish(id);
  }
  function colors(id = selected) { return palettes[valid(id) ? id : selected]; }
  function color(index, id = selected) {
    const values = colors(id);
    return values[(Number.isSafeInteger(index) && index >= 0 ? index : 0) % values.length];
  }
  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  return { initialize, current: () => selected, set, colors, color, subscribe };
});
