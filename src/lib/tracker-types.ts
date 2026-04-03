export interface SymptomLog {
    id: string;
    deviceId: string;
    date: string;
    overallScore: number;
    symptoms: string[];
    memo: string;
    createdAt: string;
}
