"use client";

import axios from "axios";
import { toast } from "sonner";
import useSWR, { mutate } from 'swr';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import { Message } from "@/types/llm-response";
import { v4 as uuidv4 } from "uuid";

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export function useConversation(conversationId: string | null, setSuggestions?: (suggestions: string[]) => void) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  // SWR is used only when we have a conversationId (existing conversation)
  const { data: swrMessages = [], mutate: mutateMessages, error } = useSWR<Message[]>(
    user && conversationId ? `/api/chat/${conversationId}` : null,
    fetcher,
    {
      onError: (err) => {
        console.error(err);
        if (conversationId) {
          toast.error(`Unable to load conversation ${conversationId}`);
          router.push('/chat');
        }
      }
    }
  );

  // Local messages state for new conversations (no conversationId yet)
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Track whether we're in "new conversation" mode
  const isNewConversation = conversationId === null;
  const messages = isNewConversation ? localMessages : swrMessages;

  const handleSendMessage = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim() || !user) return;
    // For existing conversations, conversationId is required
    if (!isNewConversation && !conversationId) return;

    if (setSuggestions) {
      setSuggestions([]);
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: userPrompt,
      timestamp: new Date(),
    };

    // Create placeholder assistant message for streaming
    const assistantMessageId = uuidv4();
    const streamingMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    if (isNewConversation) {
      // For new conversations, use local state
      setLocalMessages([userMessage, streamingMessage]);
    } else {
      // For existing conversations, use SWR mutate
      await mutateMessages(prev => [...(prev || []), userMessage], false);
      await mutateMessages(prev => [...(prev || []), streamingMessage], false);
    }

    setIsSendingMessage(true);

    // Helper to update a specific message by ID
    const updateMessage = (id: string, updater: (msg: Message) => Message) => {
      if (isNewConversation) {
        setLocalMessages(prev => prev.map(msg => msg.id === id ? updater(msg) : msg));
      } else {
        mutateMessages(prev => prev?.map(msg => msg.id === id ? updater(msg) : msg) || [], false);
      }
    };

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt,
          ...(conversationId ? { conversationId } : {}),
        }),
      });

      if (!response.ok) {
        toast.error("Daily quota limit exceeded. Please try again tomorrow.");
        router.push('/chat');
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let newTitleGenerated = false;
      let newConversationId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'metadata') {
                // New conversation: capture the conversationId from the stream
                newConversationId = data.conversationId;
              } else if (data.type === 'content') {
                updateMessage(assistantMessageId, msg => ({
                  ...msg,
                  content: msg.content + data.content,
                }));
              } else if (data.type === 'complete') {
                updateMessage(assistantMessageId, msg => ({
                  ...msg,
                  id: data.messageId,
                  timestamp: new Date(data.timestamp),
                  isStreaming: false,
                }));
                newTitleGenerated = data.newTitleGenerated;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      }

      if (newTitleGenerated) {
        mutate("/api/conversations");
      }

      // For new conversations, navigate to the created conversation
      if (isNewConversation && newConversationId) {
        router.push(`/chat/${newConversationId}`);
      }

    } catch (error: unknown) {
      console.error("Error sending message:", error);
      toast.error("Daily quota limit exceeded. Please try again tomorrow.");

      if (isNewConversation) {
        // Reset local messages on error
        setLocalMessages([]);
      } else {
        // Remove both user and assistant messages on error
        await mutateMessages(prev => prev?.slice(0, -2) || [], false);
      }
    } finally {
      setIsSendingMessage(false);
    }
  }, [user, conversationId, isNewConversation, mutateMessages, router, setSuggestions]);

  // Reset local messages (useful for NewChatWelcome to restore welcome state on error)
  const resetMessages = useCallback(() => {
    setLocalMessages([]);
  }, []);

  return {
    messages,
    isLoading: !isNewConversation && !swrMessages && !error,
    isSendingMessage,
    handleSendMessage,
    resetMessages,
  };
}