"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { SYMPTOM_LIST } from "@/lib/intake-constants";
import type { IntakeFormData } from "@/lib/intake-types";
import { IntakeSectionCard } from "@/components/intake/intake-section-card";

interface IntakeSymptomChecklistProps {
    form: IntakeFormData;
    setForm: Dispatch<SetStateAction<IntakeFormData>>;
}

export function IntakeSymptomChecklist({ form, setForm }: IntakeSymptomChecklistProps) {
    return (
        <IntakeSectionCard
            icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            }
            title="현재 증상">
            <p className="text-xs text-muted-foreground -mt-1">해당하는 증상을 모두 선택해주세요</p>
            <div className="grid grid-cols-2 gap-3">
                {SYMPTOM_LIST.map(({ key, label }) => (
                    <label key={key} className={cn("flex items-center justify-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-150", form.symptoms[key] ? "bg-primary ring-1 ring-primary/20" : "bg-white border border-border hover:bg-cs-surface hover:border-primary/20")}>
                        <input
                            type="checkbox"
                            checked={!!form.symptoms[key]}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    symptoms: { ...f.symptoms, [key]: e.target.checked },
                                }))
                            }
                            className="sr-only"
                        />
                        <span className={cn("text-sm font-medium", form.symptoms[key] ? "text-primary-foreground" : "text-foreground")}>{label}</span>
                    </label>
                ))}
            </div>
        </IntakeSectionCard>
    );
}
