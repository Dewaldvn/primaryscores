import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/** Matches Supabase migration enums (uppercase labels). */
export const profileRoleEnum = pgEnum("profile_role", [
  "PUBLIC",
  "CONTRIBUTOR",
  "MODERATOR",
  "ADMIN",
]);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVIEW",
]);

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "SCHEDULED",
  "PLAYED",
  "CANCELLED",
]);

export const verificationLevelEnum = pgEnum("verification_level", [
  "SUBMITTED",
  "MODERATOR_VERIFIED",
  "SOURCE_VERIFIED",
]);

export const provinces = pgTable("provinces", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: profileRoleEnum("role").notNull().default("CONTRIBUTOR"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("profiles_email_idx").on(t.email)]
);

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officialName: text("official_name").notNull(),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull().unique(),
    provinceId: uuid("province_id")
      .notNull()
      .references(() => provinces.id),
    district: text("district"),
    town: text("town"),
    website: text("website"),
    /** Storage object path within bucket `school-logos` (public), e.g. `{schoolId}/logo.png`. */
    logoPath: text("logo_path"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("schools_province_idx").on(t.provinceId),
    index("schools_display_name_idx").on(t.displayName),
  ]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    ageGroup: text("age_group").notNull(),
    teamLabel: text("team_label").notNull(),
    isFirstTeam: boolean("is_first_team").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("teams_school_idx").on(t.schoolId)]
);

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  year: integer("year").notNull(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const competitions = pgTable(
  "competitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    provinceId: uuid("province_id").references(() => provinces.id),
    organiser: text("organiser"),
    level: text("level"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("competitions_province_idx").on(t.provinceId)]
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id").references(() => seasons.id),
    competitionId: uuid("competition_id").references(() => competitions.id),
    matchDate: date("match_date").notNull(),
    homeTeamId: uuid("home_team_id")
      .notNull()
      .references(() => teams.id),
    awayTeamId: uuid("away_team_id")
      .notNull()
      .references(() => teams.id),
    venue: text("venue"),
    status: fixtureStatusEnum("status").notNull().default("SCHEDULED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("fixtures_season_idx").on(t.seasonId),
    index("fixtures_competition_idx").on(t.competitionId),
    index("fixtures_match_date_idx").on(t.matchDate),
    index("fixtures_home_team_idx").on(t.homeTeamId),
    index("fixtures_away_team_idx").on(t.awayTeamId),
  ]
);

export const results = pgTable(
  "results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fixtureId: uuid("fixture_id")
      .notNull()
      .references(() => fixtures.id),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationLevel: verificationLevelEnum("verification_level")
      .notNull()
      .default("SUBMITTED"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("results_fixture_id_unique").on(t.fixtureId),
    /** Speeds up home / results listing; avoids statement_timeout on full scans. */
    index("results_verified_published_at_idx")
      .on(t.publishedAt.desc())
      .where(sql`${t.isVerified} = true and ${t.publishedAt} is not null`),
  ]
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fixtureId: uuid("fixture_id").references(() => fixtures.id),
    proposedHomeTeamId: uuid("proposed_home_team_id").references(() => teams.id),
    proposedAwayTeamId: uuid("proposed_away_team_id").references(() => teams.id),
    proposedHomeTeamName: text("proposed_home_team_name").notNull(),
    proposedAwayTeamName: text("proposed_away_team_name").notNull(),
    proposedSchoolName: text("proposed_school_name"),
    proposedMatchDate: date("proposed_match_date").notNull(),
    proposedHomeScore: integer("proposed_home_score").notNull(),
    proposedAwayScore: integer("proposed_away_score").notNull(),
    proposedVenue: text("proposed_venue"),
    proposedCompetitionId: uuid("proposed_competition_id").references(
      () => competitions.id
    ),
    proposedSeasonId: uuid("proposed_season_id").references(() => seasons.id),
    proposedProvinceId: uuid("proposed_province_id").references(
      () => provinces.id
    ),
    submittedByUserId: uuid("submitted_by_user_id").references(() => profiles.id),
    sourceUrl: text("source_url"),
    notes: text("notes"),
    moderationStatus: moderationStatusEnum("moderation_status")
      .notNull()
      .default("PENDING"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => profiles.id),
  },
  (t) => [
    index("submissions_status_idx").on(t.moderationStatus),
    index("submissions_submitted_idx").on(t.submittedAt),
    index("submissions_user_idx").on(t.submittedByUserId),
  ]
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("attachments_submission_idx").on(t.submissionId)]
);

export const moderationLogs = pgTable(
  "moderation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    moderatorUserId: uuid("moderator_user_id")
      .notNull()
      .references(() => profiles.id),
    action: text("action").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("moderation_logs_submission_idx").on(t.submissionId)]
);

/* —— relations (for nested queries when needed) —— */

export const provincesRelations = relations(provinces, ({ many }) => ({
  schools: many(schools),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  province: one(provinces, {
    fields: [schools.provinceId],
    references: [provinces.id],
  }),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  school: one(schools, { fields: [teams.schoolId], references: [schools.id] }),
  homeFixtures: many(fixtures, { relationName: "homeTeam" }),
  awayFixtures: many(fixtures, { relationName: "awayTeam" }),
}));

export const fixturesRelations = relations(fixtures, ({ one }) => ({
  season: one(seasons, { fields: [fixtures.seasonId], references: [seasons.id] }),
  competition: one(competitions, {
    fields: [fixtures.competitionId],
    references: [competitions.id],
  }),
  homeTeam: one(teams, {
    fields: [fixtures.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [fixtures.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
  result: one(results, {
    fields: [fixtures.id],
    references: [results.fixtureId],
  }),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  fixture: one(fixtures, {
    fields: [results.fixtureId],
    references: [fixtures.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  submitter: one(profiles, {
    fields: [submissions.submittedByUserId],
    references: [profiles.id],
    relationName: "submissionSubmitter",
  }),
  reviewer: one(profiles, {
    fields: [submissions.reviewedByUserId],
    references: [profiles.id],
    relationName: "submissionReviewer",
  }),
  attachments: many(attachments),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  authoredSubmissions: many(submissions, {
    relationName: "submissionSubmitter",
  }),
  reviewedSubmissions: many(submissions, {
    relationName: "submissionReviewer",
  }),
}));
