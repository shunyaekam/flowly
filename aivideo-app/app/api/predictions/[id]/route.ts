import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get("x-replicate-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Replicate API key is required" },
        { status: 400 }
      );
    }

    const replicate = new Replicate({
      auth: apiKey,
    });

    const prediction = await replicate.predictions.get(id);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error("Prediction fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
