import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = process.env.INDEX_NAME!;

export const pineconeIndex = pinecone.index(INDEX_NAME);
export async function doesIndexExist(): Promise<boolean> {
  const indexes = await pinecone.listIndexes();
  return (
    indexes.indexes?.some((index) => index.name === INDEX_NAME) ?? false
  );
}

export async function ensureIndexExists() {
  const exists = await doesIndexExist();

  if (!exists) {
    console.log("🧱 Creating Pinecone index:", INDEX_NAME);

    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 384, // ✅ MiniLM dimension
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    // ⏳ Wait until Pinecone actually provisions it
    await new Promise((resolve) => setTimeout(resolve, 10_000));

    console.log("✅ Pinecone index created");
  }
}

/**
 * Safe empty check (ONLY after ensureIndexExists)
 */
export async function isIndexEmpty(): Promise<boolean> {
  const stats = await pineconeIndex.describeIndexStats();
  return (stats.totalRecordCount ?? 0) === 0;
}
