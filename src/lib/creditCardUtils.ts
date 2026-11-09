import { Card, Invoice, Transaction, InvoiceStatus } from "../types";
import { addMonths, setDate, format, isBefore, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { db } from "./firebase";
import { doc, increment } from "firebase/firestore";

/**
 * Calculates the billing month and year for a transaction based on the card's closing day.
 * If the transaction date is on or after the closing day of the current month,
 * it goes to the next month's invoice.
 */
export function getBillingPeriod(date: Date, closingDay: number) {
  const day = date.getDate();
  let billingDate = date;

  // Se dataCompra > dataFechamento: entra na próxima fatura
  if (day > closingDay) {
    billingDate = addMonths(date, 1);
  }

  return {
    month: billingDate.getMonth(),
    year: billingDate.getFullYear(),
  };
}

/**
 * Generates the closing and due dates for a given month and year.
 */
export function getInvoiceDates(month: number, year: number, closingDay: number, dueDay: number) {
  // Closing date is in the billing month
  let closingDate = setDate(new Date(year, month, 1), closingDay);
  
  // Due date is usually after closing date. If dueDay <= closingDay, it's next month.
  let dueMonth = month;
  let dueYear = year;
  if (dueDay <= closingDay) {
    const nextMonth = addMonths(new Date(year, month, 1), 1);
    dueMonth = nextMonth.getMonth();
    dueYear = nextMonth.getFullYear();
  }
  
  let dueDate = setDate(new Date(dueYear, dueMonth, 1), dueDay);

  return {
    closingDate: format(closingDate, "yyyy-MM-dd"),
    dueDate: format(dueDate, "yyyy-MM-dd"),
  };
}

/**
 * Calculates the installments for a transaction.
 */
export function calculateInstallments(
  totalValue: number,
  installments: number,
  startDate: Date,
  closingDay: number
) {
  const installmentValue = parseFloat((totalValue / installments).toFixed(2));
  const lastInstallmentValue = parseFloat((totalValue - installmentValue * (installments - 1)).toFixed(2));
  
  const result = [];
  let currentPeriod = getBillingPeriod(startDate, closingDay);

  for (let i = 1; i <= installments; i++) {
    const value = i === installments ? lastInstallmentValue : installmentValue;
    
    result.push({
      installmentNumber: i,
      value,
      month: currentPeriod.month,
      year: currentPeriod.year,
    });

    // Next installment is always next month
    const nextDate = addMonths(new Date(currentPeriod.year, currentPeriod.month, 1), 1);
    currentPeriod = {
      month: nextDate.getMonth(),
      year: nextDate.getFullYear(),
    };
  }

  return result;
}

/**
 * Formats the billing period as a string (e.g., "Maio 2024")
 */
export function formatBillingPeriod(month: number, year: number) {
  const date = new Date(year, month, 1);
  const monthName = format(date, "MMMM");
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

/**
 * Syncs an invoice for a given card and period.
 */
export async function syncInvoice(
  userId: string,
  cardId: string,
  month: number,
  year: number,
  value: number,
  closingDay: number,
  dueDay: number,
  transaction: any, // Firestore transaction object
  transactionId?: string
) {
  const invoiceId = `${cardId}_${year}_${month}`;
  const invoiceRef = doc(db, "invoices", invoiceId);
  const invoiceSnap = await transaction.get(invoiceRef);

  if (invoiceSnap.exists()) {
    const data = invoiceSnap.data();
    const items = data.items || [];
    if (transactionId && !items.includes(transactionId)) {
      items.push(transactionId);
    }
    
    transaction.update(invoiceRef, {
      totalValue: increment(value),
      items: items
    });
  } else {
    const { closingDate, dueDate } = getInvoiceDates(month, year, closingDay, dueDay);
    const newInvoice: Omit<Invoice, "id"> = {
      userId,
      cardId,
      month,
      year,
      totalValue: value,
      paidValue: 0,
      status: "open",
      closingDate,
      dueDate,
      items: transactionId ? [transactionId] : [],
      createdAt: new Date().toISOString()
    };
    transaction.set(invoiceRef, newInvoice);
  }
  
  return invoiceId;
}

/**
 * Checks and updates the status of an invoice based on dates.
 */
export async function checkInvoiceStatus(invoice: Invoice, closingDay: number, dueDay: number, transaction: any) {
  const now = new Date();
  const closingDate = parseISO(invoice.closingDate);
  const dueDate = parseISO(invoice.dueDate);
  
  let newStatus = invoice.status;
  
  if (invoice.status === "open" && isBefore(closingDate, now)) {
    newStatus = "closed";
  } else if (invoice.status === "closed" && isBefore(dueDate, now)) {
    newStatus = "overdue";
  }
  
  if (newStatus !== invoice.status) {
    const invoiceRef = doc(db, "invoices", invoice.id);
    transaction.update(invoiceRef, { status: newStatus });
    return newStatus;
  }
  
  return invoice.status;
}
