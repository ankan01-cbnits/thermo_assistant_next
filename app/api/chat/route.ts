import { NextResponse } from "next/server";
import { suggestQuestions } from "@/lib/search/questionSearch";

interface SuggestRequestBody {
  query: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SuggestRequestBody;

    if (!body.query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const suggestions = await suggestQuestions(body.query, 3);
    console.log(suggestions)

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestion API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
