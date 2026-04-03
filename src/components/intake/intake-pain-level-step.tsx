"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "@/lib/intake-types";
import { IntakeSectionCard } from "@/components/intake/intake-section-card";

const PAIN_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: "통증 없음", color: "text-emerald-600" },
    1: { label: "아주 가벼운 통증", color: "text-emerald-500" },
    2: { label: "가벼운 통증", color: "text-emerald-500" },
    3: { label: "약간 불편한 수준", color: "text-amber-500" },
    4: { label: "신경 쓰이는 통증", color: "text-amber-500" },
    5: { label: "중간 정도의 통증", color: "text-amber-600" },
    6: { label: "집중하기 어려운 통증", color: "text-orange-500" },
    7: { label: "활동이 제한되는 통증", color: "text-orange-600" },
    8: { label: "매우 심한 통증", color: "text-red-500" },
    9: { label: "극심한 통증", color: "text-red-600" },
    10: { label: "참을 수 없는 통증", color: "text-red-700" },
};

interface IntakePainLevelStepProps {
    form: IntakeFormData;
    setForm: Dispatch<SetStateAction<IntakeFormData>>;
}

export function IntakePainLevelStep({ form, setForm }: IntakePainLevelStepProps) {
    const { label, color } = PAIN_LABELS[form.painLevel] ?? PAIN_LABELS[5];

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
                    <span>중간</span>
                    <span>매우 심함</span>
                </div>
                <input type="range" min={0} max={10} step={1} value={form.painLevel} onChange={(e) => setForm((f) => ({ ...f, painLevel: Number(e.target.value) }))} className="w-full h-2 rounded-lg range-slider" />
                <div className="mt-4 text-center">
                    <span className={cn("text-2xl font-extrabold", color)}>{form.painLevel}</span>
                    <span className="text-sm text-muted-foreground font-medium"> / 10</span>
                    <p className={cn("text-sm font-semibold mt-1", color)}>{label}</p>
                </div>
            </div>
        </IntakeSectionCard>
    );
}
