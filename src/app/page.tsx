"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IntakeAnalyzingStep } from "@/components/intake/intake-analyzing-step";
import { IntakeBasicInfoStep } from "@/components/intake/intake-basic-info-step";
import { IntakeOtherSymptomsStep } from "@/components/intake/intake-other-symptoms-step";
import { IntakePainLevelStep } from "@/components/intake/intake-pain-level-step";
import { IntakeReviewStep } from "@/components/intake/intake-review-step";
import { IntakeSubmittedScreen } from "@/components/intake/intake-submitted-screen";
import { IntakeSymptomChecklist } from "@/components/intake/intake-symptom-checklist";
import { STEPS, createInitialForm } from "@/lib/intake-constants";
import type { AnalysisSection, IntakeFormData, LlmDiseaseContext } from "@/lib/intake-types";
import type { FollowUpAnswer, FollowUpQuestion } from "@/lib/intake-questions";
import { searchAndBuildContext, fetchFollowUpQuestions, runGeminiAnalysis } from "@/lib/intake-submit";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LOADING_STEP = 2; // 3단계: AI 분석 진행
const RESULT_STEP = 3; // 4단계: AI 분석 결과
const SUB_STEP_COUNT = 4; // step 0 내 서브스텝 수 (기본정보·현재증상·추가증상·아픈정도)
const FADE_OUT_MS = 120;
const PROGRESS_BAR_ANIMATION_MS = 500;
const PROGRESS_INACTIVE_TEXT_CLASS = "text-cs-outline-variant";

// 선택된 증상을 기반으로 HIRA 진료과목 코드 파생
const deriveSpecialtyCodes = (form: IntakeFormData): string[] => {
    const codes = new Set(["01", "23"]); // 내과, 가정의학과 기본
    if (form.symptoms.cough || form.symptoms.fever) codes.add("13"); // 이비인후과
    if (form.symptoms.muscleAche) codes.add("05"); // 정형외과
    if (form.symptoms.headache) codes.add("02"); // 신경과
    return [...codes];
};

const IntakePage = () => {
    const [step, setStep] = useState(0);
    const [subStep, setSubStep] = useState(0); // 0~3, step 0에서만 사용
    const [isVisible, setIsVisible] = useState(true);
    const [form, setForm] = useState<IntakeFormData>(() => createInitialForm());
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [analysisSections, setAnalysisSections] = useState<AnalysisSection[]>([]);
    const [llmContext, setLlmContext] = useState<LlmDiseaseContext | null>(null);
    const [dynamicQuestions, setDynamicQuestions] = useState<FollowUpQuestion[] | null>(null);
    const [followUpAnswers, setFollowUpAnswers] = useState<FollowUpAnswer[]>([]);

    // 질문 생성 완료 후 resolvedContext를 ref에 보관 — handleAnalyzingComplete에서 재사용
    const resolvedContextRef = useRef<LlmDiseaseContext | null>(null);
    const cancelledRef = useRef(false);
    // form state를 항상 최신값으로 ref에 동기화 (useCallback 클로저 stale 방지)
    const formRef = useRef(form);
    useEffect(() => {
        formRef.current = form;
    });
    // 페이드 전환 타이머 ref
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const progressPercent = ((step + 1) / STEPS.length) * 100;
    // 기본정보 서브스텝에서만 필수 입력 체크
    const canProceed = step !== 0 || subStep !== 0 || (form.name.trim() !== "" && form.birthDate !== "" && form.gender !== "");
    const showNav = step < LOADING_STEP;
    const canGoBack = step > 0 || subStep > 0;

    // 빠르게 fade out → 상태 변경 + wrapper 즉시 복구 (새 콘텐츠는 CSS로 슬라이드 업)
    const withTransition = (change: () => void) => {
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        setIsVisible(false);
        transitionTimerRef.current = setTimeout(() => {
            change();
            setIsVisible(true); // change()와 배치 처리 → wrapper 즉시 복구
        }, FADE_OUT_MS);
    };

    const handleNext = () => {
        setSubmitError(null);
        if (step !== 0) {
            // step 1 → 2(LOADING_STEP): 이전 분석 상태 초기화 후 진입
            withTransition(() => {
                setDynamicQuestions(null);
                setStep((s) => s + 1);
            });
            return;
        }

        if (subStep < SUB_STEP_COUNT - 1) {
            goToSubStep(subStep + 1);
            return;
        }

        // 마지막 서브스텝 → 검토 단계(step 1)로
        withTransition(() => setStep(1));
    };

    const handleBack = () => {
        if (step === 1) {
            // 검토 단계에서 뒤로 → step 0 마지막 서브스텝으로
            withTransition(() => {
                setSubStep(SUB_STEP_COUNT - 1);
                setStep(0);
            });
            return;
        }

        if (step > 1) {
            withTransition(() => setStep((s) => s - 1));
            return;
        }

        if (step === 0 && subStep > 0) {
            goToSubStep(subStep - 1);
        }
    };

    const goToSubStep = (nextSubStep: number) => {
        withTransition(() => setSubStep(nextSubStep));
    };

    // 로딩 단계 진입 시: Neo4j 검색 → Gemini 질문 생성 순서로 실행
    useEffect(() => {
        if (step !== LOADING_STEP) return;

        cancelledRef.current = false;
        resolvedContextRef.current = null;

        void (async () => {
            try {
                const context = await searchAndBuildContext(formRef.current);
                if (cancelledRef.current) return;

                resolvedContextRef.current = context;

                // Neo4j 결과를 바탕으로 Gemini가 질문 생성
                const questions = await fetchFollowUpQuestions(formRef.current, context);
                if (cancelledRef.current) return;

                setDynamicQuestions(questions);
            } catch (error) {
                if (cancelledRef.current) return;

                if (error instanceof Error && error.message === "NO_CANDIDATES") {
                    setAnalysisSections([{ title: "AI 분석 결과", content: "관련된 의학 지식을 찾지 못해 일반적인 안내만 가능합니다. 증상을 더 구체적으로 입력해 주세요." }]);
                    setStep(RESULT_STEP);
                    return;
                }

                const message = error instanceof Error ? error.message : "문진표 연관 정보 조회 중 오류가 발생했습니다.";
                setSubmitError(message);
                setStep(1);
            }
        })();

        return () => {
            cancelledRef.current = true;
        };
    }, [step]);

    // 단계·서브스텝 변경 시 스크롤 최상단으로 이동
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [step, subStep]);

    // 사용자가 모든 질문에 답한 후 호출 — 이미 resolvedContextRef에 저장된 컨텍스트 사용
    const handleAnalyzingComplete = useCallback(async (answers: FollowUpAnswer[]) => {
        if (cancelledRef.current || !resolvedContextRef.current) return;

        try {
            // formRef.current로 항상 최신 form 사용 (useCallback 클로저 stale 방지)
            const sections = await runGeminiAnalysis(formRef.current, resolvedContextRef.current, answers);
            if (cancelledRef.current) return;

            setFollowUpAnswers(answers);
            setAnalysisSections(sections);
            setLlmContext(resolvedContextRef.current);
            setIsVisible(true);
            setStep(RESULT_STEP);
        } catch (error) {
            if (cancelledRef.current) return;
            const message = error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.";
            setSubmitError(message);
            setStep(1);
        }
    }, []);

    const handleReset = () => {
        withTransition(() => {
            setStep(0);
            setSubStep(0);
            setForm(createInitialForm());
            setSubmitError(null);
            setAnalysisSections([]);
            setLlmContext(null);
            setDynamicQuestions(null);
            setFollowUpAnswers([]);
            resolvedContextRef.current = null;
        });
    };

    const renderSubStepContent = (s: number) => {
        switch (s) {
            case 0:
                return <IntakeBasicInfoStep form={form} setForm={setForm} />;
            case 1:
                return <IntakeSymptomChecklist form={form} setForm={setForm} />;
            case 2:
                return <IntakeOtherSymptomsStep form={form} setForm={setForm} />;
            case 3:
                return <IntakePainLevelStep form={form} setForm={setForm} />;
            default:
                return null;
        }
    };

    const renderCurrentStepContent = () => {
        switch (step) {
            case 0:
                return renderSubStepContent(subStep);
            case 1:
                return <IntakeReviewStep form={form} />;
            case LOADING_STEP:
                return <IntakeAnalyzingStep questions={dynamicQuestions} onComplete={handleAnalyzingComplete} />;
            case RESULT_STEP:
                return <IntakeSubmittedScreen form={form} analysisSections={analysisSections} specialtyCodes={deriveSpecialtyCodes(form)} llmContext={llmContext} followUpAnswers={followUpAnswers} onReset={handleReset} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="min-h-screen pt-6 px-4 pb-24">
                <div className="max-w-2xl mx-auto">
                    {/* 진행 표시줄 — 전환 애니메이션 없이 항상 표시 */}
                    <div className="mb-10">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-primary rounded-full transition-all ease-in-out" style={{ width: `${progressPercent}%`, transitionDuration: `${PROGRESS_BAR_ANIMATION_MS}ms` }} />
                        </div>
                        <div className="flex justify-between">
                            {STEPS.map((label, i) => (
                                <span key={label} className={cn("text-[10px] font-bold transition-colors", i === step ? "text-primary" : i < step ? "text-cs-secondary" : PROGRESS_INACTIVE_TEXT_CLASS)}>
                                    {i === step ? `${i + 1}단계: ${label}${i === 0 ? ` (${subStep + 1}/${SUB_STEP_COUNT})` : ""}` : `${i + 1}단계`}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 타이틀 — 애니메이션 없이 항상 표시 */}
                    {step < LOADING_STEP && (
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-extrabold text-cs-on-surface-strong tracking-tight mb-2">헷갈리는 증상, 쉽고 빠르게 확인하세요</h1>
                            <p className="text-sm text-muted-foreground mb-2">증상을 알려주시면 AI가 맞춤 건강 정보를 안내해 드립니다.</p>
                            <p className="text-[10px] font-bold text-cs-outline-variant uppercase tracking-widest">약 5분 소요</p>
                        </div>
                    )}

                    {/* exit: wrapper fade out / enter: 내부 key 교체로 section-enter 애니메이션 */}
                    <div
                        style={{
                            opacity: isVisible ? 1 : 0,
                            transition: isVisible ? "none" : `opacity ${FADE_OUT_MS}ms ease`,
                            pointerEvents: isVisible ? "auto" : "none",
                        }}>
                        <div key={`${step}-${subStep}`} className="section-enter">
                            {renderCurrentStepContent()}

                            {showNav && (
                                <div className="mt-10">
                                    <div className="flex gap-3">
                                        {canGoBack && (
                                            <Button type="button" variant="ghost" onClick={handleBack} className="h-auto flex-1 py-4 rounded-full border-0 bg-muted text-muted-foreground font-bold text-sm hover:bg-cs-surface-container-highest transition-all active:scale-[0.98]">
                                                이전
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleNext}
                                            disabled={!canProceed}
                                            className={cn("h-auto flex-[2] py-4 rounded-full border-0 font-bold text-sm transition-all duration-150 active:scale-[0.98]", "flex items-center justify-center gap-2", canProceed ? "bg-primary text-primary-foreground hover:brightness-105 shadow-lg shadow-primary/20" : "bg-muted text-cs-outline-variant cursor-not-allowed pointer-events-none")}>
                                            {step === 1 ? (
                                                <>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                    AI 분석 시작하기
                                                </>
                                            ) : (
                                                <>다음</>
                                            )}
                                        </Button>
                                    </div>
                                    {submitError && <p className="text-center text-xs text-destructive font-semibold mt-2">{submitError}</p>}
                                    <p className="text-center text-[10px] text-cs-outline-variant font-bold tracking-widest uppercase mt-3">AI 건강 상담 · 의학적 진단을 대체하지 않습니다</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IntakePage;
