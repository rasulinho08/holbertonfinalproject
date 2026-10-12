import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { Endpoints } from '../endpoints';
import { qk } from '../queryKeys';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AssistantReply = { available: true; reply: string } | { available: false; reply: null };

/** Whether the server has an AI key configured; the chat screen hides itself otherwise. */
export function useAssistantStatus() {
  return useQuery({
    queryKey: qk.assistant,
    queryFn: () => api.get<{ available: boolean }>(Endpoints.assistant.status),
    staleTime: 5 * 60_000,
  });
}

/** The server caps a conversation at 30 turns of 2000 characters each. */
const MAX_TURNS = 30;
const MAX_CHARS = 2000;

export function useAssistantChat() {
  return useMutation({
    mutationFn: (messages: AssistantMessage[]) => {
      const recent = messages.slice(-MAX_TURNS);
      // The conversation sent must open with the reader's turn.
      while (recent.length > 0 && recent[0]!.role !== 'user') recent.shift();
      return api.post<AssistantReply>(Endpoints.assistant.chat, {
        messages: recent.map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) })),
      });
    },
  });
}
