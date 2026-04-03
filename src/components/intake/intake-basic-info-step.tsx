"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "@/lib/intake-types";
import { IntakeFieldLabel } from "@/components/intake/intake-field-label";
import { IntakeSectionCard } from "@/components/intake/intake-section-card";
import { Button } from "@/components/ui/button";

const GENDERS = [
    { value: "male" as const, label: "남성" },
    { value: "female" as const, label: "여성" },
];

const getMaxDate = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface IntakeBasicInfoStepProps {
    form: IntakeFormData;
    setForm: Dispatch<SetStateAction<IntakeFormData>>;
}

export function IntakeBasicInfoStep({ form, setForm }: IntakeBasicInfoStepProps) {
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
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="성함을 입력해주세요"
                        className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-cs-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
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
                {/* 생년월일 — 단일 date 입력 */}
                <div className="md:col-span-2">
                    <IntakeFieldLabel>생년월일</IntakeFieldLabel>
                    <input
                        type="date"
                        value={form.birthDate}
                        max={getMaxDate()}
                        onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-cs-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </div>
            </div>
        </IntakeSectionCard>
    );
}
