"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IntakeSubmittedScreen } from "@/components/intake/intake-submitted-screen";
import { getDeviceId } from "@/lib/device-id";
import type { AnalysisSection, IntakeFormData, LlmDiseaseContext } from "@/lib/intake-types";
import type { FollowUpAnswer } from "@/lib/intake-questions";

interface IntakeRecord {
    id: string;
    formData: IntakeFormData;
    analysisSections: AnalysisSection[];
    specialtyCodes: string[];
    llmContext: LlmDiseaseContext | null;
    followUpAnswers: FollowUpAnswer[] | null;
    createdAt: string;
}

type LoadState = "loading" | "done" | "error" | "not_found";

export default function HistoryDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [record, setRecord] = useState<IntakeRecord | null>(null);
    const [loadState, setLoadState] = useState<LoadState>("loading");

    useEffect(() => {
        void (async () => {
            try {
                const deviceId = getDeviceId();
                const headers: Record<string, string> = {};
                if (deviceId) headers["X-Device-Id"] = deviceId;

                const res = await fetch(`/api/intake-records/${params.id}`, { headers });
                if (res.status === 404) {
                    setLoadState("not_found");
                    return;
                }
                const data = (await res.json()) as { ok?: boolean; data?: { record?: IntakeRecord } };
                if (data.data?.record) {
                    setRecord(data.data.record);
                    setLoadState("done");
                } else {
                    setLoadState("not_found");
                }
            } catch {
                setLoadState("error");
            }
        })();
    }, [params.id]);

    if (loadState === "loading") {
        return (
            <div className="min-h-screen bg-background">
                <main className="min-h-screen pt-6 px-4 pb-24">
                    <div className="max-w-2xl mx-auto">
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-5 border border-border animate-pulse">
                                    <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                                    <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (loadState === "not_found" || loadState === "error") {
        return (
            <div className="min-h-screen bg-background">
                <main className="min-h-screen pt-6 px-4 pb-24">
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <p className="text-sm text-muted-foreground mb-4">
                            {loadState === "not_found" ? "기록을 찾을 수 없습니다." : "기록을 불러오는 데 실패했습니다."}
                        </p>
                        <button onClick={() => router.push("/history")} className="text-sm text-primary font-bold hover:underline">
                            목록으로 돌아가기
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    if (!record) return null;

    const createdDate = new Date(record.createdAt);
    const dateLabel = `${createdDate.getFullYear()}년 ${createdDate.getMonth() + 1}월 ${createdDate.getDate()}일`;

    return (
        <div className="min-h-screen bg-background">
            <main className="min-h-screen pt-6 px-4 pb-24">
                <div className="max-w-2xl mx-auto">
                    {/* 뒤로가기 + 날짜 */}
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => router.push("/history")} className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center hover:bg-cs-surface-container-highest transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cs-on-surface" stroke="currentColor" strokeWidth="2">
                                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <span className="text-sm font-bold text-muted-foreground">{dateLabel}</span>
                    </div>

                    <IntakeSubmittedScreen
                        form={record.formData}
                        analysisSections={record.analysisSections}
                        specialtyCodes={record.specialtyCodes}
                        llmContext={record.llmContext}
                        followUpAnswers={record.followUpAnswers ?? undefined}
                        readOnly
                    />
                </div>
            </main>
        </div>
    );
}
