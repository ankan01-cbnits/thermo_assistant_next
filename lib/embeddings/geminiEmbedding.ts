import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

const extractor: FeatureExtractionPipeline = await pipeline(
  "feature-extraction",
  "sentence-transformers/all-MiniLM-L6-v2"
);

export async function embedText(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("Cannot embed empty text");
  }

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  const array = await output.tolist();
  // array shape: [1][384]
  return array[0];
}