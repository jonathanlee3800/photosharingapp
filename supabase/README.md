# Supabase Migrations & Database Guide

This directory contains the database migration files and the declarative schema for the WithLove Photo Sharing application.

## Directory Structure

```
supabase/
├── migrations/
│   └── 20261022000000_initial_schema.sql  # Sequential migration file for Supabase CLI
├── schema.sql                              # Single source of truth declarative schema
└── README.md                               # This documentation
```

## How to Apply Migrations

You have two ways to apply changes to your Supabase cloud database:

### Method 1: Via the Supabase CLI (Recommended for Developers)

1. **Link your local project to your Supabase project:**
   ```powershell
   npx.cmd supabase link --project-ref nkxgvgijswqbpcektphk
   ```
   *(You will be prompted for your database password from your Supabase dashboard).*

2. **Push your migrations to the cloud database:**
   ```powershell
   npx.cmd supabase db push
   ```

3. **Pull new schema changes down from the cloud:**
   If you created or modified tables in the online Supabase Table Editor:
   ```powershell
   npx.cmd supabase db pull
   ```

4. **Create a new migration file:**
   ```powershell
   npx.cmd supabase migration new <migration_name>
   ```

---

### Method 2: Via Supabase Dashboard (Zero-install / Browser)

If you don't want to use the CLI:
1. Open [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the contents of `supabase/schema.sql`.
4. Click **Run**.

