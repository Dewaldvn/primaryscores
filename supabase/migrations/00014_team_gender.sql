-- Optional team gender (e.g. hockey boys vs girls sides). NULL = not specified / N/A for sport.
CREATE TYPE team_gender AS ENUM ('MALE', 'FEMALE');

ALTER TABLE teams ADD COLUMN gender team_gender NULL;
COMMENT ON COLUMN teams.gender IS 'For sports with separate sides (e.g. hockey): MALE or FEMALE. NULL for unspecified or sports without this split.';

CREATE INDEX teams_school_sport_gender_idx ON teams (school_id, sport, gender);
