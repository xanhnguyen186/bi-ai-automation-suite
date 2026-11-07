// n8n Code node (JavaScript) - mode: "Run Once for All Items" - name it "Prepare Log".
// Turns every overdue order into one row for the Google Sheets exception log.
// Reads the data from the Route node by name, so it works wherever you connect it.
const ROUTE_NODE = 'Route & Rank';   // <- exact name of your routing Code node

const rows = [];
for (const item of $(ROUTE_NODE).all()) {
  for (const o of item.json.all_orders || []) {
    rows.push({ json: { as_of_date: o.as_of_date, order_id: o.order_id, exception_type: o.exception_type, owner_team: o.owner_team,
                        severity: o.severity, days_overdue: o.days_overdue, state: o.state, seller_id: o.seller_id, value: o.value, status: o.status } });
  }
}
if (rows.length === 0) throw new Error('Prepare Log found no orders. Check ROUTE_NODE matches the routing node name.');
return rows;
