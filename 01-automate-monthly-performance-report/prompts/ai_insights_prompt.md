# AI Insights prompt

Used in the **AI Insights** node (Google Gemini). The `{{ $json.… }}` placeholders are n8n expressions. They are filled with fact lists that the *Calculate KPIs* script has already worked out, so the model never calculates a figure itself.

The output is six tagged sections. The *Build HTML Report* script parses them into the one-line insight under each chart and the recommended actions in the email.

## Example of the facts the model receives

```
CATEGORY FACTS:
- Largest category: Electronics with 1,021,390 (78.3% of net revenue), share +10.3 pts vs Nov 2024.
- Categories ranked: Electronics 78.3%; Clothing 21.7%.
- Biggest revenue gain vs Nov 2024: Electronics (+438,420). No category declined.
```

Every number in the final email comes from lines like these. The prompt tells the model to use only what it is given.

## Prompt

```
Write the monthly performance commentary for {{ $json.report_month_label }} compared with {{ $json.prev_month_label }}.

KPI FACTS:
{{ $json.kpi_facts }}

TREND FACTS (net revenue by month chart):
{{ $json.trend_facts }}

CATEGORY FACTS (net revenue by category pie chart):
{{ $json.category_facts }}

SUBCATEGORY FACTS (top 5 subcategories chart):
{{ $json.subcategory_facts }}

STORE FACTS (net revenue by store chart):
{{ $json.store_facts }}

Answer in exactly this format, with each tag on its own line and in this order:

[KPI]
One sentence, maximum 25 words. Start with "This month," and highlight net revenue, orders, their changes and the main supported driver.

[TREND]
One sentence, maximum 25 words. Start with the reporting month or "Revenue". Explain the month's ranking and comparison with the monthly average.

[CATEGORY]
One sentence, maximum 25 words. Start with the leading category name. Highlight its revenue share and the biggest mover.

[SUBCATEGORY]
One sentence, maximum 25 words. Start with the leading subcategory name. Explain its share and how concentrated the top five are.

[STORE]
One sentence, maximum 25 words. Start with the leading store name. Include its revenue share, the number of declining stores and the biggest decliner.

[ACTIONS]
Exactly 3 lines, each starting with "- ", maximum 15 words per line. Start each recommendation with a verb and bold the relevant store, category or metric.

IMPORTANT:
- Every insight must begin with words, not numbers.
- Bold 2–3 important figures in each insight where available.
- Use only the supplied facts without inventing or recalculating figures.
- Keep the output concise, natural and decision-focused.
- Return only the six tagged sections with no additional explanation.
```

## Design notes

- **Fixed tags** (`[KPI]`, `[TREND]`, …) let the report script split the output reliably. A missing section is skipped, not an error.
- **One sentence per section** keeps each insight readable in a few seconds inside the email.
- **Facts supplied, not calculated.** The "use only the supplied facts" rule stops the model from inventing or recalculating numbers.
- **`**bold**` markers** are converted to `<strong>` by the report script, so key figures stand out.
