import NewLineupPageClient from '@/components/captain/lineup/NewLineupPageClient';

interface NewLineupPageProps {
  searchParams?: Promise<{ mode?: string }>;
}

export default async function NewLineupPage({ searchParams }: NewLineupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const mode = resolvedSearchParams?.mode === 'session' ? 'session' : 'lineup';

  return <NewLineupPageClient mode={mode} />;
}
