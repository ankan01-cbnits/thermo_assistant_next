'use server';

import { prisma } from "@/lib/prisma";
import { geminiModel } from "@/lib/gemini";

/* ----------------------------- Types ----------------------------- */

export type MessageType = {
  role: "user" | "assistant";
  content: string;
};

/* ------------------------ Helper Functions ------------------------ */

function isTrivialConversation(messages: MessageType[]): boolean {
  const fullUserText = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const greetings = [
    "hi",
    "hello",
    "hey",
    "how are you",
    "good morning",
    "good evening",
    "what's up",
    "sup",
    "yo",
    "hello there",
    "hi there",
  ];

  const isShort = fullUserText.replace(/\s+/g, "").length < 40;
  const isMostlyGreeting = greetings.some(greet =>
    fullUserText.includes(greet)
  );

  return isShort && isMostlyGreeting;
}

/* ------------------------- Server Action -------------------------- */

export async function generateTitle(
  conversationId: string,
  messages: MessageType[]
) {
  if (isTrivialConversation(messages)) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: "New chat" },
    });

    return { success: true, newTitle: "New chat" };
  }

  // Convert chat history to Gemini format
  const contents = [
    {
      role: "user",
      parts: [
        {
          text:
            "You are an expert at creating short, concise titles for conversations. " +
            "Return a 2–5 word noun phrase. Do not use quotation marks.\n\n" +
            messages
              .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
              .join("\n"),
        },
      ],
    },
  ];

  try {
    const result = await geminiModel.generateContent({
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 25,
      },
    });

    const title = result.response.text()?.trim().slice(0, 100) || "New chat";

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });

    return { success: true, newTitle: title };
  } catch (error) {
    console.error("Error generating title:", error);
    return { success: false, error: "Failed to generate title" };
  }
}
