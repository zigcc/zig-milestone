#!/usr/bin/env node

import { createClient } from "@libsql/client";
import ejs from 'ejs';
import fs from 'fs';

const client = createClient({
  url: process.env.URL ?? "file:/tmp/zig-local.db",
  authToken: process.env.TURSO_TOKEN,
});

async function fetch_milestone_histories() {
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

async function fetch_milestones() {
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

async function generate_html() {
  const file_opts = { 'encoding': 'utf8', 'flags': 'w' };
  let tmpl = fs.readFileSync(`template.ejs`, file_opts);
  const rs = await client.execute(
    `
SELECT
    mh.created_at,
    title,
    open_issues,
    closed_issues,
    mh.mid
FROM
    milestone_histories mh,
    milestones m
WHERE
    mh.mid = m.id
    and m.state = 'open'
    and open_issues > 0
ORDER BY
    title,
    mh.created_at DESC
`
  );
  const rows = rs.rows;
  let body = ejs.render(tmpl, {
    rows: rows,
    now: new Date().toLocaleString('en-GB')
  });

  fs.writeFileSync('raw.html', body, file_opts);
}

const args = process.argv.slice(2);
const cmd = args[0];
switch(cmd) {
case 'fetch-history':
  await fetch_milestone_histories();
  console.log(cmd);
  break;
case 'fetch-milestone':
  await fetch_milestones();
  break;
case 'gen-page':
  await generate_html();
  break;
default:
  console.error("unknown");
}
