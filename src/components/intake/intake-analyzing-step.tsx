"use client";

import { useEffect, useRef, useState } from "react";
import type { FollowUpAnswer, FollowUpQuestion } from "@/lib/intake-questions";
import { Button } from "@/components/ui/button";

const QUESTION_FADE_MS = 100;
const EMPTY_ANSWERS: FollowUpAnswer[] = [];
const LOADING_LABELS = ["증상 분석 준비 중", "관련 증상 정보 수집 중", "맞춤 질문 준비 중"] as const;
const LOADING_TITLE = "AI가 분석하고 있어요";
const ASKING_TITLE = "잠깐, 확인이 필요해요";
const LOADING_DESCRIPTION = "의학 정보를 검색하고 있어요...";
const ASKING_DESCRIPTION = "더 정확한 분석을 위해 몇 가지 여쭤볼게요";
const WAITING_MESSAGE = "분석 결과를 정리하고 있어요...";
const LOADING_CARD_ANIMATION_DELAY_MS = 120;

type Phase = "asking" | "waiting";
type AnswerValue = "yes" | "no";

interface IntakeAnalyzingStepProps {
    questions: FollowUpQuestion[] | null; // null = Gemini 질문 생성 중
    onComplete: (answers: FollowUpAnswer[]) => void;
}

export const IntakeAnalyzingStep = ({ questions, onComplete }: IntakeAnalyzingStepProps) => {
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<FollowUpAnswer[]>([]);
    const [phase, setPhase] = useState<Phase>("asking");
    const [isQuestionVisible, setIsQuestionVisible] = useState(true);
    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 질문 배열이 도착하면 Q&A 시작 (빈 배열이면 바로 완료)
    useEffect(() => {
        if (questions === null) return;
        if (questions.length === 0) {
            onComplete(EMPTY_ANSWERS);
        }
    }, [questions, onComplete]);

    const handleAnswer = (answer: AnswerValue) => {
        if (!questions) return;
        const current = questions[questionIndex];
        const newAnswers = [...answers, { questionId: current.id, question: current.text, answer }];
        setAnswers(newAnswers);

        const hasNextQuestion = questionIndex + 1 < questions.length;
        if (hasNextQuestion) {
            // 현재 질문 fade out → 다음 질문으로 교체 + wrapper 즉시 복구 (section-enter 재생)
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            setIsQuestionVisible(false);
            fadeTimerRef.current = setTimeout(() => {
                setQuestionIndex((i) => i + 1);
                setIsQuestionVisible(true);
            }, QUESTION_FADE_MS);
        } else {
            setPhase("waiting");
            onComplete(newAnswers);
        }
    };

    const isLoadingQuestions = questions === null;
    const currentQuestion = questions?.[questionIndex];
    const questionTransitionStyle = {
        opacity: isQuestionVisible ? 1 : 0,
        transition: isQuestionVisible ? "none" : `opacity ${QUESTION_FADE_MS}ms ease`,
        pointerEvents: isQuestionVisible ? "auto" : "none",
    } as const;

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-8">
            {/* 애니메이션 아이콘 */}
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-cs-primary-container/30 animate-ping motion-reduce:animate-none" />
                <div className="relative w-24 h-24 rounded-full bg-white border border-border flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-primary">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-cs-on-surface-strong">
                    {!isLoadingQuestions && phase === "asking" ? ASKING_TITLE : LOADING_TITLE}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {isLoadingQuestions ? LOADING_DESCRIPTION : phase === "asking" ? ASKING_DESCRIPTION : LOADING_DESCRIPTION}
                </p>
            </div>

            {(isLoadingQuestions || phase === "waiting") && (
                <div className="flex gap-2 items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce motion-reduce:animate-none" />
                </div>
            )}

            <div className="w-full max-w-sm">
                {/* 로딩 카드 — stagger 슬라이드 업 */}
                {isLoadingQuestions && (
                    <div className="space-y-3">
                        {LOADING_LABELS.map((label, i) => (
                            <div key={label} className="section-enter flex items-center gap-3 text-left bg-white rounded-xl px-4 py-3 border border-border" style={{ animationDelay: `${i * LOADING_CARD_ANIMATION_DELAY_MS}ms` }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse motion-reduce:animate-none" />
                                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 질문 카드 — exit fade out / enter slide up */}
                {phase === "asking" && currentQuestion && (
                    <div style={questionTransitionStyle}>
                        <div key={questionIndex} className="section-enter">
                            {questions && questions.length > 1 && (
                                <div className="flex items-center justify-center gap-1.5 mb-4">
                                    {questions.map((_, i) => (
                                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i < questionIndex ? "w-4 bg-primary" : i === questionIndex ? "w-6 bg-primary" : "w-4 bg-muted"}`} />
                                    ))}
                                </div>
                            )}

                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-border text-left space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-[13px] font-bold text-primary">Q</span>
                                    </span>
                                    <p className="text-sm font-semibold text-cs-on-surface-strong leading-snug">{currentQuestion.text}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleAnswer("yes")}
                                        className="h-auto py-3 rounded-xl border border-border bg-secondary text-foreground text-sm font-bold hover:bg-muted active:scale-[0.97] transition-all">
                                        예
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleAnswer("no")}
                                        className="h-auto py-3 rounded-xl border border-border bg-secondary text-foreground text-sm font-bold hover:bg-muted active:scale-[0.97] transition-all">
                                        아니오
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 완료 대기 카드 — 슬라이드 업 */}
                {phase === "waiting" && (
                    <div className="section-enter bg-cs-primary-tint rounded-2xl px-5 py-4 border border-cs-primary-container/40">
                        <p className="text-sm text-primary font-semibold">{WAITING_MESSAGE}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
