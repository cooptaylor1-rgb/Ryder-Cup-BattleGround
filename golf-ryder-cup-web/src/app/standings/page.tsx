'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { StandingsCard } from '@/components/ui';
import { calculateTeamStandings, calculateMagicNumber, calculatePlayerLeaderboard } from '@/lib/services/tournamentEngine';
import { cn, formatPlayerName } from '@/lib/utils';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';

export default function StandingsPage() {
  const router = useRouter();
  const { currentTrip, teams } = useTripStore();

  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [magicNumber, setMagicNumber] = useState<MagicNumber | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if no trip
  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Load standings
  useEffect(() => {
    const loadStandings = async () => {
      if (!currentTrip) return;

      setIsLoading(true);
      try {
        const teamStandings = await calculateTeamStandings(currentTrip.id);
        const magic = calculateMagicNumber(teamStandings);
        const players = await calculatePlayerLeaderboard(currentTrip.id);

        setStandings(teamStandings);
        setMagicNumber(magic);
        setLeaderboard(players);
      } catch (error) {
        console.error('Failed to load standings:', error);
      } finally {
        setIsLoading(false);
