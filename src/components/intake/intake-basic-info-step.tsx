"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "@/lib/intake-types";
import { IntakeFieldLabel } from "@/components/intake/intake-field-label";
import { IntakeInput } from "@/components/intake/intake-input";
import { IntakeSectionCard } from "@/components/intake/intake-section-card";
import { Button } from "@/components/ui/button";

const GENDERS = [
    { value: "male" as const, label: "남성" },
    { value: "female" as const, label: "여성" },
];

interface IntakeBasicInfoStepProps {
    form: IntakeFormData;
    setForm: Dispatch<SetStateAction<IntakeFormData>>;
}

export function IntakeBasicInfoStep({ form, setForm }: IntakeBasicInfoStepProps) {
    const [birthParts, setBirthParts] = useState(() => {
        const [year = "", month = "", day = ""] = form.birthDate.split("-");
        return { year, month, day };
    });

    const updateBirthDate = (next: { year?: string; month?: string; day?: string }) => {
        const year = next.year ?? birthParts.year;
        const monthRaw = next.month ?? birthParts.month;
        const dayRaw = next.day ?? birthParts.day;

        setBirthParts({ year, month: monthRaw, day: dayRaw });

        const month = monthRaw.padStart(2, "0");
        const day = dayRaw.padStart(2, "0");

        const isComplete = year.length === 4 && Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31;
        setForm((f) => ({ ...f, birthDate: isComplete ? `${year}-${month}-${day}` : "" }));
    };

    return (
        <IntakeSectionCard
            icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
            }
            title="기본 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 성함 — 모바일 full / PC 왼쪽 */}
                <div>
                    <IntakeFieldLabel>성함</IntakeFieldLabel>
                    <IntakeInput type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="성함을 입력해주세요" />
                </div>
                {/* 성별 — 모바일 full / PC 오른쪽 */}
                <div>
                    <IntakeFieldLabel>성별</IntakeFieldLabel>
                    <div className="flex gap-3">
                        {GENDERS.map(({ value, label }) => (
                            <Button key={value} type="button" variant="ghost" onClick={() => setForm((f) => ({ ...f, gender: value }))} className={cn("h-auto flex-1 py-3 rounded-xl border-0 text-sm font-semibold transition-all duration-150 active:scale-[0.98]", form.gender === value ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-cs-surface-container-highest")}>
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>
                {/* 생년월일 — 항상 full width */}
                <div className="md:col-span-2">
                    <IntakeFieldLabel>생년월일</IntakeFieldLabel>
                    <div className="flex items-center gap-2">
                        <IntakeInput type="text" inputMode="numeric" maxLength={4} value={birthParts.year} onChange={(e) => updateBirthDate({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="YYYY" className="w-24 text-center" />
                        <span className="text-sm font-semibold text-muted-foreground">년</span>
                        <IntakeInput type="text" inputMode="numeric" maxLength={2} value={birthParts.month} onChange={(e) => updateBirthDate({ month: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="MM" className="w-20 text-center" />
                        <span className="text-sm font-semibold text-muted-foreground">월</span>
                        <IntakeInput type="text" inputMode="numeric" maxLength={2} value={birthParts.day} onChange={(e) => updateBirthDate({ day: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="DD" className="w-20 text-center" />
                        <span className="text-sm font-semibold text-muted-foreground">일</span>
                    </div>
                </div>
            </div>
        </IntakeSectionCard>
    );
}
