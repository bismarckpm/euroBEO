import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { cropFile } from "@/lib/budget-store";

type RouteContext = { params: Promise<{ id: string; cropId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id, cropId } = await context.params;
  const budget = await getPrisma().budget.findFirst({
    where: { eventId: id },
    orderBy: { version: "desc" },
  });
  if (!budget) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const bytes = await readFile(cropFile(budget.id, cropId));
    return new NextResponse(bytes, { headers: { "Content-Type": "image/png" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
