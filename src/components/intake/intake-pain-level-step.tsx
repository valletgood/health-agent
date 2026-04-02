"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "@/lib/intake-types";
import { IntakeSectionCard } from "@/components/intake/intake-section-card";

interface IntakePainLevelStepProps {
    form: IntakeFormData;
    setForm: Dispatch<SetStateAction<IntakeFormData>>;
}

export function IntakePainLevelStep({ form, setForm }: IntakePainLevelStepProps) {
    return (
        <IntakeSectionCard
            icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
            }
            title="아픈 정도">
            <div className="px-1">
                <div className="flex justify-between text-xs font-medium text-cs-outline-variant mb-4">
                    <span>통증 없음</span>
                    <span>중간 정도</span>
                    <span>매우 심함</span>
                </div>
                <input type="range" min={0} max={10} step={1} value={form.painLevel} onChange={(e) => setForm((f) => ({ ...f, painLevel: Number(e.target.value) }))} className="w-full h-2 rounded-lg range-slider !bg-white" />
                <p className="text-center mt-4 text-sm text-muted-foreground">
                    현재 선택: <span className="font-bold text-primary">{form.painLevel} / 10</span>
                </p>
            </div>
        </IntakeSectionCard>
    );
}
