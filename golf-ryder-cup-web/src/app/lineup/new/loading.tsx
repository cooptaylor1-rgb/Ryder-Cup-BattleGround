/**
 * New Lineup Page Loading State
 *
 * Shown while the lineup builder bootstraps trip data, teams, and
 * existing matches. Prevents a blank flash on the critical pre-event
 * setup path.
 */
import { PageLoadingSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageLoadingSkeleton title="Building lineup..." variant="detail" />;
}
