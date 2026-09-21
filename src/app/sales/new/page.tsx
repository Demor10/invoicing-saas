import { NewMoneyEntryForm } from "@/components/new-money-entry-form";

export default function NewSalePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Record sale</h1>
      <div className="mt-6">
        <NewMoneyEntryForm kind="sale" apiBase="/api/sales" redirectTo="/sales" />
      </div>
    </div>
  );
}
