// Gemini가 동적으로 생성하는 추가 질문 타입
export interface FollowUpQuestion {
    id: string;
    text: string;
}

export interface FollowUpAnswer {
    questionId: string;
    question: string;
    answer: "yes" | "no";
}
