import { NextResponse } from "next/server";
import { BeoProposalError, createBeoProposal } from "@/lib/beo-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    return NextResponse.json(await createBeoProposal(id));
  } catch (error) {
    if (error instanceof BeoProposalError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
