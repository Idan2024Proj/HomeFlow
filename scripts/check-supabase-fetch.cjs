const fs = require("fs");
const text = fs.readFileSync(".env.local", "utf8");
const match = text.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
const url = (match?.[1] || "").trim().replace(/^["']|["']$/g, "");
if (!url) {
  console.log("NO_URL");
  process.exit(1);
}
fetch(`${url}/auth/v1/health`)
  .then((r) => console.log("OK", r.status))
  .catch((e) => {
    console.log("FAIL", e.message);
    if (e.cause) console.log("CAUSE", e.cause.code || e.cause.message || String(e.cause));
  });
