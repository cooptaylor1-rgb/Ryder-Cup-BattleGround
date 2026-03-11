import SessionLineupPageClient from '@/components/captain/lineup/SessionLineupPageClient';

export default async function SessionPage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return <SessionLineupPageClient sessionId={sessionId} />;
}
