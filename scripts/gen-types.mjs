// Regenerates types/database.ts from the live chatten_cafe schema.
//
//   npm run types:generate   # write types/database.ts
//   npm run types:check      # fail if the committed file is stale
//
// Why not `supabase gen types`: the CLI wants either a linked cloud project or
// a direct database URL it can reach from a container it starts locally. This
// deployment is self-hosted with Postgres unpublished on the host, so the CLI
// path needs an SSH tunnel plus a local Docker pull, and the password ends up
// on a command line. The supabase-meta container already running on the server
// exposes the same generator over HTTP, reachable through the SSH session we
// are already authorised for, with no credential in argv at all.
//
// Requires SSH access to the Supabase host. Read-only: it issues one GET
// against postgres-meta and writes a single local file.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const HOST = process.env.SUPABASE_SSH_HOST ?? "maskhar@20.20.20.173";
const DIR = process.env.SUPABASE_DOCKER_DIR ?? "~/docker/supabase/supabase-1.26.05/docker";
const SCHEMA = "chatten_cafe";
const TARGET = "types/database.ts";

const fetcher = `const http=require("http");http.get("http://localhost:8080/generators/typescript?included_schemas=${SCHEMA}",(r)=>{if(r.statusCode!==200){console.error("postgres-meta returned "+r.statusCode);process.exit(1)}let d="";r.on("data",c=>d+=c);r.on("end",()=>process.stdout.write(d))}).on("error",(e)=>{console.error(e.message);process.exit(1)});`;

function generate() {
  const remote = `cd ${DIR} && docker compose exec -T meta node -e '${fetcher}'`;
  return execFileSync("ssh", [HOST, remote], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

const generated = generate();
if (!generated.includes(`${SCHEMA}: {`) || !generated.includes("export type Database")) {
  console.error("Generator output does not look like a Database type. Refusing to write.");
  process.exit(1);
}

if (process.argv.includes("--check")) {
  // Normalise line endings only: the repo has no .gitattributes pinning LF, so
  // a Windows checkout would otherwise fail this on CRLF alone.
  const committed = readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");
  if (committed !== generated.replace(/\r\n/g, "\n")) {
    console.error(`${TARGET} is out of date with the ${SCHEMA} schema. Run \`npm run types:generate\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${TARGET} matches the live ${SCHEMA} schema.`);
} else {
  writeFileSync(TARGET, generated);
  console.log(`Wrote ${TARGET} (${generated.split("\n").length} lines).`);
}
