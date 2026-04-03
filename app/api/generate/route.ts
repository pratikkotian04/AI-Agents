import { NextResponse } from "next/server";
import { createJobRequirement } from "@/lib/job-requirement-workflow";
import { jobRequirementInputSchema } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = jobRequirementInputSchema.parse(body);
    const result = await createJobRequirement(input);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
