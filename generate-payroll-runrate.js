'use strict';

/**
 * Reads an Employee Labor Detail xlsx export, computes per-period and
 * annualized (26 pay periods) payroll run rates, and writes payroll-runrate.xlsx
 * to data/exports/.
 *
 * Usage: node generate-payroll-runrate.js [path-to-labor-detail.xlsx]
 * Default source: data/inputs/Employee_Labor_Detail.xlsx
 */

const path = require('path');
const XLSX = require('xlsx');

const PAY_PERIODS_PER_YEAR = 26; // biweekly

// Categories treated as one-time / non-recurring (excluded from run-rate base)
const NON_RECURRING = new Set(['DiscretionaryBo', 'Bonus', 'Expense Reimbur', 'Non Tax Auto']);

const SOURCE = process.argv[2] || path.join(__dirname, 'data/inputs/Employee_Labor_Detail.xlsx');
const DEST = path.join(__dirname, 'data/exports/payroll-runrate.xlsx');

// ── Read source ────────────────────────────────────────────────────────────
const wb = XLSX.readFile(SOURCE);
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Row 0 is the header; skip it
const rows = raw.slice(1).map(r => ({
  deptId:    r[0],
  dept:      String(r[1] || '').trim(),
  coaId:     r[2],
  coa:       String(r[3] || '').trim(),
  employee:  String(r[4] || '').trim(),
  category:  String(r[5] || '').trim(),
  hours:     Number(r[6]) || 0,
  dollars:   Number(r[7]) || 0,
})).filter(r => r.employee && r.dollars !== 0);

// ── Aggregate by employee ──────────────────────────────────────────────────
const empMap = new Map(); // key = "employee||dept"

for (const r of rows) {
  const key = `${r.employee}||${r.dept}`;
  if (!empMap.has(key)) {
    empMap.set(key, {
      employee: r.employee,
      dept: r.dept,
      coa: r.coa,
      regularHours: 0, regularDollars: 0,
      otHours: 0, otDollars: 0,
      ptoHours: 0, ptoDollars: 0,
      bonusDollars: 0,
      otherDollars: 0,
      totalHours: 0, totalDollars: 0,
    });
  }
  const e = empMap.get(key);
  e.totalHours += r.hours;
  e.totalDollars += r.dollars;

  const cat = r.category;
  if (cat === 'Regular') {
    e.regularHours += r.hours; e.regularDollars += r.dollars;
  } else if (cat === 'Regular - O/T') {
    e.otHours += r.hours; e.otDollars += r.dollars;
  } else if (cat === 'PTO') {
    e.ptoHours += r.hours; e.ptoDollars += r.dollars;
  } else if (cat === 'Bonus' || cat === 'DiscretionaryBo') {
    e.bonusDollars += r.dollars;
  } else {
    e.otherDollars += r.dollars;
  }
}

const employees = [...empMap.values()];

// Recurring = everything except bonus & other non-recurring
function recurringDollars(e) {
  return e.regularDollars + e.otDollars + e.ptoDollars;
}

// ── Aggregate by department ────────────────────────────────────────────────
const deptMap = new Map();
for (const e of employees) {
  if (!deptMap.has(e.dept)) {
    deptMap.set(e.dept, {
      dept: e.dept, headcount: 0,
      totalHours: 0, totalDollars: 0,
      recurringDollars: 0, bonusDollars: 0,
    });
  }
  const d = deptMap.get(e.dept);
  d.headcount++;
  d.totalHours += e.totalHours;
  d.totalDollars += e.totalDollars;
  d.recurringDollars += recurringDollars(e);
  d.bonusDollars += e.bonusDollars;
}

// ── Sort employees: by dept then name ─────────────────────────────────────
employees.sort((a, b) => a.dept.localeCompare(b.dept) || a.employee.localeCompare(b.employee));

// ── Build workbook ─────────────────────────────────────────────────────────
const out = XLSX.utils.book_new();

const $ = v => Math.round(v * 100) / 100; // round to cents

// ── Sheet 1: Department Summary ────────────────────────────────────────────
const deptHeaders = [
  'Department',
  'Headcount',
  'Period Hours',
  'Period Wages ($)',
  'Period Recurring ($)',
  'Period Bonuses ($)',
  'Annualized Run Rate ($)',
  'Annualized (excl. Bonuses) ($)',
];

const deptRows = [...deptMap.values()]
  .sort((a, b) => a.dept.localeCompare(b.dept))
  .map(d => [
    d.dept,
    d.headcount,
    $(d.totalHours),
    $(d.totalDollars),
    $(d.recurringDollars),
    $(d.bonusDollars),
    $(d.totalDollars * PAY_PERIODS_PER_YEAR),
    $(d.recurringDollars * PAY_PERIODS_PER_YEAR),
  ]);

// Totals row
const totals = [...deptMap.values()].reduce(
  (acc, d) => {
    acc.headcount += d.headcount;
    acc.hours += d.totalHours;
    acc.total += d.totalDollars;
    acc.recurring += d.recurringDollars;
    acc.bonus += d.bonusDollars;
    return acc;
  },
  { headcount: 0, hours: 0, total: 0, recurring: 0, bonus: 0 }
);
deptRows.push([
  'TOTAL',
  totals.headcount,
  $(totals.hours),
  $(totals.total),
  $(totals.recurring),
  $(totals.bonus),
  $(totals.total * PAY_PERIODS_PER_YEAR),
  $(totals.recurring * PAY_PERIODS_PER_YEAR),
]);

const wsDept = XLSX.utils.aoa_to_sheet([deptHeaders, ...deptRows]);
styleSheet(wsDept, deptHeaders.length, deptRows.length, [3, 4, 5, 6, 7]);
XLSX.utils.book_append_sheet(out, wsDept, 'Dept Summary');

// ── Sheet 2: Employee Detail ───────────────────────────────────────────────
const empHeaders = [
  'Employee',
  'Department',
  'COA',
  'Regular Hours',
  'Regular ($)',
  'OT Hours',
  'OT ($)',
  'PTO Hours',
  'PTO ($)',
  'Bonus ($)',
  'Other ($)',
  'Period Total ($)',
  'Annualized Run Rate ($)',
  'Annualized (excl. Bonuses) ($)',
];

const empRows = employees.map(e => [
  e.employee,
  e.dept,
  e.coa,
  $(e.regularHours),
  $(e.regularDollars),
  $(e.otHours),
  $(e.otDollars),
  $(e.ptoHours),
  $(e.ptoDollars),
  $(e.bonusDollars),
  $(e.otherDollars),
  $(e.totalDollars),
  $(e.totalDollars * PAY_PERIODS_PER_YEAR),
  $(recurringDollars(e) * PAY_PERIODS_PER_YEAR),
]);

const wsEmp = XLSX.utils.aoa_to_sheet([empHeaders, ...empRows]);
styleSheet(wsEmp, empHeaders.length, empRows.length, [4, 6, 8, 9, 10, 11, 12, 13]);
XLSX.utils.book_append_sheet(out, wsEmp, 'Employee Detail');

// ── Sheet 3: Raw Data (cleaned) ────────────────────────────────────────────
const rawHeaders = ['Department', 'Chart of Accounts', 'Employee', 'Category', 'Hours', 'Dollars'];
const rawRows = rows.map(r => [r.dept, r.coa, r.employee, r.category, r.hours, r.dollars]);
const wsRaw = XLSX.utils.aoa_to_sheet([rawHeaders, ...rawRows]);
styleSheet(wsRaw, rawHeaders.length, rawRows.length, [5]);
XLSX.utils.book_append_sheet(out, wsRaw, 'Raw Data');

XLSX.writeFile(out, DEST);
console.log(`Written: ${DEST}`);
console.log(`  ${employees.length} employees across ${deptMap.size} departments`);
console.log(`  Period total: $${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  Annualized run rate: $${(totals.total * PAY_PERIODS_PER_YEAR).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  Annualized excl. bonuses: $${(totals.recurring * PAY_PERIODS_PER_YEAR).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

// ── Helpers ────────────────────────────────────────────────────────────────
function styleSheet(ws, colCount, rowCount, dollarCols) {
  // Column widths
  const widths = [];
  for (let i = 0; i < colCount; i++) widths.push({ wch: i === 0 ? 28 : i === 1 ? 22 : 16 });
  ws['!cols'] = widths;

  // Dollar format on specified 0-indexed columns
  const dollarFmt = '"$"#,##0.00';
  for (let row = 1; row <= rowCount; row++) {
    for (const col of dollarCols) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[addr]) {
        ws[addr].z = dollarFmt;
      }
    }
  }
}
