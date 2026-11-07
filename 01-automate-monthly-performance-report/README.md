# Automate Monthly Retail Performance Reports with Google Sheets, GPT-5 & Gmail Approval

**Automated retail reporting with n8n and generative AI, with a human approval step before anything is sent.**

![Email report and n8n workflow](docs/email_preview_and_workflow.png)

*Left and centre: the report email. Right: the n8n workflow behind it.*

## Overview

Every month a manager needs the same answer: how did the business perform, what changed and what should we do about it. This workflow produces that answer from raw sales data and delivers it as a designed email, with no manual spreadsheet work. A reviewer approves the report before it reaches its recipients.

**Stack:** n8n · Google Sheets · Python · QuickChart · OpenAI (GPT-5) · Gmail

## The problem

Monthly reporting is repetitive and easy to get wrong. Someone exports data, cleans it, rebuilds the same KPIs and charts, writes commentary and formats an email. Each step is a chance for a formula error, a stale chart or an inconsistent definition, and the whole cycle repeats every month.

## Why each step is automated

| Manual step | What goes wrong | How the workflow handles it |
|---|---|---|
| Cleaning the export | Duplicate lines, mixed date formats, amounts stored as text, inconsistent status spelling | A cleaning script applies the same rules every run |
| Rebuilding KPIs | Definitions drift; month-over-month changes are miscalculated | One KPI script, with fixed definitions, calculates every figure |
| Making charts | Charts are copied from old files or built by hand | Four charts are generated from the new numbers on each run |
| Writing commentary | Slow, and often just restates the numbers | An LLM writes one sentence per section from pre-calculated facts |
| Formatting and sending | Layouts break in different email clients | A tested HTML template is built and sent automatically |
| Checking before sending | Skipped when time is short | A built-in approval step makes the check part of the process |

## What it delivers

- **4 KPI cards:** net revenue, gross margin, total orders, return rate, each with its change against the previous month
- **Top product and top store** of the month
- **4 charts,** each with a one-line takeaway: revenue trend, revenue by category, top 5 subcategories, revenue by store
- **3 recommended actions** based on what moved

December 2024: net revenue 1,304,085 (+52.3%), gross margin 20.3% (-5.0 pts), 366 orders (+8.0%), return rate 7.7% (-0.6 pts).

## Workflow

![n8n workflow](docs/n8n_workflow.png)

| # | Node | Type | What it does |
|---|---|---|---|
| 1 | Raw Data from Google Sheets | Google Sheets | Starts the run and reads the order data (about 4,000 order lines) |
| 2 | Clean Data | Code (Python) | Removes duplicate lines, standardises dates, amounts and statuses, fills missing fields |
| 3 | Calculate KPIs | Code (Python) | Calculates every KPI, the month-over-month changes and the fact lists for the charts and the AI |
| 4 | AI Insights | LLM chain (GPT-5) | Writes one sentence per section and three actions from the supplied facts, in a fixed tagged format |
| 5 to 8 | Chart 1 to 4 | HTTP Request (QuickChart) | Render the monthly trend, category revenue, top 5 subcategories and store ranking as images |
| 9 | Merge | Merge | Combines the KPIs, the AI text and the four charts into one set |
| 10 | Build HTML Report | Code (Python) | Parses the AI text and assembles the report as an email-safe HTML page |
| 11 | Send Report Preview | Gmail | Sends the finished report to the reviewer |
| 12 | Request Human Approval | Gmail (send and wait) | Pauses the workflow until the reviewer approves or rejects |
| 13 | If | Condition | Continues only when the report was approved |
| 14 | Send a message | Gmail | Sends the approved report to the recipients |

If the reviewer rejects the report, the workflow ends and nothing is sent.

## Key decisions

**The AI never does the maths.** The KPI script calculates every figure first and hands the model short fact lists. The model only writes one sentence per section, in a tagged format that the report script parses. The insights can't contain invented numbers, and a missing section doesn't break the email.

**A human approves before sending.** Generated text should not reach stakeholders unchecked. The approval step keeps the speed of automation and adds a deliberate review, so one person can sign off in seconds instead of rebuilding the report.

**Revenue is attributed to the right products.** Orders can contain several products. My first version credited a whole order to its first product, which distorted the category chart and the best-product card. I caught it, rebuilt the data at order-line level, and checked that line revenue reconciles to order revenue and that category and product figures match an independent pandas calculation.

**Metrics are defined carefully.** Net revenue counts Completed orders only. Return rate is Returned orders over all orders. Margin and return-rate changes are shown in percentage points, not percent. The report compares the latest month in the data with the one before it, and flags a partial month.

**The email is built for real inboxes.** Table-based HTML with inline CSS, a mobile layout, fallbacks for gradients and transparency, and a size far below Gmail's clipping limit. Charts are images because email can't run JavaScript.

## Data cleaning

Duplicate lines, mixed date formats (ISO, DD/MM/YYYY, timestamps, Excel serials), amounts stored as text, stray spaces, inconsistent order-status spelling and missing employee or product fields were all handled before any KPI was calculated. The cleaning, KPI and report steps are Python scripts written without imports, because n8n's sandbox does not allow them, so dates, number formatting and text parsing are hand-built.

## Skills demonstrated

Workflow automation (n8n) · Python for data cleaning and KPI logic · Google Sheets · KPI and metric design · Data validation and reconciliation · Data visualisation · LLM prompt design and output parsing · Human-in-the-loop design · HTML email development

## Data and limitations

Dataset: [Lotus Group Retail Star Schema BI](https://www.kaggle.com/datasets/abdelrahmanmahmoud22/lotus-group-retail-star-schema-bi) (Kaggle). It is a fictional retailer with one year of orders in EGP, so the numbers are for demonstration. Month-over-month changes are not adjusted for seasonality.

## Repository contents

- [`scripts/`](scripts/): cleaning, KPI and report scripts
- [`prompts/`](prompts/): the LLM prompt
- [`workflow/`](workflow/): the n8n workflow export
- [`docs/`](docs/): screenshots

[Back to the portfolio](../README.md)
