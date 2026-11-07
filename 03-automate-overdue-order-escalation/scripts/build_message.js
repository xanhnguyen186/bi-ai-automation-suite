const ROUTE_NODE = 'Route and Rank';
const TEST_MODE = true;                 // true = send everything to TEST_EMAIL instead of the owner
const TEST_EMAIL = 'YOUR_EMAIL_HERE';

const g = $(ROUTE_NODE).item.json;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const summary = esc(($json.text || $json.output || '').replace(/\*\*/g, '').trim());
const color = { Critical: '#C0392B', High: '#D68910', Normal: '#6B7280' };

const rows = g.top_orders.map(o =>
  '<tr><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-family:monospace">' + esc(o.order_id.slice(0, 8)) + '…</td>' +
  '<td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">' + esc(o.state) + '</td>' +
  '<td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">' + o.days_overdue + '</td>' +
  '<td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">' + o.value.toFixed(2) + '</td>' +
  '<td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;color:' + color[o.severity] + ';font-weight:700">' + o.severity + '</td></tr>').join('');

const th = 'padding:6px 8px;text-align:left;font-size:12px;color:#6B7280;border-bottom:2px solid #E5E7EB';
const html =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;font-size:14px;color:#1F2937;line-height:1.5">' +
'<p style="margin:0 0 4px;font-weight:700;font-size:16px">' + esc(g.owner_team) + ' &middot; ' + g.total + ' overdue orders &middot; ' + esc(g.as_of_date) + '</p>' +
'<p style="margin:0 0 12px;color:#6B7280">' + g.critical + ' critical &middot; ' + g.high + ' high &middot; ' + g.normal + ' normal</p>' +
'<p style="margin:0 0 12px">' + summary + '</p>' +
'<p style="margin:0 0 12px;padding:10px;background:#F6F8FA;border-radius:6px"><b>Respond within ' + esc(g.sla_hours) + ' h.</b> First action: ' + esc(g.first_action) + '.</p>' +
'<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px"><tr>' +
'<th style="' + th + '">Order</th><th style="' + th + '">State</th><th style="' + th + ';text-align:right">Days overdue</th><th style="' + th + ';text-align:right">Value</th><th style="' + th + '">Severity</th></tr>' + rows + '</table>' +
'<p style="margin:12px 0 0;font-size:12px;color:#6B7280">Top ' + g.top_orders.length + ' of ' + g.total + ' orders. Full list in the exception log.</p></div>';

return { json: { to: TEST_MODE ? TEST_EMAIL : g.to, subject: g.subject, html } };
