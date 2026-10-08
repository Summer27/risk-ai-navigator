/**
 * Ephemeral storage layer.
 *
 * RISK AI NAVIGATOR runs without a database: conversations live only in the
 * user's browser tab and are gone after a refresh or app restart. This module
 * keeps the original `@chat-template/db` API so the routes stay unchanged,
 * but every persistence call is a no-op.
 */
import type { LanguageModelV3Usage } from '@ai-sdk/provider';
import type { VisibilityType } from '@chat-template/utils';

export interface Chat {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
  lastContext: LanguageModelV3Usage | null;
}

export interface DBMessage {
  id: string;
  chatId: string;
  role: string;
  parts: unknown;
  attachments: unknown;
  createdAt: Date;
  traceId: string | null;
}

export function isDatabaseAvailable(): boolean {
  return false;
}

export async function saveChat(_args: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}): Promise<void> {}

export async function deleteChatById(_args: { id: string }): Promise<null> {
  return null;
}

export async function getChatsByUserId(_args: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}): Promise<{ chats: Chat[]; hasMore: boolean }> {
  return { chats: [], hasMore: false };
}

export async function getChatById(_args: { id: string }): Promise<Chat | null> {
  return null;
}

export async function saveMessages(_args: {
  messages: Array<DBMessage>;
}): Promise<void> {}

export async function getMessagesByChatId(_args: {
  id: string;
}): Promise<DBMessage[]> {
  return [];
}

export async function getMessageById(_args: {
  id: string;
}): Promise<DBMessage[]> {
  return [];
}

export async function deleteMessagesByChatIdAfterTimestamp(_args: {
  chatId: string;
  timestamp: Date;
}): Promise<void> {}

export async function updateChatVisiblityById(_args: {
  chatId: string;
  visibility: 'private' | 'public';
}): Promise<void> {}

export async function updateChatTitleById(_args: {
  chatId: string;
  title: string;
}): Promise<void> {}

export async function updateChatLastContextById(_args: {
  chatId: string;
  context: LanguageModelV3Usage;
}): Promise<void> {}
