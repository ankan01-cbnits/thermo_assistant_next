import fs from "fs";
import path from "path";
// import pdf from "pdf-parse";
import { questions } from "@/constants/questions";
import { embedText } from "@/lib/embeddings/geminiEmbedding";
import { pineconeIndex } from "@/lib/vector/pinecone";
import type {
  PineconeRecord,
  RecordMetadata,
} from "@pinecone-database/pinecone";

/**
 * Extract text from PDF (Node-safe, no workers)
 */
// async function extractTextFromPdf(filePath: string): Promise<string> {
//   const buffer = fs.readFileSync(filePath);
//   const data = await pdf(buffer);
//   return data.text;
// }

export async function ingestIfNeeded(): Promise<void> {
  const vectors: PineconeRecord<RecordMetadata>[] = [];

  for (let i = 0; i < questions.length; i++) {
    const embedding = await embedText(questions[i]);

    vectors.push({
      id: `question-${i}`,
      values: embedding,
      metadata: {
        question: questions[i],
        source: "thermofisher_pdf",
      },
    });
  }

  const BATCH_SIZE = 100;

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    await pineconeIndex.upsert({
      records: vectors.slice(i, i + BATCH_SIZE),
    });
  }

  console.log("✅ Pinecone index populated");
}
