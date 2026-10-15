"use strict";

function unitFixture() {
  return {
    definitions: {
      "project.project": { id: { type: "integer" }, name: { type: "char" }, display_name: { type: "char" },
        lead_unit_id: { string: "Lead Unit", type: "many2one", relation: "hr.department" },
        date_start: { type: "date" }, date: { type: "date" },
        user_id: { type: "many2one", relation: "res.users" } },
      "res.users": { id: { type: "integer" }, name: { type: "char" }, image_128: { type: "binary" } }
    },
    records: {
      "project.project": [
        { id: 11, name: "Fictional North project", display_name: "[54250011] Fictional North project", lead_unit_id: [206, "Fictional DiCo"], date_start: "2025-12-01", date: "2028-05-31", user_id: [21, "Alex Example"], active: false },
        { id: 12, name: "Fictional South project", lead_unit_id: [206, "Fictional DiCo"], date_start: "2026-02-01", date: "2027-06-30", user_id: [22, "Sam Example"], effective_hours: 0 },
        { id: 13, name: "Foreign unit project", lead_unit_id: [207, "Fictional DiCo lookalike"], date_start: "1900-01-01", date: "2200-01-01", user_id: [23, "Foreign manager"] },
        { id: 14, name: "Interne", display_name: "[54250000] Interne", lead_unit_id: [206, "Fictional DiCo"], date_start: "1900-01-01", date: "2200-01-01", user_id: [24, "Hidden manager"] },
        { id: 15, name: "54250000 - Overhead", lead_unit_id: [206, "Fictional DiCo"], date_start: "1900-01-01", date: "2200-01-01", user_id: [24, "Hidden manager"] }
      ],
      "res.users": [{ id: 21, name: "Alex Example", image_128: false }, { id: 22, name: "Sam Example", image_128: false },
        { id: 23, name: "Foreign manager", image_128: false }, { id: 24, name: "Hidden manager", image_128: false }]
    }
  };
}

module.exports = { unitFixture };
