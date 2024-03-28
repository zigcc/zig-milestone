import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.URL ?? "file:/tmp/zig-local.db",
  authToken: process.env.TURSO_TOKEN,
});

async function fetch_milestone_histories() {
  const rs = await client.execute(
    "select id from milestones where state = 'open'"
  );
  const now = Date.now();
  const sqls = [];
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

await fetch_milestone_histories();

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
