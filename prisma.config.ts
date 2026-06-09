// Prisma 7 config — loads .env.local for Supabase credentials
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct connection (no pooler) for CLI operations: migrate, generate, db push
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
