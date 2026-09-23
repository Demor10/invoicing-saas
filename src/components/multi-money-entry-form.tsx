"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  multiMoneyEntrySchema,
  type MultiMoneyEntryValues,
  type MultiMoneyEntryInput,
} from "@/lib/validation/money-entry";

function blankEntry() {
  return {
    date: new Date().toISOString().slice(0, 10),
    currency: "USD",
    description: "",
    amount: 0,
    category: "",
  };
}

export function MultiMoneyEntryForm({
  kind,
  bulkApiUrl,
  redirectTo,
}: {
  kind: "sale" | "expense";
  bulkApiUrl: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MultiMoneyEntryInput, unknown, MultiMoneyEntryValues>({
    resolver: zodResolver(multiMoneyEntrySchema),
    defaultValues: { entries: [blankEntry()] } as MultiMoneyEntryInput,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });

  const amountLabel = kind === "sale" ? "Amount received" : "Amount spent";

  const onSubmit = async (values: MultiMoneyEntryValues) => {
    setServerError(null);

    const res = await fetch(bulkApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: values.entries }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {kind === "sale" ? "Sale" : "Expense"} #{index + 1}
              </p>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  {...register(`entries.${index}.date`)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
                {errors.entries?.[index]?.date && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.entries[index]?.date?.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={kind === "sale" ? "e.g. Product sales" : "e.g. Software, Rent"}
                  {...register(`entries.${index}.category`)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                {...register(`entries.${index}.description`)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
              {errors.entries?.[index]?.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.entries[index]?.description?.message}
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{amountLabel}</label>
                <input
                  type="number"
                  step="any"
                  {...register(`entries.${index}.amount`)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
                {errors.entries?.[index]?.amount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.entries[index]?.amount?.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <input
                  type="text"
                  {...register(`entries.${index}.currency`)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append(blankEntry())}
        className="text-sm font-medium text-gray-900 underline hover:text-gray-700"
      >
        + Add another {kind}
      </button>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isSubmitting
          ? "Saving..."
          : `Save ${fields.length > 1 ? `all ${fields.length} ${kind}s` : kind}`}
      </button>
    </form>
  );
}
