// n8n Code node (JavaScript) - mode: "Run Once for All Items" - sits after the SQL-query-Generator.
// Checks the generated SQL before it reaches the database. Output: one item { sql, valid, unsupported, reason }.
// The "Valid?" IF node should test {{ $json.valid }}. This is a safety net; the real protection is a read-only database user.

const ALLOWED = ['orders', 'customers', 'order_items', 'products', 'product_category_name_translation'];
const MAX_ROWS = 100;

// 1. Get the SQL text (different LLM nodes name the field differently)
const first = $input.first().json;
let sql = String(first.text || first.output || first.sql || '').trim();
sql = sql.replace(/^```(?:sql)?/i, '').replace(/```$/, '').trim();   // strip code fences if the model added them
sql = sql.replace(/;+\s*$/, '').trim();                              // drop the final semicolon

const fail = (reason) => [{ json: { sql, valid: false, unsupported: false, reason } }];

if (!sql) return fail('Empty query');

// 2. The model may say it cannot answer: pass that through as a normal result, not an error
if (/^SELECT\s+'UNSUPPORTED/i.test(sql)) {
  return [{ json: { sql, valid: false, unsupported: true, reason: sql.replace(/^SELECT\s+'|'\s+AS\s+error$/gi, '') } }];
}

// 3. Must be a single read-only statement
if (!/^(SELECT|WITH)\b/i.test(sql)) return fail('Query must start with SELECT or WITH');
if (sql.includes(';')) return fail('Only one statement is allowed');
if (/--|\/\*/.test(sql)) return fail('Comments are not allowed');

// 4. Block anything that writes, changes settings or reads system objects
const blocked = /\b(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT|CREATE|GRANT|REVOKE|COPY|CALL|EXECUTE|DO|SET|VACUUM|MERGE|INTO|LOCK|REINDEX)\b|\bpg_\w+|information_schema|current_setting|set_config/i;
const hit = sql.match(blocked);
if (hit) return fail('Blocked keyword: ' + hit[0]);

// 5. Only the allowed tables/views (plus the query's own WITH names)
const cteNames = [...sql.matchAll(/(?:\bWITH|,)\s*([a-z_][a-z0-9_]*)\s+AS\s*\(/gi)].map(m => m[1].toLowerCase());
const scan = sql.replace(/\b(?:EXTRACT|DATE_PART|SUBSTRING|TRIM)\s*\([^()]*\)/gi, ' ');   // FROM inside EXTRACT(...) is not a table
const used = [...scan.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_.]*)/gi)].map(m => m[1].toLowerCase());
const bad = used.filter(n => !ALLOWED.includes(n) && !cteNames.includes(n));
if (bad.length) return fail('Not an allowed table or view: ' + bad[0]);

// 6. Cap the number of rows
if (!/\bLIMIT\s+\d+\s*$/i.test(sql)) sql = 'SELECT * FROM (' + sql + ') AS q LIMIT ' + MAX_ROWS;

return [{ json: { sql, valid: true, unsupported: false, reason: '' } }];
