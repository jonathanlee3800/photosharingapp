import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function InstrumentsPage() {
  const supabase = await createClient();
  const { data: instruments, error } = await supabase.from('instruments').select('*');

  return (
    <div className="min-h-screen bg-neutral-50 p-8 font-sans text-neutral-800">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm border border-neutral-200">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Supabase Instruments Test Page</h1>
            <p className="text-sm text-neutral-500">Official Supabase Next.js Quickstart Reference</p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            ← Back to App
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-neutral-700">Database Status:</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              ● Connected to Supabase
            </span>
          </div>

          {error ? (
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
              <h2 className="text-sm font-semibold text-amber-900">
                Notice: &#39;instruments&#39; table not found yet
              </h2>
              <p className="mt-1 text-xs text-amber-700">
                The connection to your Supabase project is working, but the quickstart sample table
                has not been created yet in your database.
              </p>
              <p className="mt-3 text-xs font-medium text-amber-800">
                To create it, run this SQL in your Supabase Dashboard → SQL Editor:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-emerald-400">
{`create table instruments (
  id bigint primary key generated always as identity,
  name text not null
);

insert into instruments (name)
values
  ('Violin'),
  ('Viola'),
  ('Cello');

alter table instruments enable row level security;

create policy "public can read instruments"
on public.instruments
for select
to anon
using (true);`}
              </pre>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-neutral-700 mb-2">Query Results:</h2>
              <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs text-emerald-400">
                {JSON.stringify(instruments, null, 2)}
              </pre>

              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Instruments List
                </h3>
                <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-neutral-50/50">
                  {instruments && instruments.length > 0 ? (
                    instruments.map((inst: { id: number | string; name: string }) => (
                      <li key={inst.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="font-medium text-neutral-800">{inst.name}</span>
                        <span className="text-xs text-neutral-400">ID: {inst.id}</span>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-3 text-xs text-neutral-500">No instruments found in table.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

