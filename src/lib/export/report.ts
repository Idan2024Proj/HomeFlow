import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "@/lib/utils/money";

export type ReportPayload = {
  title: string;
  periodLabel: string;
  income: number;
  expense: number;
  balance: number;
  transactions: Array<{
    occurred_on: string;
    merchant_name: string;
    type: string;
    amount: number;
    category?: string;
  }>;
  categories: Array<{ name: string; amount: number }>;
};

export async function buildExcelReport(payload: ReportPayload): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HomeFlow";

  const summary = wb.addWorksheet("Summary");
  summary.addRows([
    ["HomeFlow Report"],
    ["Period", payload.periodLabel],
    ["Income", payload.income],
    ["Expenses", payload.expense],
    ["Balance", payload.balance],
  ]);

  const tx = wb.addWorksheet("Transactions");
  tx.addRow(["Date", "Merchant", "Type", "Category", "Amount"]);
  for (const row of payload.transactions) {
    tx.addRow([
      row.occurred_on,
      row.merchant_name,
      row.type,
      row.category ?? "",
      row.amount,
    ]);
  }

  const incomeSheet = wb.addWorksheet("Income");
  incomeSheet.addRow(["Date", "Source", "Amount"]);
  for (const row of payload.transactions.filter((t) => t.type === "income")) {
    incomeSheet.addRow([row.occurred_on, row.merchant_name, row.amount]);
  }

  const expenseSheet = wb.addWorksheet("Expenses");
  expenseSheet.addRow(["Date", "Merchant", "Category", "Amount"]);
  for (const row of payload.transactions.filter((t) => t.type === "expense")) {
    expenseSheet.addRow([
      row.occurred_on,
      row.merchant_name,
      row.category ?? "",
      row.amount,
    ]);
  }

  const cats = wb.addWorksheet("Categories");
  cats.addRow(["Category", "Amount"]);
  for (const c of payload.categories) {
    cats.addRow([c.name, c.amount]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function buildPdfReport(payload: ReportPayload): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  // Basic Latin report (full Hebrew PDF fonts need embedded TTF — Phase polish)
  doc.setFontSize(16);
  doc.text("HomeFlow Report", 40, 40);
  doc.setFontSize(11);
  doc.text(`Period: ${payload.periodLabel}`, 40, 64);
  doc.text(`Income: ${formatMoney(payload.income)}`, 40, 84);
  doc.text(`Expenses: ${formatMoney(payload.expense)}`, 40, 102);
  doc.text(`Balance: ${formatMoney(payload.balance)}`, 40, 120);

  autoTable(doc, {
    startY: 140,
    head: [["Date", "Merchant", "Type", "Amount"]],
    body: payload.transactions.slice(0, 40).map((t) => [
      t.occurred_on,
      t.merchant_name,
      t.type,
      formatMoney(t.amount),
    ]),
  });

  return doc.output("blob");
}
