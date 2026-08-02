# BP-004 IP-12 – CRM Analytics & Dashboards

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-12 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | Medium |
| Depends On | IP-01 through IP-11, ENG-011 |

---

## Objective

Deliver CRM analytics dashboards and **customer-scoped Analytics tab content for Customer 360** — pipeline health, conversion funnels, service performance, visit analytics, engagement indicators, health score, and productivity metrics — consuming data from BP-004 entities without duplicating BP-003 offering analytics.

---

## Business Problem

Leadership lacks visibility into sales pipeline accuracy, service levels, field visit coverage, and customer engagement trends when CRM data is not aggregated into actionable KPIs. Decision makers need standard dashboards and drill-down without exporting to spreadsheets.

---

## Scope

### Included

- Customer Profile **Analytics tab** (customer-scoped; feeds Customer 360 health widgets)
- CRM executive dashboard
- Sales analytics: pipeline, forecast, win rate, cycle time
- Lead analytics: source, conversion, velocity
- Service analytics: case volume, SLA, satisfaction
- Visit analytics: frequency, coverage, action item completion (IP-07)
- Engagement analytics: activity and communication frequency
- Productivity analytics: activities and appointments per rep
- Customer insight indicators: dormancy, churn risk flags (rule-based)
- Configurable KPI definitions and thresholds
- Export and scheduled report delivery via ENG-011

### Excluded

- Product performance analytics (BP-003 IP-12)
- AI predictive models (ENG-012 / future BP-013)
- Financial revenue recognition reporting
- Data warehouse ETL implementation

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Provide real-time CRM KPIs for sales and service leaders. |
| BR-002 | Enable drill-down from summary to entity lists. |
| BR-003 | Compare performance across periods, teams, and segments. |
| BR-004 | Highlight at-risk customers using configurable rule-based indicators. |
| BR-005 | Align metrics with industry edition terminology (ENG-003k). |
| BR-006 | Provide assignment and SLA analytics: per-owner duration, cumulative TAT, breaches, queue delays (ENG-003n). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Display CRM dashboard with configurable widgets. |
| FR-002 | Show pipeline value by stage, owner, and forecast period. |
| FR-003 | Show lead funnel metrics by source and campaign. |
| FR-004 | Show case metrics: volume, SLA compliance, resolution time, CSAT. |
| FR-005 | Show visit metrics: visits per account, rep coverage, open action items. |
| FR-006 | Show activity and communication volume per account segment. |
| FR-007 | Calculate win rate, average deal size, and sales cycle length. |
| FR-008 | Flag dormant accounts and declining engagement via ENG-004 rules. |
| FR-009 | Filter analytics by branch, team, date range, segment. |
| FR-010 | Export dashboard data and schedule reports (ENG-011). |
| FR-011 | Restrict analytics visibility by role and data scope. |
| FR-012 | Show assignment/SLA analytics: current owner elapsed time, prior owners' time, total lifecycle duration, average handling time per employee/branch/team, SLA breaches by owner. |
| FR-013 | Answer operational questions: who owns this item, how long has current owner had it, how long did previous owner have it, which team causes delays, average time to close lead/opportunity/case. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Analytics reflect read-only aggregated data; no direct entity mutation. |
| BRU-002 | User sees only data within permitted business and team scope. |
| BRU-003 | Forecast calculations use IP-03 stage probabilities. |
| BRU-004 | Churn and dormancy flags are advisory; not automatic status changes. |
| BRU-005 | Historical metrics preserved when CRM records archived. |

---

## High-Level Process Flow

```
CRM Operational Data (IPs 01–11)
      ↓
Aggregation & KPI Calculation (ENG-011)
      ↓
Dashboard & Reports
      ↓
Drill-down → Filtered Entity Lists
      ↓
Export / Scheduled Delivery
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Dashboard widgets | Role-based layout |
| KPI definitions | Formulas and thresholds |
| Dormancy rules | Days since last activity |
| Churn indicators | Rule conditions (ENG-004) |
| Report schedules | Frequency and recipients |
| Industry labels | ENG-003k metric naming |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-11 | Source CRM data |
| IP-01 / ENG-003n | Assignment and SLA segment data |
| IP-07 | Visit and call report analytics |
| ENG-011 | Reporting engine |
| ENG-004 | Insight rules |
| ENG-003k | Presentation labels |
| BP-003 IP-12 | Boundary: product analytics remain in BP-003 |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Executive CRM summary | Pipeline, leads, cases, engagement |
| Sales performance | By owner, team, product line |
| Lead conversion | Funnel and source ROI |
| Service quality | SLA and satisfaction trends |
| Visit coverage | Accounts visited vs target |
| Assignment & SLA | Per-owner duration, cumulative TAT, breaches by entity type |
| Queue performance | Wait time, reassignment frequency, team delays |
| Customer health | Dormant and at-risk accounts |
| Campaign effectiveness | Linked from IP-11 metrics |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Dashboard loads KPIs from live CRM data. |
| AC-002 | Drill-down navigates to filtered entity lists. |
| AC-003 | Role-based data scoping enforced. |
| AC-004 | Export produces accurate aggregated datasets. |
| AC-005 | Dormancy and risk flags fire per configured rules. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Analytics tab** | Customer-scoped KPIs on Customer Profile (distinct from executive CRM dashboard) |
| **Widgets on 360** | Health score, churn/dormancy risk flag, relationship value indicators |
| **Insights** | Rule-based health summary consumed by Customer Insights panel |
| **Future** | ENG-012 AI summary widget on Customer 360 |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01–IP-11 | Data sources |
| ENG-011 | Reporting platform |
| ENG-004 | Rule-based insights |
| ENG-003n | Assignment and SLA analytics source |
