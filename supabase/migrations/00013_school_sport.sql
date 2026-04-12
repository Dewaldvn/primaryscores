-- Multi-sport: teams and live sessions carry a sport code (fixtures infer sport via team rows).
CREATE TYPE school_sport AS ENUM ('RUGBY', 'NETBALL', 'HOCKEY', 'SOCCER');

ALTER TABLE teams ADD COLUMN sport school_sport NOT NULL DEFAULT 'RUGBY';
CREATE INDEX teams_school_sport_idx ON teams (school_id, sport);

ALTER TABLE live_sessions ADD COLUMN sport school_sport NOT NULL DEFAULT 'RUGBY';
CREATE INDEX live_sessions_sport_status_idx ON live_sessions (sport, status);
