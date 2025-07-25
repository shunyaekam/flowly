import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    try {
      const prediction = await replicate.predictions.cancel(id);
      return NextResponse.json(prediction);
    } catch (replicateError) {
      // If the prediction is already completed/failed, Replicate may return an error
      // In this case, we should still return success since the goal (stopping generation) is achieved
      console.log("Replicate cancellation note:", replicateError);
      return NextResponse.json({ 
        status: "canceled", 
        message: "Prediction cancellation requested" 
      });
    }
  } catch (error) {
    console.error("Prediction cancellation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}