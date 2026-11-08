# Business Intelligence & AI Automation Suite

Three n8n workflows built on public retail and e-commerce data. They cover the loop a data or operations team runs every day: **report** on performance, **answer** questions about the data, and **flag** problems to the people who can fix them.

## Explore the solutions

<table>
  <tr>
    <td width="300" valign="top">
      <a href="01-automate-monthly-performance-report/"><img src="01-automate-monthly-performance-report/docs/thumbnail.png" width="280" alt="Executive report email"></a>
    </td>
    <td valign="top">
      <h3>01 / Automate Monthly Retail Performance Reports with Google Sheets, GPT-5 &amp; Gmail Approval</h3>
      <p>Automatically transforms retail performance data into a designed monthly email with KPIs, charts and AI-written commentary. A reviewer approves it before it is sent.</p>
      <p><b>Output:</b> Executive email report<br>
      <b>Stack:</b> n8n, Google Sheets, Python, OpenAI, QuickChart, Gmail</p>
      <p><a href="01-automate-monthly-performance-report/">Read the case study &rarr;</a></p>
    </td>
  </tr>
  <tr>
    <td width="300" valign="top">
      <a href="02-ai-agent-chat-with-postgres-data/"><img src="02-ai-agent-chat-with-postgres-data/docs/thumbnail.png" width="280" alt="Analytics assistant answer with chart"></a>
    </td>
    <td valign="top">
      <h3>02 / AI Agent to Chat with E-commerce Sales &amp; Delivery Data using Text-to-SQL, Supabase &amp; OpenAI</h3>
      <p>Lets internal teams explore order and delivery data through natural-language questions. The model writes the SQL, a validation layer checks it, and the answer comes back with a chart.</p>
      <p><b>Output:</b> Conversational insights<br>
      <b>Stack:</b> n8n, Supabase (PostgreSQL), text-to-SQL, OpenAI</p>
      <p><a href="02-ai-agent-chat-with-postgres-data/">Read the case study &rarr;</a></p>
    </td>
  </tr>
  <tr>
    <td width="300" valign="top">
      <a href="03-automate-overdue-order-escalation/"><img src="03-automate-overdue-order-escalation/docs/thumbnail.png" width="280" alt="Overdue order alert email"></a>
    </td>
    <td valign="top">
      <h3>03 / Automate Overdue Order Detection &amp; Team Escalation with PostgreSQL, Google Sheets &amp; AI Alerts</h3>
      <p>Finds overdue orders every day, works out who owns the fix using an escalation table, and sends each team a short prioritised list. Every flagged order is logged for follow-up.</p>
      <p><b>Output:</b> Operational alerts and an exception log<br>
      <b>Stack:</b> n8n, PostgreSQL, Google Sheets, OpenAI, Gmail</p>
      <p><a href="03-automate-overdue-order-escalation/">Read the case study &rarr;</a></p>
    </td>
  </tr>
</table>

## What this demonstrates

- **Workflow automation:** end-to-end n8n pipelines with scheduling, branching, approval steps and logging
- **SQL and data modelling:** order-level and KPI queries on a relational schema (PostgreSQL)
- **Responsible AI use:** the model writes wording and SQL; numbers are calculated in code, output is validated, and a person approves where it matters
- **Operations thinking:** SLAs, severity levels, escalation routing and an audit trail
- **KPI and metric design:** explicit definitions, percentage-point changes, minimum sample sizes

## Data

| Project | Dataset |
|---|---|
| 01 | [Lotus Group Retail Star Schema BI](https://www.kaggle.com/datasets/abdelrahmanmahmoud22/lotus-group-retail-star-schema-bi) (fictional retailer, one year of orders) |
| 02 and 03 | [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) (about 100,000 orders, 2016 to 2018) |

The data is public and historical, so the projects replay it as if it were live. No datasets or credentials are stored in this repository.

## Repository layout

```
.
├── 01-automate-monthly-performance-report/   scripts, prompt, workflow export, screenshots
├── 02-ai-agent-chat-with-postgres-data/      prompts, validation and formatting code, workflow export
├── 03-automate-overdue-order-escalation/     SQL, routing code, escalation table, workflow export
└── docs/                                     banner image
```

## Author

Xanh · [GitHub](https://github.com/YOUR-USERNAME) · [LinkedIn](https://linkedin.com/in/YOUR-PROFILE)
