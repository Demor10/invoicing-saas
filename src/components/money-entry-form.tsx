"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  moneyEntrySchema,
  type MoneyEntryFormValues,
  type MoneyEntryFormInput,
} from "@/lib/validation/money-entry";

export function MoneyEntryForm({
  kind,
  defaultValues,
  onSubmit,
}: {
  kind: "sale" | "expense";
  defaultValues?: Partial<MoneyEntryFormInput>;
  onSubmit: (values: MoneyEntryFormValues) => Promise<string | void>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MoneyEntryFormInput, unknown, MoneyEntryFormValues>({
    resolver: zodResolver(moneyEntrySchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      currency: "USD",
      ...defaultValues,
    } as MoneyEntryFormInput,
  });

  const submit = async (values: MoneyEntryFormValues) => {
    const errorMessage = await onSubmit(values);
    if (errorMessage) {
      setError("root", { message: errorMessage });
    }
  };

  const amountLabel = kind === "sale" ? "Amount received" : "Amount spent";

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            {...register("date")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="category"
            type="text"
            placeholder={kind === "sale" ? "e.g. Product sales" : "e.g. Software, Rent"}
            {...register("category")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          id="description"
          type="text"
          {...register("description")}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            {amountLabel}
          </label>
          <input
            id="amount"
            type="number"
            step="any"
            {...register("amount")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
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

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : `Save ${kind}`}
      </button>
    </form>
  );
}
