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
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/** Matches Supabase migration enums (uppercase labels). */
export const profileRoleEnum = pgEnum("profile_role", [
  "CONTRIBUTOR",
  "MODERATOR",
  "ADMIN",
  "SCHOOL_ADMIN",
]);

export const schoolAdminMembershipStatusEnum = pgEnum("school_admin_membership_status", [
  "PENDING",
  "ACTIVE",
  "REVOKED",
]);

export const profileOnboardingStatusEnum = pgEnum("profile_onboarding_status", [
  "PENDING",
  "COMPLETED",
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

export const liveSessionStatusEnum = pgEnum("live_session_status", [
  "ACTIVE",
  "WRAPUP",
  "CLOSED",
  "SCHEDULED",
]);

export const schoolSportEnum = pgEnum("school_sport", [
  "RUGBY",
  "NETBALL",
  "HOCKEY",
  "SOCCER",
]);

export const schoolTypeEnum = pgEnum("school_type", ["PRIMARY", "SECONDARY", "COMBINED"]);

export const teamGenderEnum = pgEnum("team_gender", ["MALE", "FEMALE"]);
export const feedbackIssueEnum = pgEnum("feedback_issue", ["BUG", "LOGIC", "SUGGESTION", "DONT_LIKE"]);
export const feedbackDeliveryStatusEnum = pgEnum("feedback_delivery_status", [
  "QUEUED",
  "SENT",
  "FAILED",
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
    /** Storage object path within bucket `user-avatars` (public), e.g. `{userId}/avatar.png`. */
    avatarPath: text("avatar_path"),
    role: profileRoleEnum("role").notNull().default("CONTRIBUTOR"),
    onboardingStatus: profileOnboardingStatusEnum("onboarding_status")
      .notNull()
      .default("PENDING"),
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
    town: text("town"),
    website: text("website"),
    /** Optional very short label (crest, app badges); listings still use display_name. */
    nickname: text("nickname"),
    schoolType: schoolTypeEnum("school_type").notNull().default("PRIMARY"),
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

export const schoolAdminMemberships = pgTable(
  "school_admin_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    status: schoolAdminMembershipStatusEnum("status").notNull().default("PENDING"),
    /** Uploaded proof letter path in `school-admin-claims` bucket (required for new requests). */
    requestedLetterPath: text("requested_letter_path"),
    requestedLetterFileName: text("requested_letter_file_name"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByProfileId: uuid("decided_by_profile_id").references(() => profiles.id),
  },
  (t) => [
    index("school_admin_memberships_profile_idx").on(t.profileId),
    index("school_admin_memberships_school_idx").on(t.schoolId),
    index("school_admin_memberships_status_idx").on(t.status),
    uniqueIndex("school_admin_memberships_profile_school_pending_active_uq")
      .on(t.profileId, t.schoolId)
      .where(sql`${t.status} in ('PENDING','ACTIVE')`),
  ]
);

export const profileFavouriteSchools = pgTable(
  "profile_favourite_schools",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.schoolId] }),
    index("profile_favourite_schools_profile_idx").on(t.profileId),
  ]
);

export const profileFavouriteTeams = pgTable(
  "profile_favourite_teams",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.teamId] }),
    index("profile_favourite_teams_profile_idx").on(t.profileId),
  ]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    /** Free-text age band (e.g. U13, U16A) — conventions differ by sport. */
    ageGroup: text("age_group").notNull(),
    sport: schoolSportEnum("sport").notNull().default("RUGBY"),
    /** Boys / girls side where relevant (e.g. hockey); null for unspecified or other sports. */
    gender: teamGenderEnum("gender"),
    teamLabel: text("team_label").notNull(),
    teamNickname: text("team_nickname"),
    isFirstTeam: boolean("is_first_team").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("teams_school_idx").on(t.schoolId),
    index("teams_school_sport_idx").on(t.schoolId, t.sport),
    index("teams_school_sport_gender_idx").on(t.schoolId, t.sport, t.gender),
    uniqueIndex("teams_school_sport_age_label_gender_notnull_uq")
      .on(t.schoolId, t.sport, t.ageGroup, t.teamLabel, t.gender)
      .where(sql`${t.gender} is not null`),
    uniqueIndex("teams_school_sport_age_label_gender_null_uq")
      .on(t.schoolId, t.sport, t.ageGroup, t.teamLabel)
      .where(sql`${t.gender} is null`),
  ]
);

/** Optional association between a registered user and a team (e.g. coaches / managers). */
export const profileTeamLinks = pgTable(
  "profile_team_links",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdByProfileId: uuid("created_by_profile_id").references(() => profiles.id),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.teamId] }),
    index("profile_team_links_team_idx").on(t.teamId),
  ]
);

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  sport: schoolSportEnum("sport").notNull().default("RUGBY"),
  provinceId: uuid("province_id").references(() => provinces.id),
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
    sport: schoolSportEnum("sport").notNull().default("RUGBY"),
    year: integer("year"),
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
    /** Optional public URL (e.g. Super Sports Schools match recording). */
    recordingUrl: text("recording_url"),
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
    /** When true, shown with dummy styling (e.g. test or placeholder data). */
    isDummy: boolean("is_dummy").notNull().default(false),
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
    /** Optional; copied to fixtures.recording_url when approved. */
    recordingUrl: text("recording_url"),
    notes: text("notes"),
    liveSessionId: uuid("live_session_id"),
    isDummy: boolean("is_dummy").notNull().default(false),
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
    index("submissions_live_session_idx").on(t.liveSessionId),
  ]
);

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sport: schoolSportEnum("sport").notNull().default("RUGBY"),
    teamGender: teamGenderEnum("team_gender"),
    homeTeamName: text("home_team_name").notNull(),
    awayTeamName: text("away_team_name").notNull(),
    homeLogoPath: text("home_logo_path"),
    awayLogoPath: text("away_logo_path"),
    venue: text("venue"),
    seasonId: uuid("season_id").references(() => seasons.id),
    competitionId: uuid("competition_id").references(() => competitions.id),
    /** When status is SCHEDULED, voting opens at this instant (UTC). Null for immediate boards. */
    goesLiveAt: timestamp("goes_live_at", { withTimezone: true }),
    status: liveSessionStatusEnum("status").notNull().default("ACTIVE"),
    /** When scoring opened: immediate ACTIVE insert, or SCHEDULED→ACTIVE uses goes_live_at (not first vote). */
    scoringOpenedAt: timestamp("scoring_opened_at", { withTimezone: true }),
    firstVoteAt: timestamp("first_vote_at", { withTimezone: true }),
    wrapupStartedAt: timestamp("wrapup_started_at", { withTimezone: true }),
    submissionId: uuid("submission_id").references(() => submissions.id),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("live_sessions_status_idx").on(t.status),
    index("live_sessions_first_vote_idx").on(t.firstVoteAt),
    index("live_sessions_sport_status_idx").on(t.sport, t.status),
    index("live_sessions_scheduled_goes_live_idx").on(t.goesLiveAt),
  ]
);

export const liveScoreVotes = pgTable(
  "live_score_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    voterKey: text("voter_key").notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("live_score_votes_session_idx").on(t.sessionId),
    index("live_score_votes_session_created_idx").on(t.sessionId, t.createdAt),
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

export const feedbackSubmissions = pgTable(
  "feedback_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    cellNo: text("cell_no").notNull(),
    email: text("email").notNull(),
    issue: feedbackIssueEnum("issue").notNull(),
    detail: text("detail").notNull(),
    screenshotFileName: text("screenshot_file_name"),
    screenshotMimeType: text("screenshot_mime_type"),
    screenshotSizeBytes: integer("screenshot_size_bytes"),
    screenshotBase64: text("screenshot_base64"),
    emailDeliveryStatus: feedbackDeliveryStatusEnum("email_delivery_status").notNull().default("QUEUED"),
    emailError: text("email_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("feedback_submissions_created_idx").on(t.createdAt),
    index("feedback_submissions_email_delivery_idx").on(t.emailDeliveryStatus),
  ]
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
  schoolAdminMemberships: many(schoolAdminMemberships),
}));

export const schoolAdminMembershipsRelations = relations(schoolAdminMemberships, ({ one }) => ({
  profile: one(profiles, {
    fields: [schoolAdminMemberships.profileId],
    references: [profiles.id],
  }),
  school: one(schools, {
    fields: [schoolAdminMemberships.schoolId],
    references: [schools.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  school: one(schools, { fields: [teams.schoolId], references: [schools.id] }),
  homeFixtures: many(fixtures, { relationName: "homeTeam" }),
  awayFixtures: many(fixtures, { relationName: "awayTeam" }),
  profileLinks: many(profileTeamLinks),
}));

export const profileTeamLinksRelations = relations(profileTeamLinks, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileTeamLinks.profileId],
    references: [profiles.id],
  }),
  team: one(teams, {
    fields: [profileTeamLinks.teamId],
    references: [teams.id],
  }),
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
  schoolAdminMemberships: many(schoolAdminMemberships),
  teamLinks: many(profileTeamLinks),
}));
