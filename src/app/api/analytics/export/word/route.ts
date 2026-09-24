import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prepareExportData } from "@/lib/analytics-export-helpers";
import { generateAnalyticsDocx } from "@/lib/docs/analytics-docx";

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

  const buffer = await generateAnalyticsDocx({ report, businessName, insights, forecast });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="analytics-report.docx"`,
    },
  });
}
