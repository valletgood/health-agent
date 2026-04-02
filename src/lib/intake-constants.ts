import type { IntakeFormData, SymptomItem } from "@/lib/intake-types";

export const STEPS = ["기본 정보 및 증상", "검토 및 제출", "AI 분석 진행", "AI 분석 결과"] as const;

export const SYMPTOM_LIST = [
    { key: "fever", label: "발열" },
    { key: "cough", label: "기침" },
    { key: "muscleAche", label: "근육통" },
    { key: "headache", label: "두통" },
    { key: "fatigue", label: "피로감" },
    { key: "nausea", label: "메스꺼움" },
] as const;

export const GENDER_LABELS: Record<string, string> = {
    male: "남성",
    female: "여성",
    other: "기타",
};

export function createInitialForm(symptomList: SymptomItem[] = [...SYMPTOM_LIST]): IntakeFormData {
    return {
        name: "",
        birthDate: "",
        gender: "",
        symptoms: Object.fromEntries(symptomList.map((s) => [s.key, false])) as IntakeFormData["symptoms"],
        otherSymptoms: "",
        painLevel: 0,
        visitPurpose: "",
    };
}
