/** Read-only schema audit. Run with Node 22:
 * node --env-file=.env.local scripts/audit-dashboard-schema.mjs
 * It validates literal SELECTs and mutation column names, fetching zero rows.
 * It does not exercise RLS, dynamic filters, or browser interactions.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const checks = new Map();
let pages = 0;
function tableFor(expression) {
  let node = expression;
  while (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    if (node.expression.name.text === "from" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) return node.arguments[0].text;
    node = node.expression.expression;
  }
}
function visitFile(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const table = tableFor(node.expression.expression);
      const arg = node.arguments[0];
      const method = node.expression.name.text;
      let columns;
      if (table && arg && method === "select" && ts.isStringLiteral(arg)) columns = arg.text;
      if (table && arg && ["update", "insert", "upsert"].includes(method) && ts.isObjectLiteralExpression(arg)) {
        columns = arg.properties.flatMap(p => !ts.isSpreadAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? [p.name.text] : []).join(",");
      }
      if (columns) {
        const key = `${table}:${columns}`;
        const check = checks.get(key) ?? { table, columns, files: new Set() };
        check.files.add(file);
        checks.set(key, check);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file)) {
      if (entry.name === "page.tsx") pages++;
      visitFile(file);
    }
  }
}
for (const dir of ["app/(member)", "app/(pastor)", "app/(admin)"]) walk(dir);
let failures = 0;
const jobs = [...checks.values()];
for (let i = 0; i < jobs.length; i += 8) {
  await Promise.all(jobs.slice(i, i + 8).map(async check => {
    const { error } = await db.from(check.table).select(check.columns).limit(0);
    if (error) {
      failures++;
      console.error(`${check.table}: ${error.code} ${error.message}\n  ${[...check.files].join("\n  ")}`);
    }
  }));
}
console.log(`Audited ${jobs.length} query/column combinations across ${pages} dashboard pages: ${failures} failures.`);
process.exitCode = failures ? 1 : 0;
