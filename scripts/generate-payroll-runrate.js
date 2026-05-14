/**
 * Generate an editable Payroll Run-Rate workbook from one bi-weekly payroll.
 *
 * Design (driven by the goal: "what does labor look like if I cut a few people?"):
 *   Sheet 1 "Employee Roster"  — one row per (Department × Employee). Edit Hours,
 *                                Bi-Weekly Pay, or flip Include? to N to simulate
 *                                a headcount reduction. Monthly columns recalc.
 *   Sheet 2 "Department Summary" — totals + monthly run-rate by department,
 *                                  driven by the Roster sheet.
 *   Sheet 3 "Payroll Detail"   — raw source data (Regular / OT / PTO / Reimb rows)
 *                                kept for audit. Not used in the totals.
 *
 * Monthly run rate = Bi-Weekly × (26 ÷ 12) ≈ 2.1667. The multiplier lives in
 * Summary!B2 so you can flip it to "× 2" if you'd rather see two-paycheck months.
 */

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const OUT_DIR = path.join(__dirname, '..', 'data', 'exports');
const OUT_FILE = path.join(OUT_DIR, 'payroll-runrate.xlsx');

// Raw detail rows: [Dept#, Department, Acct#, Account, Employee, Category, Hours, Dollars]
const detailRows = [
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Abart, Mary C', 'Regular', 68.31, 1229.58],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Akins, Sean-Michael M', 'Regular', 24.39, 548.67],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'ASMAR, AYIA', 'Regular', 80, 1360],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Cummings, Vera A', 'Regular', 80, 2400],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Gainey, Chase M', 'Regular', 80, 1520],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Glover, Kelsey Tashae', 'Regular', 60, 1020],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Guin, Richard A', 'Regular', 37.88, 757.5],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Gutierrez, Matias R', 'Regular', 13.91, 361.6],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'House, James Elisha', 'Regular', 49.97, 849.41],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Jarvis, Brittany D', 'Regular', 65.53, 1441.66],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Jeansonne, Ethan', 'Regular', 0, 619.14],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Sleppy, Daniel', 'Regular', 74.89, 2396.48],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Williams, Alexander Ray', 'Regular', 40, 680],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Akins, Sean-Michael M', 'Regular - O/T', 1.31, 44.22],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'ASMAR, AYIA', 'Regular - O/T', 3.56, 90.78],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Cummings, Vera A', 'Regular - O/T', 6.03, 271.35],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Gainey, Chase M', 'Regular - O/T', 15.18, 432.63],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Glover, Kelsey Tashae', 'Regular - O/T', 2.12, 54.13],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Guin, Richard A', 'Regular - O/T', 2.05, 61.35],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'House, James Elisha', 'Regular - O/T', 5.42, 138.08],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Jeansonne, Ethan', 'Regular - O/T', 1.11, 28.31],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Sleppy, Daniel', 'Regular - O/T', 4.41, 211.68],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Williams, Alexander Ray', 'Regular - O/T', 2.63, 67.19],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Akins, Sean-Michael M', 'PTO', 16, 360],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Gutierrez, Matias R', 'PTO', 2, 52],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'House, James Elisha', 'PTO', 6, 102],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Sleppy, Daniel', 'PTO', 8, 256],
  [1, '1 - 980 Fixed', 5008, '5008 - Direct Labor', 'Thomas, Colia', 'PTO', 1, 17],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'Coughlin, William C', 'Regular', 70.07, 2025.85],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'Grubb, Durand C', 'Regular', 0, 1922.83],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'Guardiola, Melissa G', 'Regular', 68, 2615.39],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'McGovern, Nancy J', 'Regular', 80, 1840],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'Williams, Tommy John', 'Regular', 40, 1230.77],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'Guardiola, Melissa G', 'Phone Reimb', 0, 63.75],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'Williams, Tommy John', 'Phone Reimb', 0, 37.5],
  [1, '1 - 980 Fixed', 5009, '5009 - Indirect Labor', 'McGovern, Nancy J', 'Regular - O/T', 27.61, 952.55],

  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Akins, Sean-Michael M', 'Regular', 24.38, 548.66],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Bateman, Marisa Jolie', 'Regular', 76.65, 1149.75],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Erving, Jerome', 'Regular', 75.75, 1136.25],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Gilchrist, Nicholas Ryan', 'Regular', 80, 1840],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Glover, Kelsey Tashae', 'Regular', 20, 340],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Guin, Richard A', 'Regular', 37.87, 757.5],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Gutierrez, Matias R', 'Regular', 41.72, 1084.78],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'House, James Elisha', 'Regular', 16.65, 283.13],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Ibrahim, Ali', 'Regular', 65.51, 1310.2],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Jeansonne, Ethan', 'Regular', 36.42, 619.14],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Phillips, Nelson H', 'Regular', 74.59, 2237.7],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Ross, Marissa M', 'Regular', 50.05, 800.8],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Saleh, Mohamad', 'Regular', 80, 2000],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Sanders, Eric D', 'Regular', 80, 2320],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Smith, Tashauna', 'Regular', 80, 1280],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Stroud, William Isaiah', 'Regular', 80, 1200],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Westbrook, Jordyn', 'Regular', 80, 1120],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Williams, Alexander Ray', 'Regular', 40, 680],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Akins, Sean-Michael M', 'Regular - O/T', 1.31, 44.21],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Bateman, Marisa Jolie', 'Regular - O/T', 4.87, 109.58],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Gilchrist, Nicholas Ryan', 'Regular - O/T', 2.57, 88.67],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Glover, Kelsey Tashae', 'Regular - O/T', 0.71, 18.04],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Guin, Richard A', 'Regular - O/T', 2.04, 61.35],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'House, James Elisha', 'Regular - O/T', 1.8, 46.03],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Jeansonne, Ethan', 'Regular - O/T', 1.11, 28.3],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Phillips, Nelson H', 'Regular - O/T', 1.7, 76.5],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Saleh, Mohamad', 'Regular - O/T', 0.65, 24.38],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Sanders, Eric D', 'Regular - O/T', 2.02, 87.87],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Smith, Tashauna', 'Regular - O/T', 2.29, 54.96],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Stroud, William Isaiah', 'Regular - O/T', 5.95, 133.88],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Westbrook, Jordyn', 'Regular - O/T', 1.14, 23.94],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Williams, Alexander Ray', 'Regular - O/T', 2.64, 67.2],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Akins, Sean-Michael M', 'PTO', 16, 360],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Gutierrez, Matias R', 'PTO', 6, 156],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'House, James Elisha', 'PTO', 2, 34],
  [2, '2 - 990 Removable', 5008, '5008 - Direct Labor', 'Ross, Marissa M', 'PTO', 21, 336],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Coughlin, William C', 'Regular', 12.37, 357.51],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Guardiola, Greg', 'Regular', 80, 3076.93],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Krause, Daniela', 'Regular', 80, 1600],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Williams, Tommy John', 'Regular', 40, 1230.77],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Guardiola, Greg', 'Phone Reimb', 0, 75],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Williams, Tommy John', 'Phone Reimb', 0, 37.5],
  [2, '2 - 990 Removable', 5009, '5009 - Indirect Labor', 'Krause, Daniela', 'Regular - O/T', 18.91, 567.3],

  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Bateman, Madelyn', 'Regular', 79.22, 1307.13],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Copeland, Melanie K', 'Regular', 80, 2307.7],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Dyson, Taviana', 'Regular', 76.1, 1293.7],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Guardiola, Melissa G', 'Regular', 12, 461.54],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Jarrell, Sarah Ann', 'Regular', 69.93, 1118.88],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Lingerfelt, Karen', 'Regular', 65.7, 1314],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'McGowan, Tonya Lynette', 'Regular', 10.17, 162.72],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Shepard Williams, Regina', 'Regular', 45.41, 726.56],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Copeland, Melanie K', 'Phone Reimb', 0, 75],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Guardiola, Melissa G', 'Phone Reimb', 0, 11.25],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Lingerfelt, Karen', 'Regular - O/T', 0.99, 29.7],
  [3, '3 - 201 Admin', 6001, '6001 - Admin Wages', 'Lingerfelt, Karen', 'PTO', 12, 240],

  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Burk Sr., Steven L', 'Regular', 22.96, 275.52],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Easter, Debra', 'Regular', 34.32, 411.84],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Hall, Alan Wayne', 'Regular', 24.77, 291.05],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'McConnell, David Duane', 'Regular', 72.68, 872.16],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Neff, Troy', 'Regular', 43.15, 539.38],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Quinn, Daniel Joseph', 'Regular', 34.55, 345.5],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Saenger, Christian', 'Regular', 54.92, 686.5],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Shea, John', 'Regular', 60.34, 754.25],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Stewart, William', 'Regular', 38.24, 420.64],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'McConnell, David Duane', 'Regular - O/T', 1.96, 35.28],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'Hall, Alan Wayne', 'PTO', 24, 282],
  [4, '4 - 202 Drivers', 6001, '6001 - Admin Wages', 'McConnell, David Duane', 'PTO', 8, 96],

  [5, '5 - 100 Operations', 6900, '6900 - Misc Expense', 'Everitt, Amy Rebecca', 'Expense Reimbur', 0, 682.09],
  [5, '5 - 100 Operations', 5007, '5007 - Commissions', 'Everitt, Amy Rebecca', 'Commission', 0, 400],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'Everitt, Amy Rebecca', 'Regular', 80, 2500],
  [5, 'DAXTON GRUBB', 6001, '6001 - Admin Wages', 'Grubb, Daxton C', 'Regular', 80, 23538.69],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'Grubb, Durand C', 'Regular', 0, 7177.17],
  [5, 'BREE HIGH', 6001, '6001 - Admin Wages', 'High, Breanna Medlock', 'Regular', 56, 1615.38],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'Jackson, Paula', 'Regular', 72, 2215.38],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'McFadden, Elissa', 'Regular', 63.49, 1650.74],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'McGee, Mary Allison', 'Regular', 61.87, 2165.45],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'McFadden, Elissa', 'Non Tax Auto', 0, 301.7],
  [5, 'BREE HIGH', 6001, '6001 - Admin Wages', 'High, Breanna Medlock', 'PTO', 24, 692.31],
  [5, '5 - 100 Operations', 6001, '6001 - Admin Wages', 'Jackson, Paula', 'PTO', 8, 246.15],
  [5, '5 - 100 Operations', 6010, '6010 - Employee Benefits', 'Everitt, Amy Rebecca', 'Phone Reimb', 0, 75],
  [5, 'BREE HIGH', 6010, '6010 - Employee Benefits', 'High, Breanna Medlock', 'Phone Reimb', 0, 75],
  [5, '5 - 100 Operations', 6010, '6010 - Employee Benefits', 'McFadden, Elissa', 'Phone Reimb', 0, 75],
  [5, '5 - 100 Operations', 6010, '6010 - Employee Benefits', 'McGee, Mary Allison', 'Phone Reimb', 0, 10],
];

// Department buckets (Dept # → label). Operations included for completeness.
const DEPARTMENTS = [
  { num: 1, label: 'Fixed' },
  { num: 2, label: 'Removable' },
  { num: 3, label: 'Admin' },
  { num: 4, label: 'Drivers' },
  { num: 5, label: 'Operations' },
];

const MULTIPLIER = 26 / 12;

// --- Aggregate to one row per (Department × Employee) --------------------
function aggregateByEmployee() {
  const map = new Map();
  for (const r of detailRows) {
    const [deptNum, deptLabel, , , employee, , hours, dollars] = r;
    const key = `${deptNum}::${employee}`;
    if (!map.has(key)) {
      map.set(key, { deptNum, deptLabel, employee, hours: 0, dollars: 0 });
    }
    const a = map.get(key);
    a.hours += hours;
    a.dollars += dollars;
  }
  // Sort by deptNum, then employee
  return Array.from(map.values()).sort((a, b) => {
    if (a.deptNum !== b.deptNum) return a.deptNum - b.deptNum;
    return a.employee.localeCompare(b.employee);
  });
}

async function build() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'R-Dent Payroll Tool';
  wb.created = new Date();

  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
  const EDITABLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  const ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };

  // =========================================================================
  // Sheet 2 (created first so Roster can reference it): Department Summary
  // =========================================================================
  const summary = wb.addWorksheet('Department Summary', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  summary.getCell('A1').value = 'Monthly Run-Rate Multiplier';
  summary.getCell('A1').font = { bold: true };
  summary.getCell('A2').value = 'Bi-weekly × this number = monthly';
  summary.getCell('B2').value = MULTIPLIER;
  summary.getCell('B2').numFmt = '0.0000';
  summary.getCell('B2').fill = EDITABLE_FILL;
  summary.getCell('B2').border = {
    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
  };
  summary.getCell('C2').value = '← edit to 2.0 for "two paychecks per month", or 26/12 ≈ 2.1667 for annualized run-rate';
  summary.getCell('C2').font = { italic: true, color: { argb: 'FF666666' } };

  summary.getColumn('A').width = 28;
  summary.getColumn('B').width = 16;
  summary.getColumn('C').width = 22;
  summary.getColumn('D').width = 22;
  summary.getColumn('E').width = 22;
  summary.getColumn('F').width = 22;

  const sumHeader = 4;
  ['Department', 'Headcount (Included)', 'Bi-Weekly Hours', 'Bi-Weekly Pay', 'Monthly Hours', 'Monthly Pay']
    .forEach((h, i) => {
      const c = summary.getCell(sumHeader, i + 1);
      c.value = h;
      c.font = HEADER_FONT;
      c.fill = HEADER_FILL;
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
  summary.getRow(sumHeader).height = 28;

  // Department rows — filled in after we know roster row count
  const summaryDeptStart = sumHeader + 1;

  // =========================================================================
  // Sheet 1: Employee Roster (the editable one)
  // =========================================================================
  const roster = wb.addWorksheet('Employee Roster', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  roster.columns = [
    { header: 'Dept #', key: 'deptNum', width: 8 },
    { header: 'Department', key: 'department', width: 22 },
    { header: 'Employee Name', key: 'employee', width: 30 },
    { header: 'Include?', key: 'include', width: 10 },
    { header: 'Bi-Weekly Hours', key: 'hours', width: 16 },
    { header: 'Bi-Weekly Pay', key: 'pay', width: 16 },
    { header: 'Monthly Hours', key: 'monthlyHours', width: 16 },
    { header: 'Monthly Pay', key: 'monthlyPay', width: 16 },
  ];

  roster.getRow(1).eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  roster.getRow(1).height = 28;

  const aggregated = aggregateByEmployee();

  aggregated.forEach((a, i) => {
    const r = i + 2;
    const row = roster.addRow({
      deptNum: a.deptNum,
      department: a.deptLabel,
      employee: a.employee,
      include: 'Y',
      hours: Number(a.hours.toFixed(2)),
      pay: Number(a.dollars.toFixed(2)),
      monthlyHours: { formula: `IF(D${r}="Y",E${r}*'Department Summary'!$B$2,0)` },
      monthlyPay: { formula: `IF(D${r}="Y",F${r}*'Department Summary'!$B$2,0)` },
    });

    // Editable cells highlighted (Include, Hours, Pay)
    ['D', 'E', 'F'].forEach((col) => {
      row.getCell(col).fill = EDITABLE_FILL;
    });
    // Zebra-stripe non-editable cells
    if (i % 2 === 1) {
      ['A', 'B', 'C', 'G', 'H'].forEach((col) => {
        row.getCell(col).fill = ZEBRA_FILL;
      });
    }
    row.getCell('D').alignment = { horizontal: 'center' };
    row.getCell('E').numFmt = '0.00';
    row.getCell('F').numFmt = '"$"#,##0.00';
    row.getCell('G').numFmt = '0.00';
    row.getCell('H').numFmt = '"$"#,##0.00';
  });

  const rosterLast = aggregated.length + 1;

  // Data validation for Include? column (Y/N dropdown)
  for (let r = 2; r <= rosterLast; r++) {
    roster.getCell(`D${r}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Y,N"'],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid value',
      error: 'Please enter Y or N',
    };
  }

  // Roster grand total row
  const rosterTotalRow = roster.addRow({
    deptNum: '',
    department: '',
    employee: 'GRAND TOTAL (Included only)',
    include: '',
    hours: { formula: `SUMIF(D2:D${rosterLast},"Y",E2:E${rosterLast})` },
    pay: { formula: `SUMIF(D2:D${rosterLast},"Y",F2:F${rosterLast})` },
    monthlyHours: { formula: `SUM(G2:G${rosterLast})` },
    monthlyPay: { formula: `SUM(H2:H${rosterLast})` },
  });
  rosterTotalRow.font = { bold: true };
  rosterTotalRow.eachCell((cell) => {
    cell.border = { top: { style: 'double' } };
  });
  rosterTotalRow.getCell('E').numFmt = '0.00';
  rosterTotalRow.getCell('F').numFmt = '"$"#,##0.00';
  rosterTotalRow.getCell('G').numFmt = '0.00';
  rosterTotalRow.getCell('H').numFmt = '"$"#,##0.00';

  roster.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } };

  // =========================================================================
  // Fill Department Summary rows (now that roster row range is known)
  // =========================================================================
  const rosterDept = `'Employee Roster'!$A$2:$A$${rosterLast}`;
  const rosterInclude = `'Employee Roster'!$D$2:$D$${rosterLast}`;
  const rosterHours = `'Employee Roster'!$E$2:$E$${rosterLast}`;
  const rosterPay = `'Employee Roster'!$F$2:$F$${rosterLast}`;

  DEPARTMENTS.forEach((d, idx) => {
    const r = summaryDeptStart + idx;
    summary.getCell(`A${r}`).value = d.label;
    // Headcount where include="Y"
    summary.getCell(`B${r}`).value = {
      formula: `COUNTIFS(${rosterDept},${d.num},${rosterInclude},"Y")`,
    };
    summary.getCell(`C${r}`).value = {
      formula: `SUMIFS(${rosterHours},${rosterDept},${d.num},${rosterInclude},"Y")`,
    };
    summary.getCell(`D${r}`).value = {
      formula: `SUMIFS(${rosterPay},${rosterDept},${d.num},${rosterInclude},"Y")`,
    };
    summary.getCell(`E${r}`).value = { formula: `C${r}*$B$2` };
    summary.getCell(`F${r}`).value = { formula: `D${r}*$B$2` };

    summary.getCell(`B${r}`).numFmt = '0';
    summary.getCell(`C${r}`).numFmt = '0.00';
    summary.getCell(`D${r}`).numFmt = '"$"#,##0.00';
    summary.getCell(`E${r}`).numFmt = '0.00';
    summary.getCell(`F${r}`).numFmt = '"$"#,##0.00';

    if (idx % 2 === 0) {
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
        summary.getCell(`${col}${r}`).fill = ZEBRA_FILL;
      });
    }
  });

  const grandRow = summaryDeptStart + DEPARTMENTS.length;
  summary.getCell(`A${grandRow}`).value = 'GRAND TOTAL';
  ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
    summary.getCell(`${col}${grandRow}`).value = {
      formula: `SUM(${col}${summaryDeptStart}:${col}${grandRow - 1})`,
    };
  });
  summary.getRow(grandRow).font = { bold: true };
  summary.getCell(`B${grandRow}`).numFmt = '0';
  summary.getCell(`C${grandRow}`).numFmt = '0.00';
  summary.getCell(`D${grandRow}`).numFmt = '"$"#,##0.00';
  summary.getCell(`E${grandRow}`).numFmt = '0.00';
  summary.getCell(`F${grandRow}`).numFmt = '"$"#,##0.00';
  summary.getRow(grandRow).eachCell((cell) => {
    cell.border = { top: { style: 'double' } };
  });

  // Savings vs baseline (snapshot of starting numbers so user sees the delta)
  const baselineByDept = new Map(DEPARTMENTS.map((d) => [d.num, { hours: 0, pay: 0 }]));
  aggregated.forEach((a) => {
    const b = baselineByDept.get(a.deptNum);
    if (b) {
      b.hours += a.hours;
      b.pay += a.dollars;
    }
  });

  const baselineHeader = grandRow + 3;
  summary.getCell(`A${baselineHeader}`).value = 'Baseline (locked snapshot — what you started with)';
  summary.getCell(`A${baselineHeader}`).font = { bold: true, italic: true };
  summary.mergeCells(`A${baselineHeader}:F${baselineHeader}`);

  const baselineRow = baselineHeader + 1;
  ['Department', 'Bi-Weekly Pay (baseline)', 'Monthly Pay (baseline)', 'Δ Bi-Weekly Pay', 'Δ Monthly Pay', '% Cut']
    .forEach((h, i) => {
      const c = summary.getCell(baselineRow, i + 1);
      c.value = h;
      c.font = HEADER_FONT;
      c.fill = HEADER_FILL;
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
  summary.getRow(baselineRow).height = 28;

  let baselineGrandPay = 0;
  DEPARTMENTS.forEach((d, idx) => {
    const r = baselineRow + 1 + idx;
    const b = baselineByDept.get(d.num);
    baselineGrandPay += b.pay;
    summary.getCell(`A${r}`).value = d.label;
    summary.getCell(`B${r}`).value = b.pay;
    summary.getCell(`C${r}`).value = b.pay * MULTIPLIER;
    summary.getCell(`D${r}`).value = { formula: `D${summaryDeptStart + idx}-B${r}` };
    summary.getCell(`E${r}`).value = { formula: `F${summaryDeptStart + idx}-C${r}` };
    summary.getCell(`F${r}`).value = { formula: `IF(B${r}=0,0,(B${r}-D${summaryDeptStart + idx})/B${r})` };

    summary.getCell(`B${r}`).numFmt = '"$"#,##0.00';
    summary.getCell(`C${r}`).numFmt = '"$"#,##0.00';
    summary.getCell(`D${r}`).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
    summary.getCell(`E${r}`).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
    summary.getCell(`F${r}`).numFmt = '0.0%';
    if (idx % 2 === 0) {
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
        summary.getCell(`${col}${r}`).fill = ZEBRA_FILL;
      });
    }
  });

  const baselineTotalR = baselineRow + 1 + DEPARTMENTS.length;
  summary.getCell(`A${baselineTotalR}`).value = 'GRAND TOTAL';
  summary.getCell(`B${baselineTotalR}`).value = baselineGrandPay;
  summary.getCell(`C${baselineTotalR}`).value = baselineGrandPay * MULTIPLIER;
  summary.getCell(`D${baselineTotalR}`).value = { formula: `D${grandRow}-B${baselineTotalR}` };
  summary.getCell(`E${baselineTotalR}`).value = { formula: `F${grandRow}-C${baselineTotalR}` };
  summary.getCell(`F${baselineTotalR}`).value = {
    formula: `IF(B${baselineTotalR}=0,0,(B${baselineTotalR}-D${grandRow})/B${baselineTotalR})`,
  };
  summary.getRow(baselineTotalR).font = { bold: true };
  summary.getCell(`B${baselineTotalR}`).numFmt = '"$"#,##0.00';
  summary.getCell(`C${baselineTotalR}`).numFmt = '"$"#,##0.00';
  summary.getCell(`D${baselineTotalR}`).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
  summary.getCell(`E${baselineTotalR}`).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
  summary.getCell(`F${baselineTotalR}`).numFmt = '0.0%';
  summary.getRow(baselineTotalR).eachCell((cell) => {
    cell.border = { top: { style: 'double' } };
  });

  // Notes
  const notesStart = baselineTotalR + 3;
  summary.getCell(`A${notesStart}`).value = 'How to use this workbook';
  summary.getCell(`A${notesStart}`).font = { bold: true };
  const notes = [
    '1. Go to the "Employee Roster" sheet. The yellow cells are editable: Include? (Y/N), Bi-Weekly Hours, Bi-Weekly Pay.',
    '2. To simulate cutting an employee, set their Include? to N. Their hours and pay drop out of the totals immediately.',
    '3. To model a pay/hours change, edit the yellow Hours or Pay cell. Monthly columns recalculate automatically.',
    '4. This "Department Summary" sheet shows the live result (top block) vs the locked starting baseline (bottom block) so you can see the delta and % cut by department.',
    '5. The Run-Rate Multiplier (B2) defaults to 26/12 ≈ 2.1667 (annualized). Change it to 2.0 if you prefer a "two paychecks per month" view.',
    '6. Employees appearing in multiple departments (e.g. Akins, Glover, House, Williams) have one row per department — cut them independently.',
    '7. The "Payroll Detail" sheet keeps the raw source rows (Regular / OT / PTO / Reimb) for audit. It is not used in the totals.',
  ];
  notes.forEach((n, i) => {
    const c = summary.getCell(`A${notesStart + 1 + i}`);
    c.value = n;
    c.alignment = { wrapText: true, vertical: 'top' };
    summary.mergeCells(`A${notesStart + 1 + i}:F${notesStart + 1 + i}`);
    summary.getRow(notesStart + 1 + i).height = 28;
  });

  // =========================================================================
  // Sheet 3: Payroll Detail (raw, audit-only)
  // =========================================================================
  const detail = wb.addWorksheet('Payroll Detail', { views: [{ state: 'frozen', ySplit: 1 }] });
  detail.columns = [
    { header: 'Dept #', key: 'deptNum', width: 8 },
    { header: 'Department', key: 'department', width: 22 },
    { header: 'Acct #', key: 'acctNum', width: 8 },
    { header: 'Chart of Accounts', key: 'account', width: 26 },
    { header: 'Employee Name', key: 'employee', width: 30 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Hours', key: 'hours', width: 12 },
    { header: 'Dollars', key: 'dollars', width: 14 },
  ];
  detail.getRow(1).eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  detail.getRow(1).height = 28;
  detailRows.forEach((r, i) => {
    detail.addRow({
      deptNum: r[0], department: r[1], acctNum: r[2], account: r[3],
      employee: r[4], category: r[5], hours: r[6], dollars: r[7],
    });
    if (i % 2 === 1) {
      detail.getRow(i + 2).eachCell({ includeEmpty: false }, (cell) => {
        cell.fill = ZEBRA_FILL;
      });
    }
  });
  detail.getColumn('hours').numFmt = '0.00';
  detail.getColumn('dollars').numFmt = '"$"#,##0.00';
  const detailTotalRow = detail.addRow({
    deptNum: '', department: '', acctNum: '', account: '',
    employee: 'TOTAL (raw)', category: '',
    hours: { formula: `SUM(G2:G${detailRows.length + 1})` },
    dollars: { formula: `SUM(H2:H${detailRows.length + 1})` },
  });
  detailTotalRow.font = { bold: true };
  detailTotalRow.getCell('hours').numFmt = '0.00';
  detailTotalRow.getCell('dollars').numFmt = '"$"#,##0.00';
  detailTotalRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin' } };
  });
  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } };

  // Make the Roster the active sheet on open
  roster.state = 'visible';
  wb.views = [{ activeTab: 0 }];

  // -------- Write file --------
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(OUT_FILE);

  // Sanity-check totals to console
  const tot = {};
  DEPARTMENTS.forEach((d) => (tot[d.label] = { headcount: 0, hours: 0, pay: 0 }));
  aggregated.forEach((a) => {
    const d = DEPARTMENTS.find((x) => x.num === a.deptNum);
    if (!d) return;
    tot[d.label].headcount += 1;
    tot[d.label].hours += a.hours;
    tot[d.label].pay += a.dollars;
  });
  console.log(`Wrote ${OUT_FILE}`);
  console.log('Aggregated baseline (per dept):');
  let H = 0, P = 0, HC = 0;
  DEPARTMENTS.forEach((d) => {
    const t = tot[d.label];
    H += t.hours; P += t.pay; HC += t.headcount;
    console.log(
      `  ${d.label.padEnd(11)} headcount=${String(t.headcount).padStart(3)}  hrs=${t.hours.toFixed(2).padStart(8)}  $=${t.pay.toFixed(2).padStart(12)}  monthly=$${(t.pay * MULTIPLIER).toFixed(2)}`,
    );
  });
  console.log(`  ${'GRAND'.padEnd(11)} headcount=${String(HC).padStart(3)}  hrs=${H.toFixed(2).padStart(8)}  $=${P.toFixed(2).padStart(12)}  monthly=$${(P * MULTIPLIER).toFixed(2)}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
