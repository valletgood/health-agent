"use client";

import { useCallback, useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/device-id";
import { SYMPTOM_LIST } from "@/lib/intake-constants";
import type { SymptomLog } from "@/lib/tracker-types";
import { cn } from "@/lib/utils";

const SCORE_LABELS: Record<number, string> = {
    1: "매우 나쁨",
    2: "나쁨",
    3: "좋지 않음",
    4: "약간 불편",
    5: "보통",
    6: "괜찮음",
    7: "좋음",
    8: "꽤 좋음",
    9: "매우 좋음",
    10: "최고",
};

const formatChartDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatFullDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const getToday = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function TrackerPage() {
    // Form state
    const [date, setDate] = useState(getToday);
    const [score, setScore] = useState(5);
    const [activeSymptoms, setActiveSymptoms] = useState<Record<string, boolean>>(() => Object.fromEntries(SYMPTOM_LIST.map((s) => [s.key, false])));
    const [memo, setMemo] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Data state
    const [logs, setLogs] = useState<SymptomLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        try {
            const deviceId = getDeviceId();
            const headers: Record<string, string> = {};
            if (deviceId) headers["X-Device-Id"] = deviceId;

            const res = await fetch("/api/symptom-logs?days=30", { headers });
            const data = (await res.json()) as { ok?: boolean; data?: { logs?: SymptomLog[] } };
            setLogs(data.data?.logs ?? []);
        } catch {
            // 조용히 실패
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const handleSubmit = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const selectedSymptoms = Object.entries(activeSymptoms)
                .filter(([, v]) => v)
                .map(([k]) => k);

            const deviceId = getDeviceId();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (deviceId) headers["X-Device-Id"] = deviceId;

            const res = await fetch("/api/symptom-logs", {
                method: "POST",
                headers,
                body: JSON.stringify({ date, overallScore: score, symptoms: selectedSymptoms, memo }),
            });

            const result = (await res.json()) as { ok?: boolean; data?: { updated?: boolean } };
            if (result.ok) {
                setSaveMessage(result.data?.updated ? "기록이 수정되었습니다." : "기록이 저장되었습니다.");
                setMemo("");
                setActiveSymptoms(Object.fromEntries(SYMPTOM_LIST.map((s) => [s.key, false])));
                setScore(5);
                await fetchLogs();
            }
        } catch {
            setSaveMessage("저장에 실패했습니다. 다시 시도해 주세요.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("이 기록을 삭제하시겠어요?")) return;

        try {
            const deviceId = getDeviceId();
            const headers: Record<string, string> = {};
            if (deviceId) headers["X-Device-Id"] = deviceId;

            await fetch(`/api/symptom-logs/${id}`, {
                method: "DELETE",
                headers,
            });
            await fetchLogs();
        } catch {
            // 조용히 실패
        }
    };

    // Recharts data: 날짜순 정렬 (오래된 순)
    const chartData = [...logs].sort((a, b) => a.date.localeCompare(b.date)).map((log) => ({ date: log.date, score: log.overallScore }));

    const getSymptomLabel = (key: string): string => SYMPTOM_LIST.find((s) => s.key === key)?.label ?? key;

    return (
        <div className="min-h-screen bg-background">
            <main className="min-h-screen pt-6 px-4 pb-24">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-cs-on-surface-strong tracking-tight mb-1.5">증상 일지</h1>
                        <p className="text-sm text-muted-foreground">매일 컨디션을 기록하고 변화를 확인하세요.</p>
                    </div>

                    {/* 입력 폼 */}
                    <section className="bg-white rounded-2xl p-5 border border-border shadow-sm mb-6">
                        <h2 className="font-bold text-sm text-cs-on-surface-strong mb-4">오늘의 기록</h2>

                        {/* 날짜 */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">날짜</label>
                            <input type="date" value={date} max={getToday()} onChange={(e) => setDate(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-border bg-cs-surface text-sm text-cs-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>

                        {/* 컨디션 점수 */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">컨디션 점수</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min={1} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full h-2 rounded-lg range-slider" />
                                <span className="text-lg font-extrabold text-primary w-8 text-center">{score}</span>
                            </div>
                            <p className="text-xs text-cs-outline-variant mt-1">{SCORE_LABELS[score]}</p>
                        </div>

                        {/* 증상 체크박스 */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-muted-foreground mb-2">오늘 느끼는 증상</label>
                            <div className="flex flex-wrap gap-2">
                                {SYMPTOM_LIST.map((s) => (
                                    <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => setActiveSymptoms((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                                        className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-[0.97]", activeSymptoms[s.key] ? "bg-primary text-primary-foreground border-primary" : "bg-white text-cs-on-surface border-border hover:border-primary/40")}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 메모 */}
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">메모</label>
                            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오늘의 상태나 특이사항을 자유롭게 적어주세요." rows={3} className="w-full px-3 py-2.5 rounded-xl border border-border bg-cs-surface text-sm text-cs-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>

                        <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving} className="w-full h-auto py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50">
                            {isSaving ? "저장 중..." : "기록 저장하기"}
                        </Button>

                        {saveMessage && <p className="text-center text-xs font-semibold text-primary mt-2">{saveMessage}</p>}
                    </section>

                    {/* 차트 */}
                    {chartData.length >= 2 && (
                        <section className="bg-white rounded-2xl p-5 border border-border shadow-sm mb-6">
                            <h2 className="font-bold text-sm text-cs-on-surface-strong mb-4">최근 30일 컨디션 변화</h2>
                            <div className="w-full h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e9efef" />
                                        <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: "#586161" }} axisLine={{ stroke: "#e9efef" }} tickLine={false} />
                                        <YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tick={{ fontSize: 11, fill: "#586161" }} axisLine={{ stroke: "#e9efef" }} tickLine={false} />
                                        <Tooltip labelFormatter={(label) => formatFullDate(String(label))} formatter={(value) => [`${value}점`, "컨디션"]} contentStyle={{ borderRadius: "12px", border: "1px solid #abb4b4", fontSize: "12px" }} />
                                        <Line type="monotone" dataKey="score" stroke="#006974" strokeWidth={2.5} dot={{ r: 4, fill: "#006974", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#006974", stroke: "#fff", strokeWidth: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    )}

                    {/* 과거 기록 */}
                    <section>
                        <h2 className="font-bold text-sm text-cs-on-surface-strong mb-3">기록 목록</h2>

                        {isLoading && (
                            <div className="space-y-3">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-white rounded-2xl p-4 border border-border animate-pulse">
                                        <div className="h-3 bg-muted rounded w-1/4 mb-2" />
                                        <div className="h-3 bg-muted rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isLoading && logs.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-sm text-muted-foreground">아직 기록이 없습니다. 오늘의 컨디션을 기록해 보세요.</p>
                            </div>
                        )}

                        {!isLoading && logs.length > 0 && (
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="bg-white rounded-2xl p-4 border border-border shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-primary">{formatFullDate(log.date)}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", log.overallScore >= 7 ? "bg-emerald-50 text-emerald-600" : log.overallScore >= 4 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")}>{log.overallScore}/10</span>
                                                <button onClick={() => void handleDelete(log.id)} className="text-cs-outline-variant hover:text-destructive transition-colors p-1">
                                                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
                                                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {log.symptoms.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {log.symptoms.map((key) => (
                                                    <span key={key} className="text-[10px] font-medium bg-cs-primary-tint text-cs-on-primary-container px-1.5 py-0.5 rounded-full">
                                                        {getSymptomLabel(key)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {log.memo && <p className="text-xs text-muted-foreground line-clamp-2">{log.memo}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <p className="text-center text-[10px] text-cs-outline-variant font-bold tracking-widest uppercase mt-8">AI 건강 상담 · 의학적 진단을 대체하지 않습니다</p>
                </div>
            </main>
        </div>
    );
}
