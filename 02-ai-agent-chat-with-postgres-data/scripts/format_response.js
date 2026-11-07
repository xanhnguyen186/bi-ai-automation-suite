// ============================================
// 1. COLOUR PALETTES
// ============================================

// Sequential: light green -> dark emerald
const ORDINAL_PALETTE = [
  '#D8F0AA',
  '#A7DE9C',
  '#7FBD8E',
  '#629C84',
  '#3C7778',
  '#275760',
  '#1B3F4E'
];

// Categorical: pink -> purple -> blue -> mint
const CATEGORICAL_PALETTE = [
  '#D99FC2',
  '#9F8DBE',
  '#7A7BB6',
  '#819ACB',
  '#87CBE1',
  '#84C9CC',
  '#76BFB6',
  '#6FBC9F'
];

const PRIMARY_COLOR = '#275760';
const MAX_POINTS = 20;


// ============================================
// 2. READ AI AGENT OUTPUT
// ============================================

let out = $input.first().json.output;

if (typeof out === 'string') {
  const cleaned = out.trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  try {
    out = JSON.parse(cleaned);
  } catch (e) {
    out = {
      response: out,
      visualization: null
    };
  }
}

out = out || {};

const text = String(
  out.response || 'Sorry, I could not produce an answer.'
).trim();

const viz = out.visualization;


// ============================================
// 3. VALIDATE CHART DATA
// ============================================

const valid = viz &&
  ['bar', 'line', 'pie'].includes(viz.type) &&
  Array.isArray(viz.labels) &&
  Array.isArray(viz.values) &&
  viz.labels.length === viz.values.length &&
  viz.labels.length >= 2 &&
  viz.labels.length <= MAX_POINTS &&
  viz.values.every(v =>
    typeof v === 'number' && Number.isFinite(v)
  );

if (!valid) {
  return [{ json: { output: text } }];
}


// ============================================
// 4. DETERMINE COLOUR MODE
// ============================================

const title = String(viz.title || '');
const isPie = viz.type === 'pie';

// Identify ranking-related bar charts
const isRanking = viz.type === 'bar' &&
  /top\s*\d*|bottom\s*\d*|rank|highest|lowest|best|worst|most|least|leading/i
    .test(title);

// Optional explicit mode, otherwise automatic
const colorMode =
  ['ordinal', 'categorical'].includes(viz.color_mode)
    ? viz.color_mode
    : isRanking
      ? 'ordinal'
      : 'categorical';


// ============================================
// 5. COLOUR INTERPOLATION
// ============================================

// Interpolate between two HEX colours
function interpolateHex(a, b, t) {
  const channels = [1, 3, 5].map(i => {
    const start = parseInt(a.slice(i, i + 2), 16);
    const end = parseInt(b.slice(i, i + 2), 16);

    return Math.round(start + (end - start) * t)
      .toString(16)
      .padStart(2, '0');
  });

  return '#' + channels.join('');
}

// t = 0: darkest emerald
// t = 1: lightest green
function sequentialColor(t) {
  const stops = [...ORDINAL_PALETTE].reverse();

  const position = Math.max(0, Math.min(1, t)) *
    (stops.length - 1);

  const index = Math.min(
    Math.floor(position),
    stops.length - 2
  );

  return interpolateHex(
    stops[index],
    stops[index + 1],
    position - index
  );
}


// ============================================
// 6. ASSIGN CHART COLOURS
// ============================================

let colors;

if (colorMode === 'ordinal') {

  // Rank values descending.
  // Highest values receive darkest colours.
  const uniqueValues = [...new Set(viz.values)]
    .sort((a, b) => b - a);

  colors = viz.values.map(value => {
    const rank = uniqueValues.indexOf(value);

    const t = uniqueValues.length === 1
      ? 0
      : rank / (uniqueValues.length - 1);

    return sequentialColor(t);
  });

} else {

  // Distinct categorical colours
  colors = viz.labels.map((_, i) =>
    CATEGORICAL_PALETTE[
      i % CATEGORICAL_PALETTE.length
    ]
  );

}


// ============================================
// 7. BUILD CHART.JS V2 DATASET
// ============================================

const dataset = isPie
  ? {
      data: viz.values,
      backgroundColor: colors,
      borderColor: '#FFFFFF',
      borderWidth: 2
    }

  : viz.type === 'line'
    ? {
        data: viz.values,
        borderColor: PRIMARY_COLOR,
        backgroundColor: 'rgba(39,87,96,0.15)',
        pointBackgroundColor: PRIMARY_COLOR,
        pointRadius: 3,
        borderWidth: 2,
        fill: true,
        lineTension: 0.25
      }

    : {
        data: viz.values,
        backgroundColor: colors,
        borderWidth: 0
      };


// ============================================
// 8. CHART OPTIONS
// ============================================

const options = {
  title: {
    display: !!title,
    text: title,
    fontSize: 16
  },

  legend: {
    display: isPie,
    position: 'right'
  },

  plugins: {
    datalabels: {
      display: isPie,
      color: '#FFFFFF',
      font: {
        weight: 'bold'
      }
    }
  }
};

if (!isPie) {
  options.scales = {
    xAxes: [{
      scaleLabel: {
        display: !!viz.x_label,
        labelString: String(viz.x_label || '')
      }
    }],

    yAxes: [{
      ticks: {
        beginAtZero: true
      },
      scaleLabel: {
        display: !!viz.y_label,
        labelString: String(viz.y_label || '')
      }
    }]
  };
}


// ============================================
// 9. FORMAT DATABASE LABELS
// ============================================

// Example: bed_bath_table -> Bed Bath Table
const pretty = l => String(l)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase());


// ============================================
// 10. BUILD QUICKCHART CONFIG
// ============================================

const config = {
  type: viz.type,

  data: {
    labels: viz.labels.map(pretty),
    datasets: [dataset]
  },

  options
};


// ============================================
// 11. GENERATE QUICKCHART URL
// ============================================

// Encode parentheses for Markdown compatibility
const encoded = encodeURIComponent(
  JSON.stringify(config)
)
  .replace(/\(/g, '%28')
  .replace(/\)/g, '%29');

const url =
  'https://quickchart.io/chart' +
  '?v=2&w=640&h=360&bkg=white&c=' +
  encoded;


// ============================================
// 12. RETURN CHAT RESPONSE
// ============================================

const alt = (title || 'Chart')
  .replace(/[\[\]]/g, '');

return [{
  json: {
    output:
      text +
      '\n\n![' + alt + '](' + url + ')'
  }
}];
