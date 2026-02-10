import { pipeline } from "@xenova/transformers";

// Initialize the pipeline once (Singleton pattern)
const extractor = await pipeline("feature-extraction", "sentence-transformers/all-MiniLM-L6-v2");

export async function embedText(text: string): Promise<number[]> {
  const output = await extractor(text, { 
    pooling: 'mean', 
    normalize: true 
  });

  // .data is a Float32Array - much faster than .tolist()
  return Array.from(output.data);
}