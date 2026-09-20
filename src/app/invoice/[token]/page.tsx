import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDisplayStatus } from "@/lib/invoice-status";

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      user: {
        select: { businessName: true, businessAddress: true, businessLogoUrl: true },
      },
    },
  });

  // A draft invoice isn't "out" yet — treat its link as if it doesn't exist
  // in case it was shared or guessed before the owner actually sent it.
  if (!invoice || invoice.status === "DRAFT") {
    notFound();
  }

  const displayStatus = getDisplayStatus(invoice.status, invoice.dueDate);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between border-b border-gray-200 pb-6">
        <div>
          {invoice.user.businessLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external, unknown-dimension logo URLs supplied by the user
            <img
              src={invoice.user.businessLogoUrl}
              alt={invoice.user.businessName ?? "Business logo"}
              className="mb-2 h-10 w-auto object-contain"
            />
          )}
          <p className="text-lg font-semibold text-gray-900">
            {invoice.user.businessName ?? "Invoice"}
          </p>
          {invoice.user.businessAddress && (
            <p className="whitespace-pre-wrap text-sm text-gray-500">
              {invoice.user.businessAddress}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[displayStatus] ?? "bg-gray-100 text-gray-700"}`}
        >
          {displayStatus}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Invoice</p>
          <p className="text-gray-900">#{invoice.number}</p>
        </div>
        <div>
          <p className="text-gray-500">Bill to</p>
          <p className="text-gray-900">{invoice.client.name}</p>
          <p className="text-gray-500">{invoice.client.email}</p>
        </div>
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
          <span>Total due</span>
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

      <div className="mt-8 flex items-center justify-between rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        <span>
          {invoice.status === "PAID"
            ? "This invoice has been paid. Thank you!"
            : "Online payment isn't set up yet — you'll be able to pay this invoice here soon."}
        </span>
        <a
          href={`/api/invoice/${invoice.publicToken}/pdf`}
          className="font-medium text-gray-700 underline hover:text-gray-900"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
