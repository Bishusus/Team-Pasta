# RTE Academic Intelligence — Dashboard frontend

A React frontend for the academic risk dashboard. Currently wired to mock
data only — no backend or CSV connection yet.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Project structure

```
src/
  theme.js                 Colors and fonts used across the app
  App.jsx                  Root component: renders Sidebar + current page
  main.jsx                 React entry point
  index.css                Global styles + responsive breakpoints

  data/
    mockStudents.js        Mock student data (replace with a real
                            fetch/CSV parse later — keep the same shape)

  components/
    Sidebar.jsx             Left navigation (Dashboard / Students /
                             Risk Analysis / Exam Seating)
    SummaryCard.jsx          One summary metric tile (e.g. "High risk: 4")
    SearchBox.jsx            Search input, filters by name or student ID
    RiskBadge.jsx            Colored dot + label for HIGH / MEDIUM / LOW
    AttendanceBar.jsx        Small colored progress bar for attendance %
    StudentTable.jsx         Table of students, built from the above pieces

  pages/
    DashboardPage.jsx        Summary cards + search + table, all wired together
    PlaceholderPage.jsx      Stand-in for Students / Risk Analysis /
                             Exam Seating until those are built
```

## How the pieces fit together

`App.jsx` holds one piece of state — which page is active — and swaps
between `DashboardPage` and `PlaceholderPage` based on the sidebar
selection. `DashboardPage` owns the search text and computes:

1. `counts` — how many students are HIGH / MEDIUM / LOW risk, for the
   summary cards.
2. `filtered` — the student list narrowed down by the search box.

Everything else (`SummaryCard`, `RiskBadge`, `AttendanceBar`,
`StudentTable`) is a "dumb" component: it just renders whatever data
it's handed as props. That's what makes them reusable — you can drop
`StudentTable` onto the future "Students" page and pass it a
different (larger) list without changing the component itself.

## Connecting real data later

Replace the contents of `src/data/mockStudents.js` with a fetch call
(or CSV parse) that returns an array of objects shaped like:

```js
{
  id: "STU-1042",
  name: "Aarav Sharma",
  programme: "BSc Computer Science",
  module: "Data Structures",
  attendance: 92,       // number, 0-100
  examScore: 78,        // number
  riskLevel: "LOW",     // "HIGH" | "MEDIUM" | "LOW"
  riskScore: 12,        // number, 0-100
}
```

As long as the shape matches, no component needs to change.

## Building the other three pages

`PlaceholderPage.jsx` is standing in for Students, Risk Analysis, and
Exam Seating. To build a real one, copy the pattern in
`DashboardPage.jsx`: pull in the components you need from
`src/components/`, pass them the right slice of data, and swap the
`<PlaceholderPage title="..." />` line in `App.jsx` for your new page
component.
