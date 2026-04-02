import type { ChatContext } from "@/lib/chat-types";

const STORAGE_KEY = "HEALTH_CHAT_CONTEXT";

export function saveChatContext(context: ChatContext): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function loadChatContext(): ChatContext | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as ChatContext;
    } catch {
        return null;
    }
}

export function clearChatContext(): void {
    sessionStorage.removeItem(STORAGE_KEY);
}
