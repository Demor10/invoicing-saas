import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditClientForm } from "@/components/edit-client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Edit client</h1>
      <div className="mt-6">
        <EditClientForm
          clientId={client.id}
          defaultValues={{
            name: client.name,
            email: client.email,
            address: client.address ?? "",
            phone: client.phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
