// n8n Code node (JavaScript) - "Run Once for All Items" - name it "Route and Rank".
// Joins each overdue order to its rule in the escalation sheet, sets severity, groups by owner, ranks, and builds the facts for the LLM.
// Output: one item per owner team (or one item with has_exceptions=false when nothing is overdue).
const SQL_NODE = 'Execute a SQL query';   // <- exact name of your Postgres node
const RULES_NODE = 'Escalation Rules';    // <- exact name of your Google Sheets read node
const TOP_N = 10;

const rows = $(SQL_NODE).all().map(i => i.json).filter(r => r.order_id);
if (rows.length === 0) return [{ json: { has_exceptions: false } }];

const rules = {};
for (const r of $(RULES_NODE).all().map(i => i.json)) rules[String(r.exception_type).trim()] = r;

const LABEL = { SELLER_HANDOVER_OVERDUE: 'past the seller handover deadline', DELIVERY_OVERDUE: 'past the estimated delivery date' };
const RANK = { Critical: 0, High: 1, Normal: 2 };
const groups = {};

for (const r of rows) {
  const rule = rules[r.exception_type] || {};
  const days = Number(r.days_overdue);
  const sev = days >= Number(rule.critical_days || 7) ? 'Critical' : days >= Number(rule.high_days || 3) ? 'High' : 'Normal';
  const team = rule.owner_team || 'Unassigned';
  const g = groups[team] || (groups[team] = { team, email: rule.owner_email || '', type: r.exception_type, sla: rule.response_sla_hours || '', action: rule.first_action || '', orders: [] });
  g.orders.push({ order_id: r.order_id, state: r.state, seller_id: r.seller_id, value: Number(r.value), days_overdue: days, severity: sev, exception_type: r.exception_type });
}

const countBy = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
const asOf = rows[0].as_of_date;
const out = [];

for (const g of Object.values(groups)) {
  g.orders.sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.days_overdue - a.days_overdue || b.value - a.value);
  const n = g.orders.length;
  const sev = s => g.orders.filter(o => o.severity === s).length;
  const top = g.orders.slice(0, TOP_N);
  const states = countBy(g.orders, o => o.state).slice(0, 3).map(([k, v]) => k + ' ' + v).join(', ');
  const sellers = countBy(g.orders.filter(o => o.severity !== 'Normal'), o => o.seller_id).slice(0, 2).map(([k, v]) => k.slice(0, 6) + '… ' + v + ' orders').join(', ') || 'none';
  const worst = g.orders[0];
  const label = LABEL[g.type] || 'overdue';
  const top_sev = sev('Critical') ? 'Critical' : sev('High') ? 'High' : 'Normal';
  out.push({ json: {
    has_exceptions: true,
    owner_team: g.team, to: g.email, as_of_date: asOf, severity: top_sev,
    total: n, critical: sev('Critical'), high: sev('High'), normal: sev('Normal'),
    sla_hours: g.sla, first_action: g.action, label,
    subject: '[' + top_sev.toUpperCase() + '] ' + g.team + ': ' + n + (n === 1 ? ' order ' : ' orders ') + label + ' (as of ' + asOf + ')',
    top_orders: top,
    all_orders: g.orders.map(o => ({ ...o, owner_team: g.team, as_of_date: asOf, status: 'open' })),
    facts: [
      g.team + ' has ' + n + (n === 1 ? ' order ' : ' orders ') + label + ' as of ' + asOf + ': ' + sev('Critical') + ' critical, ' + sev('High') + ' high, ' + sev('Normal') + ' normal.',
      'Most affected states: ' + states + '.',
      'Sellers behind the most serious cases: ' + sellers + '.',
      'Worst order: ' + worst.order_id.slice(0, 6) + '… in ' + worst.state + ', ' + worst.days_overdue + ' days overdue, value ' + worst.value.toFixed(2) + '.',
      'Response due within ' + g.sla + ' hours. Standard first action: ' + g.action + '.'
    ].join('\n')
  } });
}
return out;
