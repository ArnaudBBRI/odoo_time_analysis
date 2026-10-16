"use strict";
const I18n = require("../i18n");
for (const file of ["i18n-core-messages", "i18n-shell-messages", "i18n-project-messages", "i18n-timeline-messages", "i18n-steering-messages", "i18n-server-messages"]) {
  require("../" + file);
}
I18n.setLanguage("fr");
module.exports = I18n;
