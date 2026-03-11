import SpectatorPageClient from '@/components/spectator/SpectatorPageClient';

export default async function SpectatorPage({
    params,
}: {
    params: Promise<{ tripId: string }>;
}) {
    const { tripId } = await params;
    return <SpectatorPageClient tripId={tripId} />;
}
