function domFixture() {
  const document = { activeElement: null, listeners: new Map(),
    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) {
      this.listeners.get(name)?.delete(callback);
      if (!this.listeners.get(name)?.size) this.listeners.delete(name);
    },
    dispatch(name, event = {}) { for (const callback of this.listeners.get(name) || []) callback(event); }
  };
  class Element {
    constructor(tag) {
      this.tagName = tag;
      this.ownerDocument = document;
      this.children = [];
      this.attributes = new Map();
      this.listeners = new Map();
      this.style = {};
      this.hidden = false;
      this.className = "";
      this.ownText = "";
      this.classList = {
        add: value => { this.className = [...new Set([...this.className.split(/\s+/), value])].join(" ").trim(); },
        remove: value => { this.className = this.className.split(/\s+/).filter(item => item !== value).join(" "); }
      };
    }
    set textContent(value) { this.ownText = String(value); this.children = []; }
    get textContent() { return this.ownText + this.children.map(child => child.textContent).join(""); }
    set innerHTML(_) { throw new Error("UI must render source text without HTML injection"); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.ownText = ""; this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === "class") this.className = String(value); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    dispatch(name, event = {}) { return this.listeners.get(name)?.({ target: this, ...event }); }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }
    contains(element) { return this === element || this.children.some(child => child.contains(element)); }
    focus() { document.activeElement = this; this.dispatch("focus"); }
    querySelectorAll(selector) {
      const matches = element => {
        if (selector.startsWith(".")) return element.className.split(/\s+/).includes(selector.slice(1));
        const attribute = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
        if (attribute) return element.attributes.has(attribute[1]) && (attribute[2] === undefined || element.getAttribute(attribute[1]) === attribute[2]);
        return element.tagName === selector;
      };
      return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
  }
  document.createElement = tag => new Element(tag);
  document.createElementNS = (_, tag) => new Element(tag);
  return document.createElement("div");
}

module.exports = { domFixture };
