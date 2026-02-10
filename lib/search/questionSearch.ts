import { embedText } from "@/lib/embeddings/geminiEmbedding";
import { pineconeIndex } from "@/lib/vector/pinecone";
import { QuestionMetadata } from "@/types/pinecone";

export async function suggestQuestions(
  userQuery: string,
  topK: number = 3
): Promise<string[]> {
  if (!userQuery || !userQuery.trim()) {
    return [];
  }

  const queryEmbedding = await embedText(userQuery);
  console.log(queryEmbedding)

  const result = await pineconeIndex.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });
  console.log(result)

  return (
    result.matches?.map(
      match => (match.metadata as QuestionMetadata).question
    ) ?? []
  );
}
