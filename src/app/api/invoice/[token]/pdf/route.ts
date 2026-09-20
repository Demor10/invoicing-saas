import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      user: { select: { businessName: true, businessAddress: true } },
    },
  });

  // Same rule as the public view page: a draft isn't "out" yet.
  if (!invoice || invoice.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await generateInvoicePdf({
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    taxRate: invoice.taxRate,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    notes: invoice.notes,
    lineItems: invoice.lineItems,
    client: invoice.client,
    business: { name: invoice.user.businessName, address: invoice.user.businessAddress },
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}
