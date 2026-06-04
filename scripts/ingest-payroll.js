#!/usr/bin/env node
'use strict';

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).trim();
}

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npm run payroll -- /path/to/file.xlsx');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error('File not found: ' + filePath);
  process.exit(1);
}

// Parse period end date from filename (e.g. 2026.06.05_Employee_Labor_Detail.xlsx)
const basename = path.basename(filePath);
const dateMatch = basename.match(/(\d{4})\.(\d{2})\.(\d{2})/);
const periodDate = dateMatch
  ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
  : new Date().toISOString().slice(0, 10);

console.log(`Parsing payroll for period ending ${periodDate}...`);

const wb = xlsx.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }).slice(1);

const deptMap = {};
const empMap = {};
const categoryTotals = {};

for (const r of rows) {
  const [deptId, deptName, acctId, , emp, category, hours, dollars] = r;
  if (!emp) continue;

  const deptLabel = deptName || String(deptId);

  if (!deptMap[deptLabel]) {
    deptMap[deptLabel] = { id: deptId, name: deptLabel, totalHours: 0, totalDollars: 0, directLabor: 0, indirectLabor: 0, adminWages: 0 };
  }
  deptMap[deptLabel].totalHours += hours || 0;
  deptMap[deptLabel].totalDollars += dollars || 0;
  if (acctId === 5008) deptMap[deptLabel].directLabor += dollars || 0;
  if (acctId === 5009) deptMap[deptLabel].indirectLabor += dollars || 0;
  if (acctId === 6001) deptMap[deptLabel].adminWages += dollars || 0;

  if (!empMap[emp]) {
    empMap[emp] = { name: emp, dept: deptLabel, totalHours: 0, totalDollars: 0, regular: 0, ot: 0, holiday: 0, pto: 0, other: 0 };
  }
  empMap[emp].totalHours += hours || 0;
  empMap[emp].totalDollars += dollars || 0;
  if (category === 'Regular') empMap[emp].regular += dollars || 0;
  else if (category === 'Regular - O/T') empMap[emp].ot += dollars || 0;
  else if (category === 'Holiday') empMap[emp].holiday += dollars || 0;
  else if (category === 'PTO') empMap[emp].pto += dollars || 0;
  else empMap[emp].other += dollars || 0;

  if (!categoryTotals[category]) categoryTotals[category] = { hours: 0, dollars: 0 };
  categoryTotals[category].hours += hours || 0;
  categoryTotals[category].dollars += dollars || 0;
}

// Round all numbers
const round = v => Math.round(v * 100) / 100;
for (const d of Object.values(deptMap)) {
  for (const k of Object.keys(d)) { if (typeof d[k] === 'number') d[k] = round(d[k]); }
}
for (const e of Object.values(empMap)) {
  for (const k of Object.keys(e)) { if (typeof e[k] === 'number') e[k] = round(e[k]); }
}

const totals = {
  hours: round(Object.values(empMap).reduce((s, e) => s + e.totalHours, 0)),
  dollars: round(Object.values(empMap).reduce((s, e) => s + e.totalDollars, 0)),
  headcount: Object.keys(empMap).length,
};

const data = { periodEndDate: periodDate, departments: deptMap, employees: Object.values(empMap), categoryTotals, totals };

// Save JSON
const memoryDir = path.join(__dirname, '..', 'data', 'memory');
const jsonOut = path.join(memoryDir, `payroll-${periodDate}.json`);
fs.writeFileSync(jsonOut, JSON.stringify(data, null, 2));

// Build markdown summary
const deptRows = Object.values(deptMap)
  .map(d => `| ${d.name} | ${d.totalHours.toFixed(1)}h | $${d.totalDollars.toLocaleString('en-US', { minimumFractionDigits: 2 })} | $${d.directLabor.toFixed(2)} | $${d.indirectLabor.toFixed(2)} | $${d.adminWages.toFixed(2)} |`)
  .join('\n');

const catRows = Object.entries(categoryTotals)
  .map(([cat, v]) => `| ${cat} | ${v.hours.toFixed(1)}h | $${v.dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })} |`)
  .join('\n');

const otHours = categoryTotals['Regular - O/T']?.hours || 0;
const regHours = categoryTotals['Regular']?.hours || 0;
const otRate = regHours > 0 ? ((otHours / (regHours + otHours)) * 100).toFixed(1) : '0.0';

const md = `# R-Dent Payroll Summary — Period Ending ${periodDate}

## Department Labor Totals

| Department | Hours | Total Cost | Direct Labor | Indirect Labor | Admin Wages |
|---|---|---|---|---|---|
${deptRows}
| **TOTAL** | **${totals.hours.toFixed(1)}h** | **$${totals.dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}** | | | |

## Pay Category Breakdown

| Category | Hours | Dollars |
|---|---|---|
${catRows}

## Key Flags

- **OT rate**: ${otHours.toFixed(1)}h OT / ${(regHours + otHours).toFixed(1)}h productive = **${otRate}% OT**
- **Total headcount**: ${totals.headcount} employees
- **Total labor cost**: $${totals.dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}

_Source: ${basename}_
`;

const exportsDir = path.join(__dirname, '..', 'data', 'exports');
const mdOut = path.join(exportsDir, `payroll-summary-${periodDate}.md`);
fs.writeFileSync(mdOut, md);

console.log(`\n✓ JSON saved:     ${jsonOut}`);
console.log(`✓ Summary saved:  ${mdOut}`);
console.log(`\nTotals: ${totals.headcount} employees | ${totals.hours}h | $${totals.dollars.toLocaleString()}`);
console.log(`OT rate: ${otRate}%`);

// Commit and push to repo
console.log('\nSyncing to repo...');
try {
  git('pull --rebase origin main');
  git(`add data/memory/payroll-${periodDate}.json data/exports/payroll-summary-${periodDate}.md`);
  git(`commit -m "Payroll data for period ending ${periodDate}"`);
  git('push origin HEAD');
  console.log('✓ Pushed to repo');
} catch (err) {
  console.error('Git sync failed — files saved locally but not pushed.');
  console.error(err.message);
}
