"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { SYMPTOM_LIST, GENDER_LABELS } from "@/lib/intake-constants";
import type { IntakeFormData } from "@/lib/intake-types";

function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="bg-secondary rounded-2xl p-6">
            <h3 className="text-[15px] font-bold text-muted-foreground mb-4">{title}</h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
        </div>
    );
}

interface IntakeReviewStepProps {
    form: IntakeFormData;
}

export function IntakeReviewStep({ form }: IntakeReviewStepProps) {
    const selectedSymptoms = SYMPTOM_LIST.filter((s) => form.symptoms[s.key]);

    return (
        <div className="space-y-5">
            <ReviewCard title="기본 정보">
                <ReviewRow label="성함" value={form.name || "—"} />
                <ReviewRow label="생년월일" value={form.birthDate ? `${form.birthDate.slice(0, 4)}.${form.birthDate.slice(4, 6)}.${form.birthDate.slice(6, 8)}` : "—"} />
                <ReviewRow label="성별" value={form.gender ? GENDER_LABELS[form.gender] : "—"} />
            </ReviewCard>

            <ReviewCard title="현재 증상">
                {selectedSymptoms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {selectedSymptoms.map((s) => (
                            <Badge key={s.key} className="rounded-full bg-cs-primary-container/40 text-cs-on-primary-container border-0 text-sm font-semibold px-3 py-1 h-auto">
                                {s.label}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <span className="text-cs-outline-variant text-sm">선택된 증상 없음</span>
                )}
            </ReviewCard>

            <ReviewCard title="추가 증상">{form.otherSymptoms.trim() ? <p className="text-sm text-foreground leading-relaxed">{form.otherSymptoms}</p> : <span className="text-cs-outline-variant text-sm">입력 없음</span>}</ReviewCard>

            <ReviewCard title="아픈 정도">
                <p className="text-sm font-semibold text-foreground">{form.painLevel} / 10</p>
            </ReviewCard>

            <div className="p-4 bg-cs-tertiary-container rounded-xl flex gap-3 items-start">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-cs-on-tertiary-container flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-cs-on-tertiary-container leading-relaxed">이 정보는 의학적 진단을 대체하지 않습니다. AI 분석 결과는 참고용으로만 사용하시고, 정확한 진단은 반드시 의료 전문가와 상담하세요.</p>
            </div>
        </div>
    );
}
