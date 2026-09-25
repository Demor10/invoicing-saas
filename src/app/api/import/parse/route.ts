import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPaidUser } from "@/lib/subscription";
import { parseUploadedFile } from "@/lib/import/parse-file";
import { guessColumnMapping } from "@/lib/import/column-mapping";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPaidUser(session.user.id))) {
    return NextResponse.json(
      { error: "File upload analysis is a paid-plan feature." },
      { status: 403 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!/\.(csv|xlsx?)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Only .csv, .xls, or .xlsx files are supported" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large (5MB max)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseUploadedFile(buffer, file.name);
  } catch {
    return NextResponse.json(
      { error: "Couldn't read that file — make sure it's a valid CSV or Excel file." },
      { status: 400 }
    );
  }

  if (parsed.headers.length === 0) {
    return NextResponse.json({ error: "The file appears to be empty." }, { status: 400 });
  }

  const suggestedMapping = guessColumnMapping(parsed.headers);

  return NextResponse.json({
    headers: parsed.headers,
    rows: parsed.rows,
    truncated: parsed.truncated,
    suggestedMapping,
  });
}
