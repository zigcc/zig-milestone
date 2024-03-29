#!/usr/bin/env node

import { createClient } from "@libsql/client";
import ejs from 'ejs';
import fs from 'fs';

const client = createClient({
  url: process.env.URL ?? "file:/tmp/zig-local.db",
  authToken: process.env.TURSO_TOKEN,
});

async function fetchHistories() {
  const rs = await client.execute(
    "select id from milestones where state = 'open'"
  );
  const now = Date.now();
  for (const row of rs.rows) {
    const mid = row['id'];
    const resp = await fetch(`https://api.github.com/repos/ziglang/zig/milestones/${mid}`);
    const m = await resp.json();

    try {
      const r = await client.execute({
        sql: "INSERT INTO milestone_histories VALUES (:created_at, :mid, :open_issues, :closed_issues)",
        args: {
          created_at: now,
          mid: mid,
          open_issues: m['open_issues'],
          closed_issues: m['closed_issues'],
        },
      });
      console.log(r);
    } catch (e) {
      console.error(mid, e);
    }
  }

}

async function fetchMilestones() {
  const resp = await fetch('https://api.github.com/repos/ziglang/zig/milestones');
  const milestones = await resp.json();
  for(const m of milestones) {
    const r = await client.execute({
      sql: "INSERT INTO milestones VALUES (:id, :created_at, :updated_at, :state, :title, :description)",
      args: {
        id: m['number'],
        created_at: m['created_at'],
        updated_at: m['updated_at'],
        state: m['state'],
        title: m['title'],
        description: m['description'],
      },
    });
    console.log(`insert ret ${JSON.stringify(r)}`);
  }
}

async function GenerateHtml() {
  const file_opts = { 'encoding': 'utf8', 'flags': 'w' };
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
  let idToTitle = {};
  for (const row of rs.rows) {
    idToTitle[row['id']] = row['title'];
  }
  console.log(idToTitle);

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
  let tmpl = fs.readFileSync(`template.ejs`, file_opts);
  let body = ejs.render(tmpl, {
    now: new Date().toLocaleString('en-GB'),
    historiesById: historiesById,
    historiesByIdStr: JSON.stringify(historiesById),
    idToTitleStr: JSON.stringify(idToTitle),
    idsToShow: idsToShow,
  });
  fs.writeFileSync('web/raw.html', body, file_opts);
}

const args = process.argv.slice(2);
const cmd = args[0];
switch(cmd) {
case 'fetch-history':
  await fetchHistories();
  console.log(cmd);
  break;
case 'fetch-milestone':
  await fetchMilestones();
  break;
case 'gen-page':
  await GenerateHtml();
  break;
default:
  console.error("unknown");
}
