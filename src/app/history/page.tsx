"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDeviceId } from "@/lib/device-id";
import { SYMPTOM_LIST } from "@/lib/intake-constants";
import type { AnalysisSection, IntakeFormData, LlmDiseaseContext } from "@/lib/intake-types";
import { cn } from "@/lib/utils";

interface IntakeRecord {
    id: string;
    formData: IntakeFormData;
    analysisSections: AnalysisSection[];
    specialtyCodes: string[];
    llmContext: LlmDiseaseContext | null;
    createdAt: string;
}

type LoadState = "loading" | "done" | "error";

const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const getSymptomLabels = (symptoms: Record<string, boolean>): string[] =>
    SYMPTOM_LIST.filter((s) => symptoms[s.key]).map((s) => s.label);

export default function HistoryPage() {
    const [records, setRecords] = useState<IntakeRecord[]>([]);
    const [loadState, setLoadState] = useState<LoadState>("loading");

    useEffect(() => {
        void (async () => {
            try {
                const deviceId = getDeviceId();
                const headers: Record<string, string> = {};
                if (deviceId) headers["X-Device-Id"] = deviceId;

                const res = await fetch("/api/intake-records", { headers });
                const data = (await res.json()) as { ok?: boolean; data?: { records?: IntakeRecord[] } };
                setRecords(data.data?.records ?? []);
                setLoadState("done");
            } catch {
                setLoadState("error");
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <main className="min-h-screen pt-6 px-4 pb-24">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-cs-on-surface-strong tracking-tight mb-1.5">문진 기록</h1>
                        <p className="text-sm text-muted-foreground">지난 분석 결과를 다시 확인할 수 있습니다.</p>
                    </div>

                    {loadState === "loading" && (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-5 border border-border animate-pulse">
                                    <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                                    <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {loadState === "error" && (
                        <div className="text-center py-16">
                            <p className="text-sm text-destructive font-semibold mb-2">기록을 불러오는 데 실패했습니다.</p>
                            <button onClick={() => window.location.reload()} className="text-sm text-primary font-bold hover:underline">
                                다시 시도
                            </button>
                        </div>
                    )}

                    {loadState === "done" && records.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-sm text-muted-foreground mb-4">아직 문진 기록이 없습니다.</p>
                            <Link href="/" className="inline-block px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-105 transition-all">
                                문진표 작성하기
                            </Link>
                        </div>
                    )}

                    {loadState === "done" && records.length > 0 && (
                        <div className="space-y-3">
                            {records.map((record) => {
                                const symptomLabels = getSymptomLabels(record.formData.symptoms);
                                const otherSymptoms = record.formData.otherSymptoms;

                                return (
                                    <Link key={record.id} href={`/history/${record.id}`} className="block">
                                        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:border-primary/40 hover:bg-cs-primary-tint transition-all active:scale-[0.99]">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-primary">{formatDate(record.createdAt)}</span>
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    record.formData.painLevel >= 7
                                                        ? "bg-red-50 text-red-600"
                                                        : record.formData.painLevel >= 4
                                                          ? "bg-amber-50 text-amber-600"
                                                          : "bg-emerald-50 text-emerald-600",
                                                )}>
                                                    통증 {record.formData.painLevel}/10
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {symptomLabels.map((label) => (
                                                    <span key={label} className="text-[11px] font-medium bg-cs-primary-tint text-cs-on-primary-container px-2 py-0.5 rounded-full">
                                                        {label}
                                                    </span>
                                                ))}
                                                {otherSymptoms && (
                                                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full truncate max-w-[150px]">
                                                        {otherSymptoms}
                                                    </span>
                                                )}
                                            </div>

                                            {record.formData.name && (
                                                <p className="text-xs text-muted-foreground">{record.formData.name}님의 문진 결과</p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
