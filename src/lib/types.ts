export interface MessageMeta {
  candidates: unknown[];  // 질환 후보 — string 또는 { name: string, ... } 등 백엔드 형태에 따라 다를 수 있음
  tier_label: string;     // 권고 등급 (예: "자가관리 가능", "진료 권장", "즉시 내원 필요")
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  meta?: MessageMeta;     // meta 이벤트 도착 시 채워짐
}

export interface AgentSection {
  title: string;
  content: string;
  type: "analysis" | "care" | "referral";
}

export interface ParsedAgentResponse {
  intro?: string;
  sections: AgentSection[];
  disclaimer?: string;
}

const SECTION_DEFS: { key: string; type: AgentSection["type"] }[] = [
  { key: "가능성 분석", type: "analysis" },
  { key: "자가관리 방법", type: "care" },
  { key: "진료 권고 기준", type: "referral" },
];

/**
 * 에이전트 응답에서 3개 섹션을 파싱합니다.
 * 섹션 헤더를 찾을 수 없으면 null을 반환합니다.
 */
export function parseAgentResponse(
  content: string
): ParsedAgentResponse | null {
  const hasSections = SECTION_DEFS.some((s) => content.includes(s.key));
  if (!hasSections) return null;

  const headerRegex =
    /^#{1,3}\s*(가능성 분석|자가관리 방법|진료 권고 기준)\s*$/gm;

  const positions: {
    index: number;
    headerEnd: number;
    key: string;
    type: AgentSection["type"];
  }[] = [];

  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(content)) !== null) {
    const def = SECTION_DEFS.find((s) => s.key === match![1]);
    if (def) {
      positions.push({
        index: match.index,
        headerEnd: match.index + match[0].length,
        key: def.key,
        type: def.type,
      });
    }
  }

  if (positions.length === 0) return null;

  const result: ParsedAgentResponse = { sections: [] };

  const introText = content.slice(0, positions[0].index).trim();
  if (introText) result.intro = introText;

  for (let i = 0; i < positions.length; i++) {
    const contentStart = positions[i].headerEnd;
    const contentEnd =
      i + 1 < positions.length ? positions[i + 1].index : content.length;
    let sectionContent = content.slice(contentStart, contentEnd).trim();

    if (i === positions.length - 1) {
      const disclaimerMatch = sectionContent.match(
        /\n{1,2}>\s*이 정보는 의학적 진단.*/s
      );
      if (disclaimerMatch && disclaimerMatch.index !== undefined) {
        result.disclaimer = disclaimerMatch[0]
          .replace(/^\n+>\s*/, "")
          .trim();
        sectionContent = sectionContent.slice(0, disclaimerMatch.index).trim();
      }
    }

    result.sections.push({
      title: positions[i].key,
      type: positions[i].type,
      content: sectionContent,
    });
  }

  return result;
}
