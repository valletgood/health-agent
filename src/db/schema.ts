import { pgTable, uuid, text, jsonb, timestamp, integer, date } from "drizzle-orm/pg-core";

export const intakeRecords = pgTable("intake_records", {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    formData: jsonb("form_data").notNull(),
    analysisSections: jsonb("analysis_sections").notNull(),
    specialtyCodes: text("specialty_codes").array().notNull(),
    llmContext: jsonb("llm_context"),
    followUpAnswers: jsonb("follow_up_answers"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const symptomLogs = pgTable("symptom_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    date: date("date").notNull(),
    overallScore: integer("overall_score").notNull(),
    symptoms: jsonb("symptoms").notNull(),
    memo: text("memo").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
