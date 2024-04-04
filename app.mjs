#!/usr/bin/env node

import { createClient } from "@libsql/client";
import ejs from 'ejs';
import fs from 'fs';

const client = createClient({
  url: process.env.TURSO_DB_URL ?? "file:./zig-milestone.db",
  authToken: process.env.TURSO_TOKEN,
});
const GITHUB_HEADERS = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/json',
};

async function initDatabase() {
  let sqls = fs.readFileSync('schema.sql', 'utf8').split(';');
  sqls = sqls.filter((sql) => sql.trim().length > 0);
  console.log(sqls, sqls.length);
  const ret = await client.batch(sqls, 'write');
  console.log(ret);
}

async function fetchRepoHistories() {
  const graphql = `
query {
  repository(owner:"ziglang", name:"zig") {
    forkCount
    stargazerCount
    watchers { totalCount }
    openPulls: pullRequests(states:OPEN) {
      totalCount
    }
    closedPulls: pullRequests(states:CLOSED) {
      totalCount
    }
    mergedPulls: pullRequests(states:MERGED) {
      totalCount
    }
    openIssues: issues(states:OPEN) {
      totalCount
    }
    closedIssues: issues(states:CLOSED) {
      totalCount
    }

  }
}
`;
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: GITHUB_HEADERS,
    body: JSON.stringify({query: graphql})
  });
  if(!r.ok) {
    throw new Error(await r.text());
  }
  const body = JSON.parse(await r.text());
  console.log(JSON.stringify(body, null, 2));
  const repoInfo = await body['data']['repository'];
  const sqlRet = await client.execute({
    sql: `
INSERT INTO repo_histories (
  created_at,
  forks,
  stars,
  watchers,
  open_pulls,
  closed_pulls,
  merged_pulls,
  open_issues,
  closed_issues
)
    VALUES (?,?,?,?,?,?,?,?,?)
`,
    args: [
      Date.now(),
      repoInfo['forkCount'],
      repoInfo['stargazerCount'],
      repoInfo['watchers']['totalCount'],
      repoInfo['openPulls']['totalCount'],
      repoInfo['closedPulls']['totalCount'],
      repoInfo['mergedPulls']['totalCount'],
      repoInfo['openIssues']['totalCount'],
      repoInfo['closedIssues']['totalCount'],
    ],
  });
  console.log(`insert repo history result`, sqlRet);
}

async function fetchMilestoneHistories() {
  const result = await client.execute(
    "select id from milestones where state = 'open'"
  );
  const now = Date.now();
  let firstErr = null;
  for (const row of result.rows) {
    const mid = row['id'];
    const resp = await fetch(`https://api.github.com/repos/ziglang/zig/milestones/${mid}`, {
      headers: GITHUB_HEADERS,
    });
    const milestone = await resp.json();
    try {
      const r = await client.execute({
        sql: `
INSERT INTO milestone_histories (created_at, mid, open_issues, closed_issues)
    VALUES (:created_at, :mid, :open_issues, :closed_issues)
`,
        args: {
          created_at: now,
          mid: mid,
          open_issues: milestone['open_issues'],
          closed_issues: milestone['closed_issues'],
        },
      });
      console.log(r);
    } catch (e) {
      if (!firstErr) {
        firstErr = e;
      }
      console.error(mid, e);
    }
  }

  if (firstErr) {
    throw firstErr;
  }
}

async function fetchMilestones() {
  const resp = await fetch('https://api.github.com/repos/ziglang/zig/milestones', {
    headers: GITHUB_HEADERS,
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
  const milestones = await resp.json();
  for(const m of milestones) {
    const r = await client.execute({
      sql: `
INSERT INTO milestones (id, created_at, updated_at, state, title, description)
    VALUES (:id, :created_at, :updated_at, :state, :title, :description)
`,
      args: {
        id: m['number'],
        created_at: m['created_at'],
        updated_at: m['updated_at'],
        state: m['state'],
        title: m['title'],
        description: m['description'],
      },
    });
    console.log(`insert milestone result`, r);
  }
}

async function GenerateHtml() {
  const fileOpts = { 'encoding': 'utf8', 'flags': 'w' };
  let idToTitle = {};
  {
    const rs = await client.execute(
      `
SELECT
    id,
    title
FROM
    milestones m
WHERE
    state = 'open'
`
    );
    for (const row of rs.rows) {
      idToTitle[row['id']] = row['title'];
    }
    console.log(idToTitle);
  }
  let repoHistories = [];
  {
    const rs = await client.execute(
      `
SELECT
  created_at,
  forks,
  stars,
  watchers,
  open_pulls,
  closed_pulls,
  merged_pulls,
  open_issues,
  closed_issues
FROM
    repo_histories
ORDER BY
    created_at desc
limit 1000
`
    );
    for (const row of rs.rows) {
      repoHistories.push([
        row['created_at'],
        row['forks'],
        row['stars'],
        row['watchers'],
        row['open_pulls'],
        row['closed_pulls'],
        row['merged_pulls'],
        row['open_issues'],
        row['closed_issues'],
      ]);
    }
  }

  const idsToShow = [
    '23', // 0.12.0
    '20', // 0.13.0
    '19', // '0.14.0',
    '14', // '0.15.0',
    '2', // '1.0.0'
    '5', // '1.1.0',
  ];

  const sqls = idsToShow.map((id) => {
    return { sql: `
SELECT
    created_at,
    open_issues,
    closed_issues
FROM
    milestone_histories
where mid = ?
ORDER BY
    created_at desc
limit 1000
`, args: [id] };
  });
  const histories = await client.batch(sqls, 'read');
  let historiesById = {}; // id -> [[timestamp, open, closed], ...]
  idsToShow.forEach((id, idx) => {
    historiesById[id] = histories[idx].rows.map((row) =>
      [row['created_at'], row['open_issues'], row['closed_issues']]);
  });
  let tmpl = fs.readFileSync(`template.ejs`, fileOpts);
  let body = ejs.render(tmpl, {
    now: new Date().toLocaleString('en-GB'),
    historiesById: historiesById,
    historiesByIdStr: JSON.stringify(historiesById),
    repoHistoriesStr: JSON.stringify(repoHistories),
    idToTitle: idToTitle,
    idsToShow: idsToShow,
  });
  fs.writeFileSync('web/raw.html', body, fileOpts);
}

const args = process.argv.slice(2);
const cmd = args[0];
switch(cmd) {
case 'fetch-history':
  await fetchRepoHistories();
  await fetchMilestoneHistories();
  break;
case 'fetch-milestone':
  await fetchMilestones();
  break;
case 'gen-html':
  await GenerateHtml();
  break;
case 'init-db':
  await initDatabase();
  break;
default:
  console.error("unknown cmd", cmd);
}
