"use strict";

const docRules = require('@lumjs/build/jsdoc-rules');
const ourRules = docRules
  .rootReadme
  //.docsReadme
  //.srcDocs
  .singleFile
  .clone(); 

module.exports = ourRules;