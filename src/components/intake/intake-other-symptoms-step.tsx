"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "@/lib/intake-types";
import { IntakeSectionCard } from "@/components/intake/intake-section-card";
import { Textarea } from "@/components/ui/textarea";

interface IntakeOtherSymptomsStepProps {
    form: IntakeFormData;
    setForm: Dispatch<SetStateAction<IntakeFormData>>;
}

export function IntakeOtherSymptomsStep({ form, setForm }: IntakeOtherSymptomsStepProps) {
    return (
        <IntakeSectionCard
            icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
            }
            title="추가 증상">
            <div>
                <div className="flex items-baseline gap-2 ml-1 mb-2">
                    <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">기타 증상</span>
                    <span className="text-[10px] font-bold text-cs-outline-variant uppercase tracking-widest">선택 사항</span>
                </div>
                <Textarea
                    value={form.otherSymptoms}
                    onChange={(e) => setForm((f) => ({ ...f, otherSymptoms: e.target.value }))}
                    placeholder="목록에 없는 증상, 언제부터 시작됐는지, 최근 변화 등을 자유롭게 적어주세요"
                    rows={4}
                    className={cn(
                        "min-h-[100px] rounded-xl border-0 bg-white px-4 py-3 text-sm text-foreground shadow-none",
                        "placeholder:text-cs-outline-variant",
                        "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-white"
                    )}
                />
            </div>
        </IntakeSectionCard>
    );
}
