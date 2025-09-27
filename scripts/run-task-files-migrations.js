// Node.js migration runner for task files (JS version)
// Uses POSTGRES_URL_* envs provided by your environment.

import { readFile } from "fs/promises"
import { Client } from "pg"

async function main() {
  const conn = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL

  if (!conn) {
    console.error("Missing POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING environment variable.")
    process.exit(1)
  }

  const client = new Client({ connectionString: conn })
  await client.connect()

  try {
    console.log("Connected. Checking prerequisites...")

    // Ensure 011 is applied (assignee_id column), because 012 policies reference it.
    const colCheck = await client.query(
      `select 1 as ok
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'tasks'
         and column_name = 'assignee_id'
       limit 1`,
    )
    const hasAssignee = colCheck.rowCount > 0
    if (!hasAssignee) {
      console.log('Column "tasks.assignee_id" not found. Applying scripts/db/011_tasks_add_assignee.sql...')
      const sql011 = await readFile("scripts/db/011_tasks_add_assignee.sql", "utf8")
      await client.query(sql011)
      console.log("✓ 011_tasks_add_assignee.sql applied")
    } else {
      console.log('✓ Column "tasks.assignee_id" present')
    }

    // Apply 012 (task_files table + RLS)
    console.log("Applying scripts/db/012_task_files.sql...")
    const sql012 = await readFile("scripts/db/012_task_files.sql", "utf8")
    await client.query(sql012)
    console.log("✓ 012_task_files.sql applied")

    // Apply 013 (task-files storage bucket)
    try {
      console.log("Applying scripts/db/013_storage_task_files.sql...")
      const sql013 = await readFile("scripts/db/013_storage_task_files.sql", "utf8")
      await client.query(sql013)
      console.log("✓ 013_storage_task_files.sql applied")
    } catch (e) {
      console.warn("Warning applying 013_storage_task_files.sql:", e?.message || e)
      console.warn(
        "If this failed due to the storage schema, you can create the bucket via the REST route /api/storage/ensure?bucket=task-files later.",
      )
    }

    // Apply 014 (add file_category column)
    console.log("Applying scripts/db/014_task_files_add_category.sql...")
    const sql014 = await readFile("scripts/db/014_task_files_add_category.sql", "utf8")
    await client.query(sql014)
    console.log("✓ 014_task_files_add_category.sql applied")

    // Verify post-conditions
    const tableCheck = await client.query(
      `select 1 as ok
       from information_schema.tables
       where table_schema = 'public'
         and table_name = 'task_files'
       limit 1`,
    )
    if (tableCheck.rowCount === 0) {
      throw new Error('Post-check failed: table "public.task_files" not found.')
    }

    console.log("All done. Task attachments are ready. Reload /tarefas and open a task to test uploads.")
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("Migration failed:", err?.message || err)
  process.exit(1)
})
