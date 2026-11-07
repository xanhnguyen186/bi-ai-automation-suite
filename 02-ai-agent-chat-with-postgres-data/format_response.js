// n8n Code node (JavaScript) - mode: "Run Once for All Items" - the "Format Response" node, right after the AI Agent.
// Takes the agent's structured answer { response, visualization } and returns { output }:
// the answer text, plus the chart as a Markdown image (a QuickChart picture) when the agent supplied chart data.
// The n8n chat window shows the "output" field of the last node, and displays Markdown images inline.

const PALETTE = ['#4E79A7', '#F28E2B', '#59A14F', '#E15759', '#76B7B2', '#EDC948', '#B07AA1', '#9C755F', '#BAB0AC', '#FF9DA7'];
const MAX_POINTS = 20;

// 1. Read the agent's answer (the parser puts it in `output`; fall back to text in case the parser is off)
let out = $input.first().json.output;
if (typeof out === 'string') {
  const cleaned = out.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { out = JSON.parse(cleaned); } catch (e) { out = { response: out, visualization: null }; }
}
out = out || {};
const text = String(out.response || 'Sorry, I could not produce an answer.').trim();
const viz = out.visualization;

// 2. Only draw a chart when the data is usable
const valid = viz && ['bar', 'line', 'pie'].includes(viz.type)
  && Array.isArray(viz.labels) && Array.isArray(viz.values)
  && viz.labels.length === viz.values.length
  && viz.labels.length >= 2 && viz.labels.length <= MAX_POINTS
  && viz.values.every(v => typeof v === 'number' && isFinite(v));
if (!valid) return [{ json: { output: text } }];

// 3. Build the QuickChart (Chart.js v2) config
const title = String(viz.title || '');
const isPie = viz.type === 'pie';
const dataset = isPie
  ? { data: viz.values, backgroundColor: viz.labels.map((_, i) => PALETTE[i % PALETTE.length]) }
  : viz.type === 'line'
    ? { data: viz.values, borderColor: PALETTE[0], backgroundColor: 'rgba(78,121,167,0.15)', fill: true, lineTension: 0.25 }
    : { data: viz.values, backgroundColor: PALETTE[0] };

const options = {
  title: { display: !!title, text: title, fontSize: 16 },
  legend: { display: isPie, position: 'right' },
  plugins: { datalabels: { display: isPie, color: '#fff', font: { weight: 'bold' } } }
};
if (!isPie) {
  options.scales = {
    xAxes: [{ scaleLabel: { display: !!viz.x_label, labelString: String(viz.x_label || '') } }],
    yAxes: [{ ticks: { beginAtZero: true }, scaleLabel: { display: !!viz.y_label, labelString: String(viz.y_label || '') } }]
  };
}
// Readable labels: bed_bath_table -> Bed Bath Table (database names use underscores)
const pretty = l => String(l).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const config = { type: viz.type, data: { labels: viz.labels.map(pretty), datasets: [dataset] }, options };

// 4. Make the URL safe inside Markdown: encodeURIComponent leaves ( ) unencoded, which would end the image early
const encoded = encodeURIComponent(JSON.stringify(config)).replace(/\(/g, '%28').replace(/\)/g, '%29');
const url = 'https://quickchart.io/chart?v=2&w=640&h=360&bkg=white&c=' + encoded;

const alt = (title || 'Chart').replace(/[\[\]]/g, '');
return [{ json: { output: text + '\n\n![' + alt + '](' + url + ')' } }];
