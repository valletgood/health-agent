import type { AnalysisSection } from "@/lib/intake-types";

const STRUCTURED_SECTION_TITLES = new Set([
    "왜 이렇게 생각했냐면요.",
    "이렇게 관리해보세요.",
    "추천 대응",
]);

const SECTION_TITLE_ALIASES: Record<string, string> = {
    "한눈에 결론": "제 결론이에요.",
    "제 결론": "제 결론이에요.",
    "어떤 증상인지 추론": "예상되는 증상이에요.",
    "아닐 가능성": "다른 가능성도 있어요.",
    "그 증상을 추론한 이유": "왜 이렇게 생각했냐면요.",
    "해당 증상을 완화시키기 위한 행동": "이렇게 관리해보세요.",
    "긴급 수치": "추천 대응",
};

const SECTION_ORDER = [
    "제 결론이에요.",
    "예상되는 증상이에요.",
    "왜 이렇게 생각했냐면요.",
    "다른 가능성도 있어요.",
    "이렇게 관리해보세요.",
    "추천 대응",
];

function normalizeSectionTitle(title: string): string {
    const trimmed = title.trim();
    return SECTION_TITLE_ALIASES[trimmed] ?? trimmed;
}

function parseKeywordItemsFromText(text: string): Array<{ keyword: string; description: string }> {
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim());

    const items = lines
        .map((line) => {
            const match = line.match(/^(.{1,25}?)\s*:\s*(.+)$/);
            if (match) {
                return { keyword: match[1].trim(), description: match[2].trim() };
            }
            return { keyword: "핵심", description: line };
        })
        .filter((item) => item.description.length > 0);

    return items;
}

export function postProcessAnalysisSections(sections: AnalysisSection[]): AnalysisSection[] {
    const normalized = sections.map((section) => {
        const title = normalizeSectionTitle(section.title);
        let content = section.content;

        if (STRUCTURED_SECTION_TITLES.has(title)) {
            if (typeof content === "string") {
                content = parseKeywordItemsFromText(content);
            }
        } else if (Array.isArray(content)) {
            content = content.map((item) => `${item.keyword}: ${item.description}`).join("\n");
        }

        return { title, content };
    });

    const byTitle = new Map<string, AnalysisSection>();
    for (const section of normalized) {
        if (!byTitle.has(section.title)) {
            byTitle.set(section.title, section);
        }
    }

    return SECTION_ORDER.filter((title) => byTitle.has(title))
        .map((title) => byTitle.get(title)!)
        .concat(normalized.filter((section) => !SECTION_ORDER.includes(section.title)));
}
