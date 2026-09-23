import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prepareExportData } from "@/lib/analytics-export-helpers";
import { generateAnalyticsXlsx } from "@/lib/excel/analytics-xlsx";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { report, businessName, aiNarrative } = await prepareExportData(
    session.user.id,
    searchParams
  );

  const buffer = await generateAnalyticsXlsx({ report, businessName, aiNarrative });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analytics-report.xlsx"`,
    },
  });
}
