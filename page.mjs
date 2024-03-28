import { createClient } from "@libsql/client";
import ejs from 'ejs';
import fs from 'fs';

const FILE_OPTS = { 'encoding': 'utf8', 'flags': 'w' };
const client = createClient({
  url: process.env.URL ?? "file:/tmp/zig-local.db",
  authToken: process.env.TURSO_TOKEN,
});


let tmpl = fs.readFileSync(`template.ejs`, FILE_OPTS);


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

console.log(body);
