import { prisma } from "@/lib/prisma";

// Until the Stripe Billing step is built, there's no real checkout flow —
// flip a user's Subscription.plan to PAID directly in Supabase's Table
// Editor to test gated features in the meantime.
export async function isPaidUser(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });
  return subscription?.plan === "PAID";
}
