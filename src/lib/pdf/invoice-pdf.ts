import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { wrapText } from "./wrap-text";

// Deliberately a plain data shape (not the Prisma model directly) so this
// module has no dependency on generated Prisma types.
export type InvoicePdfData = {
  number: number;
  status: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  lineItems: { description: string; quantity: number; rate: number; amount: number }[];
  client: { name: string; email: string; address: string | null };
  business: { name: string | null; address: string | null };
};

const PAGE_WIDTH = 595.28; // A4 at 72dpi
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export async function generateInvoicePdf(invoice: InvoicePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  // --- Header: business info (left) + invoice meta (right) ---
  const businessName = invoice.business.name ?? "Invoice";
  page.drawText(businessName, { x: MARGIN, y, size: 16, font: bold });

  const invoiceLabel = `INVOICE #${invoice.number}`;
  page.drawText(invoiceLabel, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(invoiceLabel, 14),
    y,
    size: 14,
    font: bold,
  });

  y -= 20;

  if (invoice.business.address) {
    for (const line of wrapText(invoice.business.address, font, 10, 250)) {
      page.drawText(line, { x: MARGIN, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 13;
    }
  }

  const statusLabel = invoice.status;
  page.drawText(statusLabel, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(statusLabel, 10),
    y: PAGE_HEIGHT - MARGIN - 20,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 20;

  // --- Bill to / dates ---
  page.drawText("Bill to", { x: MARGIN, y, size: 10, font: bold });
  page.drawText("Issue date", {
    x: PAGE_WIDTH - MARGIN - 200,
    y,
    size: 10,
    font: bold,
  });
  page.drawText("Due date", {
    x: PAGE_WIDTH - MARGIN - 80,
    y,
    size: 10,
    font: bold,
  });
  y -= 15;

  page.drawText(invoice.client.name, { x: MARGIN, y, size: 10, font });
  page.drawText(formatDate(invoice.issueDate), {
    x: PAGE_WIDTH - MARGIN - 200,
    y,
    size: 10,
    font,
  });
  page.drawText(formatDate(invoice.dueDate), {
    x: PAGE_WIDTH - MARGIN - 80,
    y,
    size: 10,
    font,
  });
  y -= 13;

  page.drawText(invoice.client.email, { x: MARGIN, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 13;

  if (invoice.client.address) {
    for (const line of wrapText(invoice.client.address, font, 10, 250)) {
      page.drawText(line, { x: MARGIN, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 13;
    }
  }

  y -= 15;

  // --- Line items table ---
  const colDescription = MARGIN;
  const colQty = MARGIN + 300;
  const colRate = MARGIN + 360;
  const colAmount = PAGE_WIDTH - MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: y - 5,
    width: CONTENT_WIDTH,
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });
  page.drawText("Description", { x: colDescription + 5, y, size: 9, font: bold });
  page.drawText("Qty", { x: colQty, y, size: 9, font: bold });
  page.drawText("Rate", { x: colRate, y, size: 9, font: bold });
  drawRightAligned(page, "Amount", colAmount - 5, y, 9, bold);
  y -= 25;

  for (const item of invoice.lineItems) {
    const descLines = wrapText(item.description, font, 9, 290);
    const rowHeight = Math.max(descLines.length, 1) * 12;

    if (y - rowHeight < MARGIN + 100) {
      // Simple overflow handling: start a fresh page rather than running off
      // the bottom. Multi-page invoices with very long item lists are rare
      // for this kind of tool, so we don't repeat the table header here.
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    descLines.forEach((line, i) => {
      page.drawText(line, { x: colDescription + 5, y: y - i * 12, size: 9, font });
    });
    page.drawText(String(item.quantity), { x: colQty, y, size: 9, font });
    page.drawText(item.rate.toFixed(2), { x: colRate, y, size: 9, font });
    drawRightAligned(page, item.amount.toFixed(2), colAmount - 5, y, 9, font);

    y -= rowHeight + 8;
  }

  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

  // --- Totals ---
  drawRightAligned(page, `Subtotal: ${invoice.currency} ${invoice.subtotal.toFixed(2)}`, colAmount - 5, y, 10, font);
  y -= 15;
  drawRightAligned(
    page,
    `Tax (${invoice.taxRate}%): ${invoice.currency} ${invoice.taxAmount.toFixed(2)}`,
    colAmount - 5,
    y,
    10,
    font
  );
  y -= 18;
  drawRightAligned(page, `Total: ${invoice.currency} ${invoice.total.toFixed(2)}`, colAmount - 5, y, 12, bold);

  y -= 30;

  // --- Notes ---
  if (invoice.notes) {
    page.drawText("Notes", { x: MARGIN, y, size: 10, font: bold });
    y -= 15;
    for (const line of wrapText(invoice.notes, font, 9, CONTENT_WIDTH)) {
      page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 12;
    }
  }

  return pdfDoc.save();
}

function drawRightAligned(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
