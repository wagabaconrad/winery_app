/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportData {
  period: string;
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  batchCount: number;
  chartData: { date: string; revenue: number; expenses: number; profit: number }[];
  bestSellers: { name: string; quantity: number; revenue: number }[];
  expenseBreakdown: { category: string; amount: number }[];
}

// ─── Shared download helper ──────────────────────────────────────────────────

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export function exportReportPDF(data: ReportData, businessName: string, currency: string): Blob {
  const doc = new jsPDF();
  const periodLabel = data.period.charAt(0).toUpperCase() + data.period.slice(1);

  // Header bar
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(businessName, 20, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${periodLabel} Report  ·  Generated ${new Date().toLocaleDateString()}`, 20, 30);

  // KPI summary
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Summary", 20, 52);

  autoTable(doc, {
    startY: 56,
    head: [["Metric", "Value"]],
    body: [
      ["Total Revenue", `${currency} ${data.totalRevenue.toLocaleString()}`],
      ["Total Expenses", `${currency} ${data.totalExpenses.toLocaleString()}`],
      ["Cost of Goods Sold", `${currency} ${data.totalCOGS.toLocaleString()}`],
      ["Net Profit", `${currency} ${data.netProfit.toLocaleString()}`],
      ["Total Sales", String(data.salesCount)],
      ["Production Batches", String(data.batchCount)],
    ],
    headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    alternateRowStyles: { fillColor: [243, 244, 246] },
  });

  // Period breakdown
  if (data.chartData.length > 0) {
    const y1 = (doc as any).lastAutoTable?.finalY + 10 || 120;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Period Breakdown", 20, y1);

    autoTable(doc, {
      startY: y1 + 4,
      head: [["Date", "Revenue", "Expenses", "Profit"]],
      body: data.chartData.map((row) => [
        row.date,
        `${currency} ${row.revenue.toLocaleString()}`,
        `${currency} ${row.expenses.toLocaleString()}`,
        `${currency} ${row.profit.toLocaleString()}`,
      ]),
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      alternateRowStyles: { fillColor: [243, 244, 246] },
    });
  }

  // Best sellers
  if (data.bestSellers.length > 0) {
    const y2 = (doc as any).lastAutoTable?.finalY + 10 || 160;
    if (y2 > 250) doc.addPage();
    const y2safe = y2 > 250 ? 20 : y2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text("Best Selling Products", 20, y2safe);

    autoTable(doc, {
      startY: y2safe + 4,
      head: [["#", "Product", "Qty Sold", "Revenue"]],
      body: data.bestSellers.map((p, i) => [
        String(i + 1),
        p.name,
        String(p.quantity),
        `${currency} ${p.revenue.toLocaleString()}`,
      ]),
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 15 }, 3: { halign: "right" } },
      alternateRowStyles: { fillColor: [243, 244, 246] },
    });
  }

  // Expense breakdown
  if (data.expenseBreakdown.length > 0) {
    const y3 = (doc as any).lastAutoTable?.finalY + 10 || 200;
    if (y3 > 250) doc.addPage();
    const y3safe = y3 > 250 ? 20 : y3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text("Expense Breakdown", 20, y3safe);

    autoTable(doc, {
      startY: y3safe + 4,
      head: [["Category", "Amount"]],
      body: data.expenseBreakdown.map((e) => [
        e.category,
        `${currency} ${e.amount.toLocaleString()}`,
      ]),
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
      alternateRowStyles: { fillColor: [243, 244, 246] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by Winery OS Intelligence", 20, 290);
    doc.text(`Page ${i} of ${pageCount}`, 170, 290);
  }

  return doc.output("blob");
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportReportCSV(data: ReportData, businessName: string, currency: string): Blob {
  const rows: string[][] = [];
  const periodLabel = data.period.charAt(0).toUpperCase() + data.period.slice(1);

  rows.push([`${businessName} — ${periodLabel} Report`]);
  rows.push([`Generated: ${new Date().toLocaleDateString()}`]);
  rows.push([]);

  // Summary
  rows.push(["FINANCIAL SUMMARY"]);
  rows.push(["Metric", "Value"]);
  rows.push(["Total Revenue", `${currency} ${data.totalRevenue.toLocaleString()}`]);
  rows.push(["Total Expenses", `${currency} ${data.totalExpenses.toLocaleString()}`]);
  rows.push(["Cost of Goods Sold", `${currency} ${data.totalCOGS.toLocaleString()}`]);
  rows.push(["Net Profit", `${currency} ${data.netProfit.toLocaleString()}`]);
  rows.push(["Total Sales", String(data.salesCount)]);
  rows.push(["Production Batches", String(data.batchCount)]);
  rows.push([]);

  // Period breakdown
  if (data.chartData.length > 0) {
    rows.push(["PERIOD BREAKDOWN"]);
    rows.push(["Date", "Revenue", "Expenses", "Profit"]);
    data.chartData.forEach((row) => {
      rows.push([row.date, String(row.revenue), String(row.expenses), String(row.profit)]);
    });
    rows.push([]);
  }

  // Best sellers
  if (data.bestSellers.length > 0) {
    rows.push(["BEST SELLING PRODUCTS"]);
    rows.push(["Rank", "Product", "Qty Sold", "Revenue"]);
    data.bestSellers.forEach((p, i) => {
      rows.push([String(i + 1), p.name, String(p.quantity), String(p.revenue)]);
    });
    rows.push([]);
  }

  // Expense breakdown
  if (data.expenseBreakdown.length > 0) {
    rows.push(["EXPENSE BREAKDOWN"]);
    rows.push(["Category", "Amount"]);
    data.expenseBreakdown.forEach((e) => {
      rows.push([e.category, String(e.amount)]);
    });
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
}
