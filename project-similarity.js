(function (root, factory) {
  const commonJS = typeof module === "object" && module.exports;
  if (commonJS) require("./i18n-timeline-messages");
  const api = factory(commonJS ? require("./project-card") : root.ProjectCard,
    commonJS ? require("./i18n") : root.DashboardI18n);
  if (commonJS) module.exports = api;
  else root.ProjectSimilarity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ProjectCard, I18n) {
  "use strict";

  const TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  const COLORS = ["#00a99e", "#556a99", "#0087b7", "#dba90b", "#a36a4d", "#607f88"];
  const groupColor = index => `hsl(${(190 + index * 137) % 360} 58% 40%)`;
  const lifecycles = new WeakMap();
  let cloudControlId = 0;
  const t = (key, values) => I18n.t(`timeline.similarity.${key}`, values);
  const positiveId = value => Number.isSafeInteger(value) && value > 0;
  const cleanText = value => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
  const edgeKey = (a, b) => `${Math.min(a, b)}:${Math.max(a, b)}`;
  const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const label = (definition, tag) => definition?.[I18n.language()] || tag;
  function shortName(project) {
    const value = cleanText(ProjectCard?.nameParts?.(project)?.shortName || project.name);
    return value.length > 26 ? `${value.slice(0, 25)}…` : value;
  }

  // Weighted greedy modularity: merge the pair with the largest positive change
  // in Q. Tie breaks use exact IDs, so incoming order/language cannot move groups.
  function communitiesFor(nodes, edges) {
    const degree = new Map(nodes.map(node => [node.id, 0]));
    let total = 0;
    for (const edge of edges) { total += edge.similarity; degree.set(edge.source, degree.get(edge.source) + edge.similarity); degree.set(edge.target, degree.get(edge.target) + edge.similarity); }
    if (!total) return [];
    let groups = nodes.filter(node => degree.get(node.id) > 0).map(node => [node.id]);
    while (groups.length > 1) {
      let best = null;
      for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
        const a = new Set(groups[i]), b = new Set(groups[j]);
        const between = edges.reduce((sum, edge) => sum + (a.has(edge.source) && b.has(edge.target) || a.has(edge.target) && b.has(edge.source) ? edge.similarity : 0), 0);
        if (!between) continue;
        const da = groups[i].reduce((sum, id) => sum + degree.get(id), 0), db = groups[j].reduce((sum, id) => sum + degree.get(id), 0);
        const gain = between / total - da * db / (2 * total * total);
        if (gain > 1e-12 && (!best || gain > best.gain + 1e-12)) best = { i, j, gain };
      }
      if (!best) break;
      groups[best.i] = [...groups[best.i], ...groups[best.j]].sort((a, b) => a - b);
      groups.splice(best.j, 1);
    }
    return groups.sort((a, b) => b.length - a.length || a[0] - b[0]);
  }

  function buildModel(projects, tagMap) {
    const unavailable = { status: "unavailable", nodes: [], edges: [], communities: [], isolates: [], definitions: {} };
    if (tagMap?.status !== "available" || !Array.isArray(projects) || !Array.isArray(tagMap.projects)
      || !tagMap.tagDefinitions || typeof tagMap.tagDefinitions !== "object" || Array.isArray(tagMap.tagDefinitions)) return unavailable;
    const definitions = {};
    for (const [id, definition] of Object.entries(tagMap.tagDefinitions)) {
      if (!TAG.test(id) || !cleanText(definition?.fr) || !cleanText(definition?.nl)) continue;
      definitions[id] = { fr: cleanText(definition.fr).slice(0, 200), nl: cleanText(definition.nl).slice(0, 200) };
    }
    const visible = new Map(), conflicting = new Set(), records = new Map(), tagConflicts = new Set();
    for (const project of projects) {
      if (!positiveId(project?.id) || !cleanText(project.name)) continue;
      const name = cleanText(project.name);
      if (visible.has(project.id) && visible.get(project.id).name !== name) conflicting.add(project.id);
      else visible.set(project.id, { id: project.id, name });
    }
    for (const row of tagMap.projects) {
      if (!positiveId(row?.id) || !visible.has(row.id) || !Array.isArray(row.tags)) continue;
      // Unknown/invalid tags cannot silently become evidence for a link.
      if (row.tags.some(tag => typeof tag !== "string" || !TAG.test(tag) || !Object.hasOwn(definitions, tag))) { tagConflicts.add(row.id); continue; }
      const tags = [...new Set(row.tags)].sort();
      if (records.has(row.id) && JSON.stringify(records.get(row.id)) !== JSON.stringify(tags)) tagConflicts.add(row.id);
      else records.set(row.id, tags);
    }
    const nodes = [...records].filter(([id, tags]) => tags.length && !conflicting.has(id) && !tagConflicts.has(id))
      .sort(([a], [b]) => a - b).map(([id, tags]) => ({ ...visible.get(id), tags, shortName: shortName(visible.get(id)) }));
    const frequency = new Map();
    for (const node of nodes) for (const tag of node.tags) frequency.set(tag, (frequency.get(tag) || 0) + 1);
    const weight = tag => Math.log(1 + nodes.length / frequency.get(tag));
    const edges = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], tags = new Set(b.tags), sharedTags = a.tags.filter(tag => tags.has(tag));
      if (!sharedTags.length) continue;
      const union = [...new Set([...a.tags, ...b.tags])];
      const similarity = sharedTags.reduce((sum, tag) => sum + weight(tag), 0) / union.reduce((sum, tag) => sum + weight(tag), 0);
      edges.push({ key: edgeKey(a.id, b.id), source: a.id, target: b.id, sharedTags, similarity });
    }
    const groups = communitiesFor(nodes, edges), byId = new Map(nodes.map(node => [node.id, node]));
    const communities = groups.map((ids, index) => {
      const counts = new Map();
      for (const id of ids) for (const tag of byId.get(id).tags) counts.set(tag, (counts.get(tag) || 0) + 1);
      const tags = [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || weight(b[0]) - weight(a[0]) || a[0].localeCompare(b[0])).slice(0, 2).map(([tag]) => tag);
      const group = { key: ids.join(":"), ids, tags, color: COLORS[index % COLORS.length] };
      for (const id of ids) { byId.get(id).community = group.key; byId.get(id).color = group.color; }
      return group;
    });
    const isolates = nodes.filter(node => !node.community).map(node => { node.color = "#6e8993"; return node.id; });
    return { status: "available", nodes, edges, communities, isolates, definitions };
  }

  function thematicParticles(ids, edges, recordFrames) {
    const positions = new Map(), frames = [];
    const capture = () => { if (recordFrames) frames.push(new Map([...positions].map(([id, p]) => [id, { ...p }]))); };
    ids.forEach((id, index) => {
      const angle = index * 2.399963229728653 + .35, radius = .015 + Math.sqrt(index + 1) * .009;
      positions.set(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * .7 });
    });
    capture();
    const k = Math.sqrt(4 / ids.length);
    // The nonlinear tag springs balance inverse-distance repulsion before any
    // viewport fitting. This preserves interior communities instead of pushing
    // their equilibria against the chart's rectangular boundary.
    for (let iteration = 0; iteration < 450; iteration++) {
      const force = new Map(ids.map(id => [id, { x: 0, y: 0 }]));
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i]), b = positions.get(ids[j]), dx = a.x - b.x || .0001, dy = a.y - b.y;
        const distance = Math.max(.015, Math.hypot(dx, dy)), strength = k * k / distance;
        force.get(ids[i]).x += dx / distance * strength; force.get(ids[i]).y += dy / distance * strength;
        force.get(ids[j]).x -= dx / distance * strength; force.get(ids[j]).y -= dy / distance * strength;
      }
      for (const edge of edges) {
        const a = positions.get(edge.source), b = positions.get(edge.target);
        if (!a || !b) continue;
        const dx = a.x - b.x, dy = a.y - b.y, distance = Math.max(.015, Math.hypot(dx, dy));
        const strength = distance * distance / k * Math.pow(edge.similarity, .7) * 3;
        force.get(edge.source).x -= dx / distance * strength; force.get(edge.source).y -= dy / distance * strength;
        force.get(edge.target).x += dx / distance * strength; force.get(edge.target).y += dy / distance * strength;
      }
      const temperature = .03 * (1 - iteration / 450) + .001;
      for (const id of ids) {
        const point = positions.get(id), f = force.get(id), length = Math.hypot(f.x, f.y) || 1;
        point.x += f.x / length * Math.min(temperature, length); point.y += f.y / length * Math.min(temperature, length);
      }
      if ((iteration + 1) % 4 === 0) capture();
    }
    const xs = [...positions.values()].map(p => p.x), ys = [...positions.values()].map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scaleX = 740 / Math.max(.01, maxX - minX), scaleY = 380 / Math.max(.01, maxY - minY);
    const fit = map => new Map([...map].map(([id, p]) => [id, {
      x: Math.max(85, Math.min(915, 500 + (p.x - (minX + maxX) / 2) * scaleX)),
      y: Math.max(95, Math.min(505, 295 + (p.y - (minY + maxY) / 2) * scaleY)) }]));
    // One fixed coordinate transform for the whole real trace; frames are never
    // interpolated from their endpoints or independently stretched each step.
    return { positions: fit(positions), frames: frames.map(fit) };
  }

  function layout(model, { groups = null, recordFrames = false } = {}) {
    const active = model.nodes.filter(node => !model.isolates.includes(node.id)).slice().sort((a, b) => a.id - b.id);
    const ids = active.map(node => node.id), positions = new Map(), frames = [];
    if (!ids.length) return { positions, labels: new Map(), regions: [], frames };
    const visible = new Set(ids), programme = Array.isArray(groups);
    const regionGroups = (programme ? groups : model.communities).map(group => ({ ...group,
      ids: [...new Set(group.ids)].filter(id => visible.has(id)) })).filter(group => group.ids.length);
    const anchored = programme ? regionGroups.filter(group => !group.other) : [];
    const centres = anchored.map((group, index) => {
      if (anchored.length <= 3) return { group,
        x: anchored.length === 1 ? 500 : 210 + index * 580 / (anchored.length - 1), y: 285 };
      const columns = Math.ceil(Math.sqrt(anchored.length * 1.7)), rows = Math.ceil(anchored.length / columns);
      const column = index % columns, row = Math.floor(index / columns);
      return { group, x: columns === 1 ? 500 : 145 + column * 710 / (columns - 1),
        y: rows === 1 ? 285 : 125 + row * 330 / (rows - 1) };
    });
    const targets = new Map();
    for (const id of ids) {
      const memberships = centres.filter(({ group }) => group.ids.includes(id));
      if (memberships.length) targets.set(id, { x: memberships.reduce((sum, c) => sum + c.x, 0) / memberships.length,
        y: memberships.reduce((sum, c) => sum + c.y, 0) / memberships.length });
    }
    const velocities = new Map(), constrain = point => {
      point.x = Math.max(85, Math.min(915, point.x)); point.y = Math.max(95, Math.min(505, point.y));
    };
    const capture = () => { if (recordFrames) frames.push(new Map([...positions].map(([id, p]) => [id, { x: p.x, y: p.y }]))); };
    const edges = model.edges.slice().sort((a, b) => a.source - b.source || a.target - b.target);
    if (!programme) {
      const settled = thematicParticles(ids, edges, recordFrames);
      for (const [id, point] of settled.positions) positions.set(id, point);
      frames.push(...settled.frames);
    } else {
      ids.forEach((id, index) => {
        const angle = index * 2.399963229728653 + .35, radius = 12 + Math.sqrt(index + 1) * 5;
        const seed = targets.get(id) || { x: 500, y: 295 };
        positions.set(id, { x: seed.x + Math.cos(angle) * radius, y: seed.y + Math.sin(angle) * radius * .65 });
        velocities.set(id, { x: 0, y: 0 });
      });
      capture();
      // Damped particles settle under tag springs and pair repulsion.
      // Programme mode adds persistent centres; unassigned nodes keep only the
      // weak chart-centre field and tag springs, rather than a fourth cluster.
      for (let iteration = 0; iteration < 440; iteration++) {
        const force = new Map(ids.map(id => [id, { x: 0, y: 0 }]));
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
          const a = positions.get(ids[i]), b = positions.get(ids[j]), dx = a.x - b.x || .001, dy = a.y - b.y;
          const distance = Math.max(12, Math.hypot(dx, dy)), strength = 15 / distance;
          force.get(ids[i]).x += dx / distance * strength; force.get(ids[i]).y += dy / distance * strength;
          force.get(ids[j]).x -= dx / distance * strength; force.get(ids[j]).y -= dy / distance * strength;
        }
        for (const edge of edges) {
          const a = positions.get(edge.source), b = positions.get(edge.target);
          if (!a || !b) continue;
          const strength = .0015 * Math.pow(edge.similarity, .7);
          const dx = (a.x - b.x) * strength, dy = (a.y - b.y) * strength;
          force.get(edge.source).x -= dx; force.get(edge.source).y -= dy;
          force.get(edge.target).x += dx; force.get(edge.target).y += dy;
        }
        const speed = 8 * (1 - iteration / 440) + .15;
        for (const id of ids) {
          const p = positions.get(id), f = force.get(id), target = targets.get(id), velocity = velocities.get(id);
          const attraction = target ? .09 : .004;
          f.x += ((target?.x ?? 500) - p.x) * attraction;
          f.y += ((target?.y ?? 295) - p.y) * attraction * (target ? 1 : 3);
          velocity.x = (velocity.x + f.x) * .72; velocity.y = (velocity.y + f.y) * .72;
          const length = Math.hypot(velocity.x, velocity.y) || 1, limit = Math.min(1, speed / length);
          p.x += velocity.x * limit; p.y += velocity.y * limit; constrain(p);
        }
        if ((iteration + 1) % 4 === 0) capture();
      }
    }
    // Constrain during relaxation: a final clamp could otherwise reintroduce collisions.
    for (let iteration = 0; iteration < 300; iteration++) {
      let overlap = 0;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i]), b = positions.get(ids[j]);
        const dx = b.x - a.x || .001, dy = b.y - a.y, distance = Math.hypot(dx, dy);
        if (distance < 67) {
          overlap = Math.max(overlap, 67 - distance);
          const shift = (67 - distance) / 2;
          a.x -= dx / distance * shift; a.y -= dy / distance * shift;
          b.x += dx / distance * shift; b.y += dy / distance * shift;
          constrain(a); constrain(b);
        }
      }
      if ((iteration + 1) % 15 === 0) capture();
      if (overlap < .01) break;
    }
    capture();
    const regions = regionGroups.map(group => cloudRegion(group, positions));
    const occupied = [...positions.values()].map(point => ({ x: point.x - 22, y: point.y - 22, w: 44, h: 44 }));
    const labels = new Map();
    for (const node of [...active].sort((a, b) => b.shortName.length - a.shortName.length || a.id - b.id)) {
      // Conservative 13px bold glyph widths include the white text stroke; capitals
      // such as DATA2TOTEM need more room than an average lowercase character.
      const width = Math.max(55, 8 + [...node.shortName].reduce((sum, character) =>
        sum + (/[MWmw…]/.test(character) ? 12 : /[ilI .,:;!|]/.test(character) ? 4.5 : /[A-Z0-9]/.test(character) ? 9.5 : 8), 0));
      const p = positions.get(node.id);
      const candidates = [{ x: p.x - width / 2, y: p.y - 45 }, { x: p.x - width / 2, y: p.y + 31 },
        { x: p.x + 31, y: p.y - 7 }, { x: p.x - width - 31, y: p.y - 7 },
        { x: p.x - width / 2, y: p.y - 63 }, { x: p.x - width / 2, y: p.y + 49 }];
      // Nearby alternatives keep labels clear when every immediate side is occupied.
      for (let dy = -144; dy <= 144; dy += 18) for (let dx = -224; dx <= 224; dx += 14)
        candidates.push({ x: p.x - width / 2 + dx, y: p.y - 10.5 + dy });
      const choices = candidates.filter(point => point.x >= 5 && point.x + width <= 995 && point.y >= 5 && point.y + 21 <= 580)
        .map((point, index) => {
          const box = { ...point, w: width, h: 21 };
          const distance = Math.hypot(point.x + width / 2 - p.x, point.y + 10.5 - p.y);
          return { ...box, score: occupied.filter(other => intersects(box, other)).length * 10000 + distance + index * .000001 };
        });
      let best = choices.sort((a, b) => a.score - b.score)[0];
      // A dense local neighbourhood may leave no clear nearby slot. Search the
      // remaining chart before accepting a collision; the existing guide then
      // connects a displaced label to its exact project bubble.
      if (best.score >= 10000) {
        for (let y = 5; y + 21 <= 580; y += 18) for (let x = 5; x + width <= 995; x += 14) {
          const box = { x, y, w: width, h: 21 };
          if (occupied.some(other => intersects(box, other))) continue;
          const score = Math.hypot(x + width / 2 - p.x, y + 10.5 - p.y);
          if (score < best.score) best = { ...box, score };
        }
      }
      labels.set(node.id, best); occupied.push(best);
    }
    return { positions, regions, labels, frames };
  }

  function hull(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [], upper = [];
    for (const point of sorted) { while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop(); lower.push(point); }
    for (const point of sorted.reverse()) { while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop(); upper.push(point); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function cloudRegion(group, positions) {
    return { ...group, points: hull(group.ids.flatMap(id => {
      const point = positions.get(id);
      return Array.from({ length: 16 }, (_, index) => ({ x: point.x + 47 * Math.cos(index * Math.PI / 8), y: point.y + 47 * Math.sin(index * Math.PI / 8) }));
    })) };
  }

  function programmeRegions(geometry, programmeMap) {
    if (programmeMap?.status !== "available" || !Array.isArray(programmeMap.programmes) || programmeMap.programmes.length !== 3) return null;
    const colors = { DC1: COLORS[1], DC2: COLORS[0], DC3: COLORS[3] }, groups = [], seen = new Set(), assigned = new Set();
    for (const row of programmeMap.programmes) {
      if (!row || !Object.hasOwn(colors, row.id) || seen.has(row.id) || row.code !== row.id
        || typeof row.subtitle !== "string" || !cleanText(row.subtitle) || row.subtitle.length > 100
        || !Array.isArray(row.projectIds) || row.projectIds.some(id => !positiveId(id))) return null;
      seen.add(row.id);
      const ids = [...new Set(row.projectIds)].filter(id => geometry.positions.has(id)).sort((a, b) => a - b);
      ids.forEach(id => assigned.add(id));
      if (ids.length) groups.push(cloudRegion({ key: `programme:${row.id}`, ids, color: colors[row.id], name: `${row.code} · ${cleanText(row.subtitle)}` }, geometry.positions));
    }
    groups.sort((a, b) => a.key.localeCompare(b.key));
    const otherIds = [...geometry.positions.keys()].filter(id => !assigned.has(id));
    if (otherIds.length) groups.push(cloudRegion({ key: "programme:other", ids: otherIds, color: COLORS[4], other: true, cloud: false }, geometry.positions));
    return groups;
  }

  function organismRegions(geometry, organismMap) {
    if (organismMap?.status !== "available" || !Array.isArray(organismMap.organisms)) return null;
    const seen = new Set(), assigned = new Set(), rows = [];
    for (const row of organismMap.organisms) {
      const name = cleanText(row?.name);
      if (!row || !positiveId(row.id) || seen.has(row.id) || !name || name.length > 160
        || !Array.isArray(row.projectIds) || row.projectIds.some(id => !positiveId(id))) return null;
      seen.add(row.id);
      const ids = [...new Set(row.projectIds)].filter(id => geometry.positions.has(id)).sort((a, b) => a - b);
      if (ids.some(id => assigned.has(id))) return null;
      ids.forEach(id => assigned.add(id));
      rows.push({ id: row.id, name, ids });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
    const groups = rows.filter(row => row.ids.length).map((row, index) => cloudRegion({
      key: `organism:${row.id}`, ids: row.ids, name: row.name,
      color: groupColor(index)
    }, geometry.positions));
    const otherIds = [...geometry.positions.keys()].filter(id => !assigned.has(id));
    if (otherIds.length) groups.push(cloudRegion({ key: "organism:other", ids: otherIds, color: COLORS[4], other: true, cloud: false }, geometry.positions));
    return groups;
  }

  function captureState(container) {
    const state = lifecycles.get(container);
    if (!state) return {};
    const focused = container.ownerDocument?.activeElement;
    return { activeProjectId: state.projectId, activeEdgeKey: state.edgeKey, contextProjectId: state.contextProjectId,
      activeTagId: state.tagId, tagExplorerOpen: state.tagExplorer?.open === true,
      cloudMode: state.cloudMode,
      layoutReady: state.layoutReady === true,
      clearEmphasis: state.emphasized === false,
      focusProjectId: container.contains(focused) ? Number(focused?.getAttribute?.("data-similarity-project")) || null : null,
      focusEdgeKey: container.contains(focused) ? focused?.getAttribute?.("data-similarity-edge") : null,
      focusRelationKey: container.contains(focused) ? focused?.getAttribute?.("data-similarity-relation") : null,
      focusTagId: container.contains(focused) ? focused?.getAttribute?.("data-similarity-tag") : null,
      focusTagProjectId: container.contains(focused) ? Number(focused?.getAttribute?.("data-similarity-tag-project")) || null : null,
      focusCloudMode: container.contains(focused) ? focused?.getAttribute?.("data-similarity-cloud-mode") : null,
      focusReplay: container.contains(focused) && focused?.getAttribute?.("data-similarity-replay") === "" };
  }
  function cleanup(container) {
    const state = lifecycles.get(container);
    if (state) { state.live = false; state.dispose?.(); }
    lifecycles.delete(container);
  }

  function render(container, projects, tagMap, options = {}) {
    if (!container?.ownerDocument) return null;
    const retained = options.state || captureState(container);
    cleanup(container);
    const doc = container.ownerDocument, view = doc.defaultView;
    const model = buildModel(projects, tagMap), geometry = layout(model, { recordFrames: true });
    const programmeClouds = programmeRegions(geometry, options.programmeMap);
    const organismClouds = organismRegions(geometry, options.organismMap);
    const grouping = new Map([["programmes", programmeClouds], ["organisms", organismClouds]]);
    const layouts = new Map([["themes", geometry]]);
    const geometryFor = mode => {
      if (!layouts.has(mode)) layouts.set(mode, layout(model, { groups: grouping.get(mode), recordFrames: true }));
      return layouts.get(mode);
    };
    const modeAvailable = mode => mode === "themes" || grouping.has(mode) && grouping.get(mode) !== null;
    const state = { live: true, projectId: null, edgeKey: null, contextProjectId: null, tagId: null,
      cloudMode: modeAvailable(retained.cloudMode) ? retained.cloudMode : "themes" };
    lifecycles.set(container, state);
    const node = (tag, className, text) => { const element = doc.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
    const svgNode = (tag, attributes = {}, text) => { const element = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value); if (text !== undefined) element.textContent = text; return element; };
    const section = node("section", "project-similarity"); section.setAttribute("data-project-similarity", "");
    const header = node("div", "project-similarity-header"); header.append(node("h2", "unit-dico-heading", t("heading")));
    if (model.status === "available" && model.nodes.length) header.append(node("span", "unit-dico-count", t("projectCount", { count: I18n.formatNumber(model.nodes.length) })));
    section.append(header);
    if (model.status !== "available" || !model.nodes.length) {
      section.append(node("p", "unit-dico-caption", t(model.status === "available" ? "empty" : "unavailable")));
      container.replaceChildren(section); return { model, cleanup: () => cleanup(container) };
    }
    const cloudControls = node("fieldset", "project-similarity-cloud-controls"), cloudInputs = new Map();
    cloudControls.append(node("legend", "project-card-sr-only", t("cloudGrouping")));
    const cloudName = `project-similarity-cloud-${++cloudControlId}`;
    for (const mode of ["themes", "programmes", "organisms"]) {
      const control = node("label", "project-similarity-cloud-choice"), input = node("input");
      input.type = "radio"; input.name = cloudName; input.value = mode;
      input.disabled = !modeAvailable(mode);
      input.setAttribute("data-similarity-cloud-mode", mode);
      input.addEventListener("change", () => { if (state.live && input.checked && !input.disabled && state.cloudMode !== mode) switchLayout(mode); });
      control.append(input, node("span", "", t({ themes: "cloudThemes", programmes: "cloudProgrammes", organisms: "cloudOrganism" }[mode])));
      cloudControls.append(control); cloudInputs.set(mode, input);
    }
    header.append(cloudControls);
    const replay = node("button", "project-similarity-replay", t("replay")); replay.type = "button";
    replay.disabled = !geometry.positions.size;
    replay.setAttribute("data-similarity-replay", ""); replay.setAttribute("title", t("replayTitle"));
    header.append(replay);
    const caption = node("p", "unit-dico-caption"); section.append(caption);
    const legend = node("div", "project-similarity-legend");
    section.append(legend);
    const body = node("div", "project-similarity-body"), chart = node("div", "project-similarity-chart"), scroll = node("div", "project-similarity-scroll");
    scroll.setAttribute("tabindex", "0"); scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", t("chartRegion"));
    const svg = svgNode("svg", { viewBox: "0 0 1000 585", class: "project-similarity-svg", role: "group", "aria-label": t("chartTitle") });
    svg.append(svgNode("title", {}, t("chartTitle")));
    const byId = new Map(model.nodes.map(item => [item.id, item])), edgeElements = new Map(), nodeElements = new Map(), tagButtons = new Map(), nodeGraphics = new Map();
    const defs = svgNode("defs"); svg.append(defs);
    const cloudLayer = svgNode("g", { "data-similarity-cloud-layer": "", "aria-hidden": "true", "pointer-events": "none" }); svg.append(cloudLayer);
    const cloudElements = new Map();
    const updateClouds = mode => {
      state.cloudMode = mode;
      for (const [value, input] of cloudInputs) input.checked = value === mode;
      caption.textContent = t({ themes: "caption", programmes: "programmeCloudCaption", organisms: "organismCloudCaption" }[mode]);
      cloudLayer.replaceChildren(); cloudElements.clear();
      legend.replaceChildren(node("strong", "project-similarity-legend-heading", t({ themes: "themeLegend", programmes: "programmeLegend", organisms: "organismLegend" }[mode])));
      defs.replaceChildren();
      const regions = geometryFor(mode).regions;
      for (const region of regions) {
        if (region.cloud !== false) {
          const cloud = svgNode("polygon", { "data-similarity-cloud": region.key,
            points: region.points.map(point => `${point.x},${point.y}`).join(" "), fill: region.color, "fill-opacity": ".065", stroke: region.color,
            "stroke-opacity": ".22", "stroke-width": "1.3", "stroke-linejoin": "round", "aria-hidden": "true", "pointer-events": "none" });
          cloudLayer.append(cloud); cloudElements.set(region.key, cloud);
        }
        const item = node("span", "project-similarity-family"), dot = node("span", "project-similarity-family-dot");
        dot.style.backgroundColor = region.color; dot.setAttribute("aria-hidden", "true");
        let name = mode === "themes" ? region.tags.map(tag => label(model.definitions[tag], tag)).join(" · ")
          : region.other ? t(mode === "organisms" ? "withoutOrganism" : "otherProjects") : region.name;
        if (mode !== "themes") {
          name += ` · ${I18n.t(region.ids.length === 1 ? "timeline.countOne" : "timeline.countMany", { count: I18n.formatNumber(region.ids.length) })}`;
          item.setAttribute("title", t("cloudMembers", { projects: region.ids.map(id => byId.get(id).shortName).join(", ") }));
        }
        item.append(dot, node("span", "", name)); legend.append(item);
      }
      for (const project of model.nodes) {
        const colors = [...new Set(regions.filter(region => region.ids.includes(project.id)).map(region => region.color))];
        let color = colors[0] || project.color;
        if (colors.length > 1) {
          const id = `${cloudName}-project-${project.id}`;
          const gradient = svgNode("linearGradient", { id });
          colors.forEach((value, index) => {
            gradient.append(svgNode("stop", { offset: `${index * 100 / colors.length}%`, "stop-color": value }),
              svgNode("stop", { offset: `${(index + 1) * 100 / colors.length}%`, "stop-color": value }));
          });
          defs.append(gradient); color = `url(#${id})`;
        }
        const graphic = nodeGraphics.get(project.id);
        if (graphic) { graphic.circle.setAttribute("fill", color); graphic.leader.setAttribute("stroke", color); }
      }
    };
    let media = null;
    try { media = view?.matchMedia?.("(prefers-reduced-motion: reduce)"); } catch (_) { /* Static fallback. */ }
    const canAnimate = () => typeof view?.requestAnimationFrame === "function" && typeof view?.cancelAnimationFrame === "function" && !media?.matches;
    let frameHandle = null, generation = 0;
    let currentPositions = new Map();
    const copyPositions = positions => new Map([...positions].map(([id, point]) => [id, { ...point }]));
    const interpolate = (from, to, fraction) => new Map([...to].map(([id, point]) => {
      const start = from.get(id) || point;
      return [id, { x: start.x + (point.x - start.x) * fraction, y: start.y + (point.y - start.y) * fraction }];
    }));
    const stopMotion = () => {
      generation++;
      if (frameHandle != null) view?.cancelAnimationFrame?.(frameHandle);
      frameHandle = null; state.animating = false;
    };
    const paint = (positions, progress = 1) => {
      const target = geometryFor(state.cloudMode);
      const opacity = progress >= 1 ? "1" : progress < .8 ? "0" : String((progress - .8) / .2);
      currentPositions = copyPositions(positions);
      for (const [id, graphic] of nodeGraphics) {
        const point = positions.get(id), finalPoint = target.positions.get(id), box = target.labels.get(id);
        const x = box.x + point.x - finalPoint.x, y = box.y + point.y - finalPoint.y;
        graphic.circle.setAttribute("cx", point.x); graphic.circle.setAttribute("cy", point.y);
        graphic.text.setAttribute("x", x + box.w / 2); graphic.text.setAttribute("y", y + 15);
        graphic.text.setAttribute("opacity", opacity);
        const endX = Math.max(x, Math.min(point.x, x + box.w)), endY = Math.max(y, Math.min(point.y, y + box.h));
        const distance = Math.hypot(endX - point.x, endY - point.y) || 1;
        graphic.leader.setAttribute("x1", point.x + (endX - point.x) * 20 / distance);
        graphic.leader.setAttribute("y1", point.y + (endY - point.y) * 20 / distance);
        graphic.leader.setAttribute("x2", endX); graphic.leader.setAttribute("y2", endY);
        const labelDistance = Math.hypot(x + box.w / 2 - point.x, y + box.h / 2 - point.y);
        const nearerOther = [...target.positions].some(([otherId, other]) => otherId !== id
          && Math.hypot(box.x + box.w / 2 - other.x, box.y + box.h / 2 - other.y) < labelDistance);
        graphic.leader.setAttribute("opacity", !(labelDistance > 50 || nearerOther) ? "0" : opacity);
      }
      for (const edge of model.edges) {
        const a = positions.get(edge.source), b = positions.get(edge.target);
        for (const line of edgeElements.get(edge.key).children) {
          line.setAttribute("x1", a.x); line.setAttribute("y1", a.y); line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
        }
      }
      target.regions.forEach(region => {
        const cloud = cloudElements.get(region.key);
        if (!cloud) return;
        const points = progress >= 1 ? region.points : cloudRegion(region, positions).points;
        cloud.setAttribute("points", points.map(point => `${point.x},${point.y}`).join(" "));
      });
      cloudLayer.setAttribute("opacity", progress >= 1 ? "1" : String(.12 + .88 * progress));
    };
    const finishMotion = () => {
      stopMotion(); paint(geometryFor(state.cloudMode).positions); state.layoutReady = true;
    };
    const animate = (frames, duration, physical = false) => {
      stopMotion(); state.layoutReady = true; state.pointerOwner = null;
      if (!canAnimate() || !geometryFor(state.cloudMode).positions.size || frames.length < 2) { finishMotion(); return; }
      // Contact relaxation can move much farther than a cooled force step.
      // Give each physical segment time proportional to its largest movement,
      // so the final separation cannot flash past in a single display frame.
      const travel = [0];
      for (let index = 1; index < frames.length; index++) {
        const distance = physical ? Math.max(0, ...[...frames[index]].map(([id, point]) => {
          const previous = frames[index - 1].get(id);
          return Math.hypot(point.x - previous.x, point.y - previous.y);
        })) : 1;
        travel.push(travel[index - 1] + distance);
      }
      const token = generation; let start = null;
      state.animating = true; paint(frames[0], 0);
      const tick = timestamp => {
        if (!state.live || generation !== token) return;
        if (start == null) start = timestamp;
        const progress = Math.min(1, Math.max(0, (timestamp - start) / duration));
        if (progress === 1 || !canAnimate()) { finishMotion(); return; }
        const eased = physical ? progress * progress * (3 - 2 * progress) : progress;
        const distance = eased * travel[travel.length - 1];
        let upper = 1;
        while (upper < travel.length - 1 && travel[upper] < distance) upper++;
        const lower = upper - 1, span = travel[upper] - travel[lower];
        paint(interpolate(frames[lower], frames[upper], span > 0 ? (distance - travel[lower]) / span : 1), progress);
        frameHandle = view.requestAnimationFrame(tick);
      };
      frameHandle = view.requestAnimationFrame(tick);
    };
    const switchLayout = mode => {
      const from = copyPositions(currentPositions), target = geometryFor(mode);
      stopMotion(); updateClouds(mode);
      const frames = Array.from({ length: 61 }, (_, index) => interpolate(from, target.positions, 1 - Math.pow(1 - index / 60, 3)));
      animate(frames, 850);
    };
    const motionChanged = () => { if (state.live && media?.matches) finishMotion(); };
    media?.addEventListener?.("change", motionChanged);
    if (!media?.addEventListener) media?.addListener?.(motionChanged);
    state.dispose = () => {
      stopMotion(); media?.removeEventListener?.("change", motionChanged);
      if (!media?.removeEventListener) media?.removeListener?.(motionChanged);
    };
    replay.addEventListener("click", () => { if (state.live) animate(geometryFor(state.cloudMode).frames || [], 2200, true); });
    const details = node("div", "project-similarity-details"), detailContent = node("div", "project-similarity-detail-content"), relationControls = node("div", "project-similarity-relations");
    detailContent.setAttribute("aria-live", "polite"); detailContent.setAttribute("aria-atomic", "true"); details.append(detailContent, relationControls);
    const tagsList = tags => { const list = node("ul", "project-similarity-tags"); tags.forEach(tag => list.append(node("li", "", label(model.definitions[tag], tag)))); return list; };
    const decorate = (projectIds, activeKey = null, activeProjectId = null, activeTagId = null) => {
      const ids = new Set(projectIds);
      state.emphasized = ids.size > 0;
      for (const [id, elements] of nodeElements) for (const element of elements) {
        const opacity = !ids.size || ids.has(id) ? "1" : ".17";
        element.setAttribute("opacity", opacity); element.style.opacity = opacity;
      }
      for (const [key, element] of edgeElements) {
        const edge = model.edges.find(item => item.key === key);
        const active = activeKey ? key === activeKey : activeTagId ? edge.sharedTags.includes(activeTagId)
          : edge.source === activeProjectId || edge.target === activeProjectId;
        element.setAttribute("opacity", !ids.size ? String(.10 + .58 * Math.sqrt(edge.similarity)) : active ? ".9" : ".055");
      }
    };
    const selectTag = tagId => {
      state.tagId = tagId;
      for (const [id, button] of tagButtons) button.setAttribute("aria-pressed", String(id === tagId));
    };
    const openButton = project => { const button = node("button", "project-similarity-open", t("openProject")); button.type = "button"; button.setAttribute("data-similarity-open", String(project.id)); button.addEventListener("click", () => { if (state.live) options.onSelect?.(project.id); }); return button; };
    const showProject = id => {
      if (!state.live || !byId.has(id)) return;
      selectTag(null);
      state.projectId = id; state.edgeKey = null; state.contextProjectId = id;
      const project = byId.get(id), related = model.edges.filter(edge => edge.source === id || edge.target === id).sort((a, b) => b.similarity - a.similarity || a.key.localeCompare(b.key));
      decorate([id, ...related.map(edge => edge.source === id ? edge.target : edge.source)], null, id);
      detailContent.replaceChildren(node("h3", "", project.shortName), node("p", "project-similarity-source-name", project.name), tagsList(project.tags));
      if (typeof options.onSelect === "function") detailContent.append(openButton(project));
      relationControls.replaceChildren(node("h4", "", related.length ? t("relatedProjectsOf", { name: project.shortName }) : t("noSharedTags")));
      for (const edge of related) {
        const other = byId.get(edge.source === id ? edge.target : edge.source), item = node("div", "project-similarity-related");
        const button = node("button", "project-similarity-related-button", other.shortName); button.type = "button";
        button.setAttribute("data-similarity-project", String(other.id)); button.addEventListener("click", () => {
          if (!state.live) return;
          showProject(other.id); nodeElements.get(other.id)?.[0]?.focus?.();
        });
        const relation = node("button", "project-similarity-shared", t("sharedTagsHeading")); relation.type = "button";
        relation.setAttribute("data-similarity-relation", edge.key); relation.setAttribute("data-similarity-edge", edge.key);
        relation.setAttribute("aria-label", t("edgeAria", { first: project.name, second: other.name, tags: edge.sharedTags.map(tag => label(model.definitions[tag], tag)).join(", ") }));
        relation.addEventListener("focus", () => showEdge(edge.key)); relation.addEventListener("click", () => showEdge(edge.key));
        item.append(button, relation, node("p", "", t("sharedTags", { tags: edge.sharedTags.map(tag => label(model.definitions[tag], tag)).join(" · ") }))); relationControls.append(item);
      }
    };
    const showEdge = key => {
      if (!state.live) return;
      const edge = model.edges.find(item => item.key === key); if (!edge) return;
      selectTag(null);
      state.projectId = null; state.edgeKey = key; decorate([edge.source, edge.target], key);
      detailContent.replaceChildren(node("h3", "", `${byId.get(edge.source).shortName} ↔ ${byId.get(edge.target).shortName}`), node("p", "", t("sharedTagsHeading")), tagsList(edge.sharedTags));
      if (![edge.source, edge.target].includes(state.contextProjectId)) { relationControls.replaceChildren(); state.contextProjectId = null; }
    };
    const showDefault = () => {
      if (!state.live) return;
      selectTag(null);
      state.projectId = null; state.edgeKey = null; state.contextProjectId = null; decorate([]);
      relationControls.replaceChildren();
      detailContent.replaceChildren(node("h3", "", t("explore")), node("p", "", t("instructions")), node("p", "project-similarity-note", t("sizeNote")));
    };
    const showTag = tagId => {
      if (!state.live || !tagButtons.has(tagId)) return;
      const matches = model.nodes.filter(project => project.tags.includes(tagId))
        .sort((a, b) => a.shortName.localeCompare(b.shortName, I18n.language()) || a.id - b.id);
      state.projectId = null; state.edgeKey = null; state.contextProjectId = null; selectTag(tagId);
      decorate(matches.map(project => project.id), null, null, tagId);
      details.scrollTop = 0;
      detailContent.replaceChildren(node("h3", "", label(model.definitions[tagId], tagId)),
        node("p", "", t(matches.length === 1 ? "tagProjectOne" : "tagProjectMany", { count: I18n.formatNumber(matches.length) })));
      relationControls.replaceChildren();
      for (const project of matches) {
        const item = node("div", "project-similarity-related");
        const button = node("button", "project-similarity-related-button", project.shortName); button.type = "button";
        button.setAttribute("data-similarity-tag-project", String(project.id)); button.setAttribute("title", project.name);
        button.setAttribute("aria-label", t("projectAria", { name: project.name }));
        button.addEventListener("click", () => {
          if (!state.live) return;
          showProject(project.id); nodeElements.get(project.id)?.[0]?.focus?.();
        });
        item.append(button); relationControls.append(item);
      }
    };
    const wire = (element, show) => {
      element.addEventListener("pointerenter", () => {
        if (!state.live || state.animating) return;
        show(); state.pointerOwner = { element, projectId: state.projectId, edgeKey: state.edgeKey, tagId: state.tagId };
      });
      const interact = () => { if (state.live) { if (state.animating) finishMotion(); show(); } };
      element.addEventListener("focus", interact);
      element.addEventListener("click", () => {
        interact();
        if (state.live) state.pointerOwner = { element, projectId: state.projectId, edgeKey: state.edgeKey, tagId: state.tagId };
      });
      element.addEventListener("pointerleave", () => {
        const owner = state.pointerOwner;
        if (state.live && !state.animating && owner?.element === element && owner.projectId === state.projectId && owner.edgeKey === state.edgeKey && owner.tagId === state.tagId) {
          state.pointerOwner = null; decorate([]);
        }
      });
      element.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { event.preventDefault?.(); show(); } if (event.key === "Escape") showDefault(); });
    };
    for (const edge of model.edges) {
      const a = geometry.positions.get(edge.source), b = geometry.positions.get(edge.target), color = byId.get(edge.source).community === byId.get(edge.target).community ? byId.get(edge.source).color : "#66838b";
      const group = svgNode("g", { "data-similarity-edge": edge.key, tabindex: "-1", role: "button", "aria-label": t("edgeAria", { first: byId.get(edge.source).name, second: byId.get(edge.target).name, tags: edge.sharedTags.map(tag => label(model.definitions[tag], tag)).join(", ") }) });
      group.append(svgNode("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, "stroke-width": .6 + 3.8 * Math.sqrt(edge.similarity), class: "project-similarity-link" }),
        svgNode("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "transparent", "stroke-width": "12", "pointer-events": "stroke" }));
      wire(group, () => showEdge(edge.key)); edgeElements.set(edge.key, group); svg.append(group);
    }
    const addProjectEvents = (element, project) => { element.setAttribute("data-similarity-project", String(project.id)); element.setAttribute("aria-label", t("projectAria", { name: project.name })); wire(element, () => showProject(project.id)); };
    for (const project of model.nodes.filter(item => !model.isolates.includes(item.id))) {
      const position = geometry.positions.get(project.id), bounds = geometry.labels.get(project.id);
      const group = svgNode("g", { role: "button", tabindex: "0", class: "project-similarity-node" }); addProjectEvents(group, project);
      const leader = svgNode("line", { stroke: project.color, "stroke-width": "1", "stroke-dasharray": "3 3", "stroke-opacity": ".5",
        class: "project-similarity-label-leader", "aria-hidden": "true", "pointer-events": "none" });
      const circle = svgNode("circle", { cx: position.x, cy: position.y, r: "17", fill: project.color, stroke: "white", "stroke-width": "3" });
      group.append(leader, svgNode("title", {}, project.name), circle);
      const text = svgNode("text", { x: bounds.x + bounds.w / 2, y: bounds.y + 15, "text-anchor": "middle", class: "project-similarity-label" }, project.shortName);
      group.append(text); nodeElements.set(project.id, [group]); nodeGraphics.set(project.id, { circle, text, leader }); svg.append(group);
    }
    if (geometry.positions.size) { scroll.append(svg); chart.append(scroll); }
    if (model.isolates.length) {
      const isolated = node("div", "project-similarity-isolates"); isolated.append(node("h3", "", t("specialties")), node("p", "", t("isolatesCaption")));
      for (const id of model.isolates) { const project = byId.get(id), button = node("button", "project-similarity-isolated", project.shortName); button.type = "button"; button.style.borderColor = project.color; addProjectEvents(button, project); isolated.append(button); nodeElements.set(id, [button]); }
      chart.append(isolated);
    }
    body.append(chart, details); section.append(body);
    const all = node("details", "project-similarity-accessible"); all.append(node("summary", "", t("exploreByTag")));
    all.open = retained.tagExplorerOpen === true; state.tagExplorer = all;
    const list = node("div", "project-similarity-tag-list");
    const tagCounts = new Map();
    for (const project of model.nodes) for (const tagId of project.tags) tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
    const tags = [...tagCounts.keys()]
      .sort((a, b) => tagCounts.get(b) - tagCounts.get(a)
        || label(model.definitions[a], a).localeCompare(label(model.definitions[b], b), I18n.language()) || a.localeCompare(b));
    for (const tagId of tags) {
      const button = node("button", "project-similarity-tag-button", label(model.definitions[tagId], tagId)); button.type = "button";
      button.setAttribute("data-similarity-tag", tagId); button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", t("tagAria", { tag: label(model.definitions[tagId], tagId) }));
      button.addEventListener("click", () => { if (state.live) { if (state.animating) finishMotion(); showTag(tagId); } });
      button.addEventListener("keydown", event => { if (event.key === "Escape") showDefault(); });
      tagButtons.set(tagId, button); list.append(button);
    }
    all.append(list); section.append(all, node("p", "project-similarity-note", t("methodNote")));
    container.replaceChildren(section); updateClouds(state.cloudMode);
    if (retained.layoutReady) finishMotion();
    else animate(geometryFor(state.cloudMode).frames || [], 2200, true);
    showDefault();
    if (positiveId(retained.contextProjectId)) showProject(retained.contextProjectId);
    if (typeof retained.activeTagId === "string" && tagButtons.has(retained.activeTagId)) showTag(retained.activeTagId);
    else if (positiveId(retained.activeProjectId)) showProject(retained.activeProjectId);
    else if (typeof retained.activeEdgeKey === "string") showEdge(retained.activeEdgeKey);
    const relationFocus = retained.focusRelationKey && Array.from(relationControls.querySelectorAll("[data-similarity-relation]"))
      .find(element => element.getAttribute("data-similarity-relation") === retained.focusRelationKey);
    const tagProjectFocus = retained.focusTagProjectId && Array.from(relationControls.querySelectorAll("[data-similarity-tag-project]"))
      .find(element => Number(element.getAttribute("data-similarity-tag-project")) === retained.focusTagProjectId);
    const cloudFocus = retained.focusCloudMode && (cloudInputs.get(retained.focusCloudMode) || cloudInputs.get("themes"));
    const focused = (retained.focusReplay && replay) || (cloudFocus && (cloudFocus.disabled ? cloudInputs.get("themes") : cloudFocus)) || tagButtons.get(retained.focusTagId) || tagProjectFocus || relationFocus
      || (retained.focusProjectId ? nodeElements.get(retained.focusProjectId)?.[0] : edgeElements.get(retained.focusEdgeKey));
    if (retained.focusTagId && tagButtons.has(retained.focusTagId)) all.open = true;
    focused?.focus?.();
    if (retained.clearEmphasis) decorate([]);
    return { model, get geometry() { return geometryFor(state.cloudMode); }, cleanup: () => cleanup(container) };
  }

  return { buildModel, layout, render, cleanup, captureState };
});
