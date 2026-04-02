import "server-only";

import neo4j, { type Driver } from "neo4j-driver";

declare global {
    var __neo4jDriver__: Driver | undefined;
}

function getRequiredEnv(name: "NEO4J_URI" | "NEO4J_USER" | "NEO4J_PASSWORD"): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} 환경 변수가 설정되지 않았습니다.`);
    }
    return value;
}

function createDriver(): Driver {
    const uri = getRequiredEnv("NEO4J_URI");
    const user = getRequiredEnv("NEO4J_USER");
    const password = getRequiredEnv("NEO4J_PASSWORD");

    return neo4j.driver(uri, neo4j.auth.basic(user, password));
}

export const neo4jDriver = globalThis.__neo4jDriver__ ?? createDriver();

if (process.env.NODE_ENV !== "production") {
    globalThis.__neo4jDriver__ = neo4jDriver;
}

export async function verifyNeo4jConnection() {
    await neo4jDriver.verifyConnectivity();
}

export async function closeNeo4jDriver() {
    await neo4jDriver.close();
}

export interface DiseaseIntakePayload {
    symptoms?: string[];
    otherSymptoms?: string;
    conditions?: string[];
    painLevel?: number;
    visitPurpose?: string;
}

export interface DiseaseCandidateNode {
    id: string;
    labels: string[];
    name: string;
    description: string;
    content: string;
    score: number;
    matchedKeywords: string[];
}

export interface DiseaseCandidateSearchResult {
    keywords: string[];
    candidates: DiseaseCandidateNode[];
}

export interface DiseaseContextEdge {
    relation: string;
    relationProps: Record<string, unknown>;
    node: {
        id: string;
        labels: string[];
        name: string;
        description: string;
        content: string;
        properties: Record<string, unknown>;
    };
}

export interface DiseaseContextNode {
    id: string;
    labels: string[];
    name: string;
    description: string;
    content: string;
    properties: Record<string, unknown>;
    connected: DiseaseContextEdge[];
    secondHopConnected: DiseaseContextEdge[];
}

export interface LlmEvidenceItem {
    paper: string;
    level: string;
    text: string;
}

export interface LlmSymptomContextItem {
    name: string;
    overview: string;
    relatedDiseases: string[];
    tests: string[];
    evidence: LlmEvidenceItem[];
}

export interface LlmDiseaseNodeItem {
    name: string;
    overview: string;
    symptoms: string[];
    tests: string[];
    comorbidities: string[];
    differentials: string[];
    evidence: LlmEvidenceItem[];
}

export interface LlmDiseaseContext {
    symptoms: LlmSymptomContextItem[];
    diseases: LlmDiseaseNodeItem[];
}

const KEYWORD_MAP: Record<string, string> = {
    fever: "발열",
    cough: "기침",
    muscleAche: "근육통",
    headache: "두통",
    fatigue: "피로감",
    nausea: "메스꺼움",
    diabetes: "당뇨병",
    hypertension: "고혈압",
    heartDisease: "심장 질환",
    asthma: "천식",
};

const KOR_TO_ENG_SYNONYMS: Record<string, string[]> = {
    발열: ["fever", "pyrexia", "high temperature"],
    기침: ["cough"],
    근육통: ["myalgia", "muscle pain"],
    두통: ["headache", "cephalalgia"],
    피로감: ["fatigue", "tiredness"],
    메스꺼움: ["nausea", "queasiness"],
    콧물: ["runny nose", "rhinorrhea"],
    재채기: ["sneeze", "sneezing", "sternutation"],
    인후통: ["sore throat", "throat pain"],
    당뇨병: ["diabetes", "diabetes mellitus"],
    고혈압: ["hypertension", "high blood pressure"],
    "심장 질환": ["heart disease", "cardiovascular disease"],
    천식: ["asthma"],
};

const ALLOWED_RELATION_TYPES = [
    // Disease ↔ Symptom
    "HAS_SYMPTOM",
    "SYMPTOM_OF",
    // Disease ↔ Test
    "DIAGNOSED_BY",
    "TESTS_FOR",
    // Disease ↔ Treatment
    "TREATED_BY",
    "TREATS",
    "RELIEVES",
    "RELIEVES_SYMPTOM",
    // Disease ↔ Biomarker
    "HAS_BIOMARKER",
    "BIOMARKER_OF",
    // Test ↔ Biomarker
    "MEASURES",
    "MEASURED_BY",
    // Treatment ↔ Biomarker
    "TARGETS",
    "TARGETED_BY",
    // Misc
    "DIFFERENTIAL_OF",
    "COMORBID_WITH",
    "RELATED_TO",
    "ALTERNATIVE_TO",
    "HAS_RISK_FACTOR",
    "ASSESSED_BY",
    // Paper
    "COVERS",
    // Legacy / fallback
    "ASSOCIATED_WITH",
    "MENTIONS",
    "PROVIDES_EVIDENCE_FOR",
] as const;

function splitTextKeywords(text: string): string[] {
    return text
        .split(/[,/|\n\r\t ]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2);
}

function normalizeKoreanToken(token: string): string {
    return token
        .trim()
        .toLowerCase()
        .replace(/[은는이가을를와과도의로만에에서부터까지랑하고]+$/g, "")
        .replace(/[요다네죠ㅠㅜ!?.,]+$/g, "")
        .replace(/(이|가|은|는|을|를|랑|하고)+$/g, "")
        .trim();
}

function uniq(values: string[]): string[] {
    return [...new Set(values)];
}

function expandKoreanToEnglishSynonyms(keywords: string[]): string[] {
    const expanded: string[] = [];
    for (const keyword of keywords) {
        const normalized = normalizeKoreanToken(keyword);
        expanded.push(keyword);
        if (normalized && normalized !== keyword) {
            expanded.push(normalized);
        }
        const synonyms = KOR_TO_ENG_SYNONYMS[keyword] ?? KOR_TO_ENG_SYNONYMS[normalized];
        if (synonyms?.length) {
            expanded.push(...synonyms);
        }

        // 자연어 입력 보정: 자주 쓰는 구어체를 의학 키워드로 정규화
        if (normalized.includes("콧물")) {
            expanded.push("콧물", "runny nose", "rhinorrhea");
        }
        if (normalized.includes("재채기")) {
            expanded.push("재채기", "sneeze", "sneezing");
        }
        if (normalized === "나옴" || normalized === "나요") {
            expanded.push("발현", "symptom");
        }
    }
    return uniq(expanded);
}

function camelToWords(key: string): string[] {
    // "muscleAche" → ["muscle", "ache"], "muscleAche" → "muscle ache"
    const spaced = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
    const parts = spaced.split(/\s+/).filter((w) => w.length >= 2);
    return parts.length > 1 ? [spaced, ...parts] : [spaced];
}

function buildKeywordsFromIntake(payload: DiseaseIntakePayload): string[] {
    const rawSymptomKeys = payload.symptoms ?? [];
    const mappedSymptoms = rawSymptomKeys.map((key) => KEYWORD_MAP[key] ?? key);
    const mappedConditions = (payload.conditions ?? []).map((key) => KEYWORD_MAP[key] ?? key);
    const textKeywords = [
        ...(payload.otherSymptoms ? splitTextKeywords(payload.otherSymptoms) : []),
        ...(payload.visitPurpose ? splitTextKeywords(payload.visitPurpose) : []),
    ];

    // 원본 영어 key + camelCase 분리어도 포함 (Neo4j 노드가 영어로 저장된 경우 커버)
    const englishKeywords = rawSymptomKeys.flatMap(camelToWords);
    const baseKeywords = uniq([...englishKeywords, ...mappedSymptoms, ...mappedConditions, ...textKeywords].map((v) => v.trim()).filter(Boolean));
    return expandKoreanToEnglishSynonyms(baseKeywords);
}

function toStringId(value: unknown): string {
    if (neo4j.isInt(value)) {
        return value.toString();
    }
    return String(value ?? "");
}

function getNodeName(properties: Record<string, unknown>): string {
    const candidates = [properties.name, properties.title, properties.label, properties.term, properties.value];
    const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
    return typeof found === "string" ? found : "이름 없음";
}

function getNodeDescription(properties: Record<string, unknown>): string {
    const candidates = [properties.description, properties.summary, properties.definition, properties.note];
    const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
    return typeof found === "string" ? found : "";
}

function getNodeContent(properties: Record<string, unknown>): string {
    const candidates = [properties.content, properties.abstract, properties.body, properties.details, properties.text];
    const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
    return typeof found === "string" ? found : "";
}

function normalizePropertyValue(value: unknown): unknown {
    if (neo4j.isInt(value)) {
        return value.toNumber();
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalizePropertyValue(item));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, normalizePropertyValue(val)])
        );
    }
    return value;
}

function normalizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
    return normalizePropertyValue(properties) as Record<string, unknown>;
}

function pickBestTextFromProperties(properties: Record<string, unknown>): string {
    const candidates = [
        properties.overview,
        properties.summary,
        properties.key_findings,
        properties.description,
        properties.content,
        properties.abstract,
    ];
    const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    return typeof found === "string" ? found : "";
}

export interface SymptomNode {
    name: string;
    description: string;
}

export async function getAllSymptoms(): Promise<SymptomNode[]> {
    const session = neo4jDriver.session();
    try {
        const result = await session.executeRead((tx) =>
            tx.run(`
                MATCH (n:Symptom)
                RETURN n.name AS name, coalesce(n.description, n.summary, n.overview, "") AS description
                ORDER BY n.name
            `)
        );
        return result.records.map((r) => ({
            name: String(r.get("name") ?? ""),
            description: String(r.get("description") ?? ""),
        }));
    } finally {
        await session.close();
    }
}

export async function searchDiseaseCandidates(payload: DiseaseIntakePayload): Promise<DiseaseCandidateSearchResult> {
    const keywords = buildKeywordsFromIntake(payload);

    if (keywords.length === 0) {
        return { keywords: [], candidates: [] };
    }

    const session = neo4jDriver.session();

    try {
        const result = await session.executeRead((tx) =>
            tx.run(
                `
                UNWIND $keywords AS keyword
                MATCH (n)
                WHERE
                  toLower(coalesce(n.name, n.title, n.label, "")) CONTAINS toLower(keyword)
                  OR any(alias IN coalesce(n.aliases, []) WHERE toLower(alias) CONTAINS toLower(keyword))
                  OR any(tag IN coalesce(n.tags, []) WHERE toLower(tag) CONTAINS toLower(keyword))
                  OR any(v IN [x IN keys(n) WHERE NOT x IN ['aliases', 'tags', 'authors'] AND NOT valueType(n[x]) STARTS WITH 'LIST' | toLower(toString(n[x]))] WHERE v CONTAINS toLower(keyword))
                WITH n, collect(DISTINCT keyword) AS matchedKeywords, count(*) AS hitScore
                RETURN
                  elementId(n) AS nodeId,
                  labels(n) AS labels,
                  properties(n) AS props,
                  matchedKeywords,
                  hitScore
                ORDER BY hitScore DESC
                LIMIT 60
                `,
                { keywords }
            )
        );

        const candidates: DiseaseCandidateNode[] = result.records.map((record) => {
            const props = normalizeProperties(record.get("props") as Record<string, unknown>);
            return {
                id: toStringId(record.get("nodeId")),
                labels: record.get("labels") as string[],
                name: getNodeName(props),
                description: getNodeDescription(props),
                content: getNodeContent(props),
                score: Number(record.get("hitScore") ?? 0),
                matchedKeywords: (record.get("matchedKeywords") as string[]) ?? [],
            };
        });

        return { keywords, candidates };
    } finally {
        await session.close();
    }
}

export async function getDiseaseContextByNodeIds(nodeIds: string[]): Promise<DiseaseContextNode[]> {
    const uniqueNodeIds = uniq(nodeIds.map((id) => id.trim()).filter(Boolean));
    if (uniqueNodeIds.length === 0) {
        return [];
    }

    const session = neo4jDriver.session();

    try {
        const result = await session.executeRead((tx) =>
            tx.run(
                `
                MATCH (n)
                WHERE elementId(n) IN $nodeIds
                OPTIONAL MATCH (n)-[r1]-(m1)
                WITH n, r1, m1
                WHERE r1 IS NULL OR type(r1) IN $allowedRelationTypes
                OPTIONAL MATCH (m1)-[r2]-(m2)
                WITH n, r1, m1, r2, m2
                WHERE r2 IS NULL OR (type(r2) IN $allowedRelationTypes AND elementId(m2) <> elementId(n))
                WITH n,
                    collect(DISTINCT CASE
                        WHEN r1 IS NULL THEN NULL
                        ELSE {
                            relation: type(r1),
                            relationProps: properties(r1),
                            nodeId: elementId(m1),
                            nodeLabels: labels(m1),
                            nodeProps: properties(m1)
                        }
                    END) AS rawHop1,
                    collect(DISTINCT CASE
                        WHEN r2 IS NULL THEN NULL
                        ELSE {
                            relation: type(r2),
                            relationProps: properties(r2),
                            nodeId: elementId(m2),
                            nodeLabels: labels(m2),
                            nodeProps: properties(m2)
                        }
                    END) AS rawHop2
                RETURN
                    elementId(n) AS nodeId,
                    labels(n) AS labels,
                    properties(n) AS props,
                    [e IN rawHop1 WHERE e IS NOT NULL] AS edges,
                    [e IN rawHop2 WHERE e IS NOT NULL] AS secondHopEdges
                LIMIT 50
                `,
                { nodeIds: uniqueNodeIds, allowedRelationTypes: [...ALLOWED_RELATION_TYPES] }
            )
        );

        function mapEdges(rawEdges: Array<Record<string, unknown>>): DiseaseContextEdge[] {
            return rawEdges.map((edge) => {
                const neighborProps = normalizeProperties((edge.nodeProps as Record<string, unknown>) ?? {});
                return {
                    relation: String(edge.relation ?? ""),
                    relationProps: normalizeProperties((edge.relationProps as Record<string, unknown>) ?? {}),
                    node: {
                        id: String(edge.nodeId ?? ""),
                        labels: (edge.nodeLabels as string[]) ?? [],
                        name: getNodeName(neighborProps),
                        description: getNodeDescription(neighborProps),
                        content: getNodeContent(neighborProps),
                        properties: neighborProps,
                    },
                };
            });
        }

        return result.records.map((record) => {
            const props = normalizeProperties(record.get("props") as Record<string, unknown>);
            const connected = mapEdges((record.get("edges") as Array<Record<string, unknown>>) ?? []);
            const secondHopConnected = mapEdges((record.get("secondHopEdges") as Array<Record<string, unknown>>) ?? []);

            return {
                id: toStringId(record.get("nodeId")),
                labels: record.get("labels") as string[],
                name: getNodeName(props),
                description: getNodeDescription(props),
                content: getNodeContent(props),
                properties: props,
                connected,
                secondHopConnected,
            };
        });
    } finally {
        await session.close();
    }
}

function collectEvidence(edges: DiseaseContextEdge[], evidenceMap: Map<string, LlmEvidenceItem>) {
    for (const edge of edges) {
        if (edge.relation === "PROVIDES_EVIDENCE_FOR") {
            const evidenceText = String(edge.relationProps.text ?? "").trim();
            if (!evidenceText) continue;
            const key = `${edge.node.name}-${evidenceText}`;
            if (!evidenceMap.has(key)) {
                evidenceMap.set(key, {
                    paper: edge.node.name,
                    level: String(edge.relationProps.evidenceLevel ?? edge.relationProps.level ?? "").trim(),
                    text: evidenceText,
                });
            }
        }
    }
}

export function buildLlmContextFromDiseaseContext(context: DiseaseContextNode[]): LlmDiseaseContext {
    const symptoms = context
        .filter((node) => node.labels.includes("Symptom"))
        .map((symptomNode) => {
            const diseaseSet = new Set<string>();
            const testSet = new Set<string>();
            const evidenceMap = new Map<string, LlmEvidenceItem>();

            for (const edge of [...symptomNode.connected, ...symptomNode.secondHopConnected]) {
                if (edge.node.labels.includes("Disease")) diseaseSet.add(edge.node.name);
                if (edge.node.labels.includes("Test")) testSet.add(edge.node.name);
            }
            collectEvidence([...symptomNode.connected, ...symptomNode.secondHopConnected], evidenceMap);

            return {
                name: symptomNode.name,
                overview: pickBestTextFromProperties(symptomNode.properties),
                relatedDiseases: [...diseaseSet].slice(0, 10),
                tests: [...testSet].slice(0, 8),
                evidence: [...evidenceMap.values()].slice(0, 8),
            };
        })
        .sort((a, b) => b.relatedDiseases.length - a.relatedDiseases.length);

    const diseases = context
        .filter((node) => node.labels.includes("Disease"))
        .map((diseaseNode) => {
            const symptomSet = new Set<string>();
            const testSet = new Set<string>();
            const comorbiditySet = new Set<string>();
            const differentialSet = new Set<string>();
            const evidenceMap = new Map<string, LlmEvidenceItem>();

            for (const edge of [...diseaseNode.connected, ...diseaseNode.secondHopConnected]) {
                if (edge.node.labels.includes("Symptom")) symptomSet.add(edge.node.name);
                if (edge.node.labels.includes("Test")) testSet.add(edge.node.name);
                if (edge.relation === "COMORBID_WITH") comorbiditySet.add(edge.node.name);
                if (edge.relation === "DIFFERENTIAL_OF") differentialSet.add(edge.node.name);
            }
            collectEvidence([...diseaseNode.connected, ...diseaseNode.secondHopConnected], evidenceMap);

            return {
                name: diseaseNode.name,
                overview: pickBestTextFromProperties(diseaseNode.properties),
                symptoms: [...symptomSet].slice(0, 10),
                tests: [...testSet].slice(0, 8),
                comorbidities: [...comorbiditySet].slice(0, 5),
                differentials: [...differentialSet].slice(0, 5),
                evidence: [...evidenceMap.values()].slice(0, 8),
            };
        });

    return { symptoms, diseases };
}
