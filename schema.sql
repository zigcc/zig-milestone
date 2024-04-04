CREATE TABLE IF NOT EXISTS milestones (
  id integer PRIMARY KEY,
  created_at integer,
  updated_at integer,
  state text,
  title text,
  description text
);

CREATE TABLE IF NOT EXISTS milestone_histories (
  created_at integer,
  mid integer,
  open_issues integer,
  closed_issues integer
);

CREATE TABLE IF NOT EXISTS repo_histories (
  created_at integer,
  forks integer,
  stars integer,
  watchers integer,
  open_pulls integer,
  closed_pulls integer,
  merged_pulls integer,
  open_issues integer,
  closed_issues integer
);
