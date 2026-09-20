import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarkInvoiceSentButton } from "@/components/mark-invoice-sent-button";
import { DeleteInvoiceButton } from "@/components/delete-invoice-button";
import { PublicLinkField } from "@/components/public-link-field";
import { getPublicUrl } from "@/lib/public-url";
import { getDisplayStatus } from "@/lib/invoice-status";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, client: true },
  });

  if (!invoice) notFound();

  const displayStatus = getDisplayStatus(invoice.status, invoice.dueDate);
  const publicUrl = getPublicUrl(`/invoice/${invoice.publicToken}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Invoice #{invoice.number}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {invoice.client.name} · {invoice.client.email}
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {displayStatus}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Issue date</p>
          <p className="text-gray-900">{invoice.issueDate.toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Due date</p>
          <p className="text-gray-900">{invoice.dueDate.toLocaleDateString()}</p>
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Rate</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2 text-gray-900">{item.description}</td>
              <td className="py-2 text-gray-700">{item.quantity}</td>
              <td className="py-2 text-gray-700">{item.rate.toFixed(2)}</td>
              <td className="py-2 text-right text-gray-900">{item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>
            {invoice.currency} {invoice.subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax ({invoice.taxRate}%)</span>
          <span>
            {invoice.currency} {invoice.taxAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>
            {invoice.currency} {invoice.total.toFixed(2)}
          </span>
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-6 text-sm">
          <p className="text-gray-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-900">{invoice.notes}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/invoices"
          className="text-sm text-gray-600 underline hover:text-gray-900"
        >
          ← Back to invoices
        </Link>

        {invoice.status === "DRAFT" && (
          <div className="flex items-center gap-4">
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
            >
              Edit
            </Link>
            <DeleteInvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.number} />
            <MarkInvoiceSentButton invoiceId={invoice.id} />
          </div>
        )}
      </div>

      {invoice.status !== "DRAFT" && (
        <div className="mt-6 rounded-md border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700">Client-facing link</p>
          <p className="mt-1 text-xs text-gray-500">
            Anyone with this link can view the invoice — no login required. Automatic
            emailing comes in a later step; for now, copy and send it yourself.
          </p>
          <div className="mt-3">
            <PublicLinkField url={publicUrl} />
          </div>
          {invoice.status !== "PAID" && (
            <p className="mt-2 text-xs text-gray-400">
              Online payment isn&apos;t enabled yet — that&apos;s a later step too.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
