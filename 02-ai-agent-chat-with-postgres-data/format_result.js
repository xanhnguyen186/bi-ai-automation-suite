// n8n Code node (JavaScript) - mode: "Run Once for All Items" - the "Format Result" node.
// Both branches of "Valid?" feed this node. It returns ONE item for the agent, and the same item is logged to Google Sheets.
// Output: { status, message, result, row_count, sql, question, logged_at }
// IMPORTANT: on the Postgres node, Settings > turn ON "Always Output Data", so a query with zero rows still reaches this node.

const TRIGGER_NODE = 'When Executed by Another Workflow';   // name of your sub-workflow trigger node
const QUESTION_FIELD = 'question';                          // the input field you defined on that trigger
const VALIDATION_NODE = 'Query Validation';                 // name of the validation node
const MAX_ROWS_TO_AGENT = 50;                               // keep the answer short enough for the agent

const v = $(VALIDATION_NODE).first().json;
let question = '';
try { question = String($(TRIGGER_NODE).first().json[QUESTION_FIELD] || ''); } catch (e) {}

const out = { status: '', message: '', result: '', row_count: 0, sql: v.sql || '', question, logged_at: new Date().toISOString() };

if (!v.valid) {
  // Branch FALSE: the query never ran
  if (v.unsupported) {
    out.status = 'unsupported';
    out.message = 'This information is not available in the database. Tell the user you do not have this data. Do not guess.';
  } else {
    out.status = 'blocked';
    out.message = 'The query was not run (' + (v.reason || 'failed validation') + '). Ask the user to rephrase the question, or say you cannot answer it.';
  }
  return [{ json: out }];
}

// Branch TRUE: rows came back from Postgres. Drop the empty placeholder item that "Always Output Data" creates.
const rows = $input.all().map(i => i.json).filter(r => r && Object.keys(r).length > 0);
out.row_count = rows.length;

if (rows.length === 0) {
  out.status = 'no_rows';
  out.message = 'The query ran but returned no rows. Tell the user there is no data for that question or period.';
  return [{ json: out }];
}

const shown = rows.slice(0, MAX_ROWS_TO_AGENT);
out.status = 'ok';
out.result = JSON.stringify(shown);
out.message = rows.length > shown.length
  ? 'Showing the first ' + shown.length + ' of ' + rows.length + ' rows. Use only these figures in your answer.'
  : 'Use only these figures in your answer.';
return [{ json: out }];
