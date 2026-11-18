const { readFileSync } = require("node:fs");
// Secrets are mounted by the operator, never supplied at build time.
if (process.env.APP_ENV !== "production") throw new Error("Production environment required");
const secret = readFileSync("/run/secrets/bff_secret", "utf8").trim();
if (secret.length < 32 || secret.startsWith("replace_")) throw new Error("Invalid production BFF secret");
process.env.AUTH_BFF_SECRET = secret;
require("./server.js");
