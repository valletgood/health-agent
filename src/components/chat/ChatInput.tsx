"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    quickChips?: string[];
    onChipClick?: (text: string) => void;
}

const ChatInput = ({ value, onChange, onSubmit, isLoading, quickChips, onChipClick }: ChatInputProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [value]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading && value.trim()) onSubmit();
        }
    };

    const canSubmit = !isLoading && value.trim().length > 0;

    return (
        <div className="space-y-3">
            {/* 퀵 액션 칩 */}
            {quickChips && quickChips.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap">
                    {quickChips.map((chip) => (
                        <Button key={chip} type="button" onClick={() => onChipClick?.(chip)} className={cn("px-4 py-2 bg-white/80 backdrop-blur-md", "text-[11px] font-bold text-muted-foreground rounded-full", "border border-cs-outline-variant/20 shadow-sm", "hover:bg-primary/10 hover:text-primary", "transition-all duration-200 cursor-pointer")}>
                            {chip}
                        </Button>
                    ))}
                </div>
            )}

            {/* 인풋 컨테이너 */}
            <div className="relative group">
                <div className={cn("flex items-end gap-3 p-2.5", "bg-white/90 rounded-full", "border-2 border-transparent", "group-focus-within:border-primary/30", "transition-all duration-300", "shadow-xl shadow-primary/5")}>
                    {/* 입력창 */}
                    <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="증상을 자유롭게 입력하세요"
                        disabled={isLoading}
                        rows={1}
                        className={cn("flex-1 resize-none overflow-hidden bg-transparent border-none", "focus:ring-0 focus:outline-none", "text-sm py-2.5 px-3 text-foreground", "placeholder:text-cs-outline/70 font-medium", "min-h-[44px] max-h-[120px] leading-relaxed", "disabled:opacity-50 disabled:cursor-not-allowed")}
                        aria-label="증상 입력"
                    />

                    {/* 버튼 영역 */}
                    <div className="flex items-center gap-1.5 pr-1 flex-shrink-0">
                        {/* 전송 버튼 */}
                        <Button type="button" onClick={onSubmit} disabled={!canSubmit} className={cn("w-12 h-12 bg-primary text-primary-foreground rounded-full", "flex items-center justify-center", "shadow-lg shadow-primary/30", "hover:bg-cs-primary-dim active:scale-[0.97]", "disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100", "transition-all duration-150")} aria-label="전송">
                            {isLoading ? (
                                <svg className="w-4 h-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 translate-x-px" aria-hidden="true">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
