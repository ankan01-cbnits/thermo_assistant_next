import { NextResponse } from "next/server";
import { isIndexEmpty } from "@/lib/vector/pinecone";

export async function POST() {
  const empty = await isIndexEmpty();

  if (empty) {
    const { ingestIfNeeded } = await import("@/scripts/ingest"); // dynamic import
    await ingestIfNeeded();
  }

  return NextResponse.json({ status: "ok" });
}
