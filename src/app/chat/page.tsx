"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import ChatInput from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { loadChatContext } from "@/lib/chat-storage";
import type { ChatContext, ChatMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

const QUICK_CHIPS = ["좀 더 자세히 알려주세요", "언제 병원에 가야 하나요?", "집에서 할 수 있는 게 있나요?"];

const ChatPage = () => {
    const router = useRouter();
    const [context, setContext] = useState<ChatContext | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contextRef = useRef<ChatContext | null>(null);
    const initializedRef = useRef(false);

    // 마운트 시 세션 컨텍스트 로드 → 첫 인사 요청
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const ctx = loadChatContext();
        if (!ctx) {
            router.replace("/");
            return;
        }
        contextRef.current = ctx;
        setContext(ctx);
        void fetchReply([], ctx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 메시지 추가될 때마다 맨 아래로 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const fetchReply = async (history: ChatMessage[], ctx: ChatContext) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history, context: ctx }),
            });
            const data = (await res.json()) as { ok: boolean; message?: ChatMessage; error?: string };
            if (!res.ok || !data.ok) throw new Error(data.error ?? "응답 오류");
            setMessages((prev) => [...prev, data.message!]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "응답을 가져오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = (text?: unknown) => {
        const rawText = typeof text === "string" ? text : input;
        const content = rawText.trim();
        if (!content || isLoading || !contextRef.current) return;

        const userMsg: ChatMessage = {
            id: `${Date.now()}-user`,
            role: "user",
            content,
            timestamp: Date.now(),
        };

        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput("");
        void fetchReply(nextMessages, contextRef.current);
    };

    return (
        <div className="flex flex-col h-dvh bg-background">
            {/* 헤더 */}
            <header className="flex items-center gap-3 px-4 pt-6 pb-4 bg-background">
                <Button
                    type="button"
                    onClick={() => router.back()}
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full border-0 bg-muted hover:bg-cs-surface-container-highest transition-colors active:scale-[0.98]"
                    aria-label="뒤로가기"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-muted-foreground">
                        <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
                    </svg>
                </Button>
                <div>
                    <h1 className="font-headline text-base font-extrabold text-cs-on-surface-strong leading-tight">AI 상담</h1>
                    {context?.form.name && (
                        <p className="text-[11px] text-muted-foreground font-medium">{context.form.name}님의 증상 기반 상담</p>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                    <span className="text-[11px] text-primary font-bold">온라인</span>
                </div>
            </header>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn("flex message-enter", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                        {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-primary">
                                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                        <div
                            className={cn(
                                "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-white border border-border text-foreground rounded-bl-sm shadow-sm",
                            )}
                        >
                            {msg.role === "user" ? (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                                <div className="prose-health">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* 로딩 인디케이터 */}
                {isLoading && (
                    <div className="flex justify-start message-enter">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-primary">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                            <div className="flex gap-1 items-center h-5">
                                <span className="streaming-dot w-1.5 h-1.5 rounded-full bg-primary" />
                                <span className="streaming-dot w-1.5 h-1.5 rounded-full bg-primary" />
                                <span className="streaming-dot w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 에러 */}
                {error && (
                    <div className="text-center">
                        <p className="text-xs text-destructive font-semibold">{error}</p>
                        <Button
                            type="button"
                            onClick={() => contextRef.current && void fetchReply(messages, contextRef.current)}
                            variant="link"
                            className="mt-1 h-auto border-0 px-0 py-0 text-xs font-bold text-primary hover:underline"
                        >
                            다시 시도
                        </Button>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="px-4 pb-6 pt-2 bg-background">
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    isLoading={isLoading}
                    quickChips={messages.length <= 1 ? QUICK_CHIPS : undefined}
                    onChipClick={(chip) => handleSend(chip)}
                />
                <p className="text-center text-[10px] text-cs-outline-variant font-bold tracking-widest uppercase mt-3">
                    AI 건강 상담 · 의학적 진단을 대체하지 않습니다
                </p>
            </div>
        </div>
    );
};

export default ChatPage;
