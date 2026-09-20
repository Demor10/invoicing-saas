"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  invoiceSchema,
  type InvoiceFormValues,
  type InvoiceFormInput,
} from "@/lib/validation/invoice";
import { calculateInvoiceTotals, calculateLineAmount } from "@/lib/invoice-calculations";

type ClientOption = { id: string; name: string };

export function InvoiceForm({
  clients,
  defaultValues,
  onSubmit,
}: {
  clients: ClientOption[];
  defaultValues?: Partial<InvoiceFormInput>;
  onSubmit: (values: InvoiceFormValues) => Promise<string | void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    // react-hook-form needs the *pre-coercion* shape (InvoiceFormInput) for
    // the fields it renders, and the *post-coercion* shape (InvoiceFormValues,
    // real numbers) for what the submit handler receives — z.coerce fields
    // make those two types genuinely different, hence the two type params.
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "USD",
      taxRate: 0,
      lineItems: [{ description: "", quantity: 1, rate: 0 }],
      ...defaultValues,
    } as InvoiceFormInput,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  // Live preview of totals as the user types — purely cosmetic; the server
  // recalculates authoritatively and ignores anything the client sends here.
  const watchedLineItems = watch("lineItems");
  const watchedTaxRate = watch("taxRate");
  const totals = calculateInvoiceTotals(
    (watchedLineItems ?? []).map((item) => ({
      description: item?.description ?? "",
      quantity: Number(item?.quantity) || 0,
      rate: Number(item?.rate) || 0,
    })),
    Number(watchedTaxRate) || 0
  );

  const submit = async (values: InvoiceFormValues) => {
    const errorMessage = await onSubmit(values);
    if (errorMessage) {
      setError("root", { message: errorMessage });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
            Client
          </label>
          <select
            id="clientId"
            {...register("clientId")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.clientId && (
            <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            {...register("dueDate")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          {errors.dueDate && (
            <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Line items</h2>
          <button
            type="button"
            onClick={() => append({ description: "", quantity: 1, rate: 0 })}
            className="text-sm font-medium text-gray-900 underline hover:text-gray-700"
          >
            + Add line item
          </button>
        </div>

        <div className="mt-2 space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Description"
                  {...register(`lineItems.${index}.description`)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
                {errors.lineItems?.[index]?.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.lineItems[index]?.description?.message}
                  </p>
                )}
              </div>
              <div className="w-20">
                <input
                  type="number"
                  step="any"
                  placeholder="Qty"
                  {...register(`lineItems.${index}.quantity`)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  step="any"
                  placeholder="Rate"
                  {...register(`lineItems.${index}.rate`)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div className="w-24 pt-2 text-right text-sm text-gray-700">
                {calculateLineAmount({
                  description: "",
                  quantity: Number(watchedLineItems?.[index]?.quantity) || 0,
                  rate: Number(watchedLineItems?.[index]?.rate) || 0,
                }).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => fields.length > 1 && remove(index)}
                disabled={fields.length <= 1}
                className="pt-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-30"
                aria-label="Remove line item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {errors.lineItems?.root && (
          <p className="mt-1 text-sm text-red-600">{errors.lineItems.root.message}</p>
        )}
        {errors.lineItems?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.lineItems.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
            Tax rate (%)
          </label>
          <input
            id="taxRate"
            type="number"
            step="any"
            {...register("taxRate")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <input
            id="currency"
            type="text"
            {...register("currency")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          {...register("notes")}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1 border-t border-gray-200 pt-4 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax</span>
          <span>{totals.taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{totals.total.toFixed(2)}</span>
        </div>
      </div>

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save draft"}
      </button>
    </form>
  );
}
