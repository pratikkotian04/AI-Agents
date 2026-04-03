import { NextResponse } from "next/server";
import { z } from "zod";

import { HOUSING_TYPES, INDIAN_CITIES } from "@/lib/constants";
import { runRentalSearch } from "@/lib/search/orchestrator";

export const runtime = "nodejs";

const searchSchema = z.object({
  city: z.enum(INDIAN_CITIES),
  locality: z.string().min(2).max(80),
  budget: z.coerce.number().int().positive().max(500000),
  housingType: z.enum(HOUSING_TYPES),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const filters = searchSchema.parse(payload);
    const data = await runRentalSearch(filters);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Please provide a valid Indian city, locality, budget, and housing type.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Something went wrong while searching.",
      },
      { status: 500 },
    );
  }
}
