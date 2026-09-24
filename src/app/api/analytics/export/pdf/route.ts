import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prepareExportData } from "@/lib/analytics-export-helpers";
import { generateAnalyticsPdf } from "@/lib/pdf/analytics-pdf";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { report, businessName, insights, forecast } = await prepareExportData(
    session.user.id,
    searchParams
  );

  const pdfBytes = await generateAnalyticsPdf({ report, businessName, insights, forecast });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analytics-report.pdf"`,
    },
  });
}
