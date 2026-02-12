"use client";

/**
 * NassauEnhancedCard - Nassau with Auto-Press UI Component
 *
 * Full-featured Nassau game interface with:
 * - Front 9, Back 9, Overall tracking
 * - Auto-press at threshold
 * - Manual press option
 * - Complete payout calculation
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createNassauEnhanced,
  recordNassauHoleResult,
  addManualPress,
  calculateNassauPayouts,
} from "@/lib/services/extendedSideGamesService";
import type { NassauEnhanced, NassauPress } from "@/lib/types/sideGames";
import type { Player, UUID } from "@/lib/types/models";
import { cn } from "@/lib/utils";

interface NassauEnhancedCardProps {
  tripId: UUID;
  sessionId?: UUID;
  players: Player[];
  existingGame?: NassauEnhanced;
  onSave?: (game: NassauEnhanced) => void;
  onClose?: () => void;
}

export function NassauEnhancedCard({
  tripId,
  sessionId,
  players,
  existingGame,
  onSave,
  onClose,
}: NassauEnhancedCardProps) {
  const [game, setGame] = useState<NassauEnhanced | null>(existingGame || null);
  const [setupMode, setSetupMode] = useState(!existingGame);
  const [gameName, setGameName] = useState("Nassau");
  const [baseValue, setBaseValue] = useState(10);
  const [autoPressEnabled, setAutoPressEnabled] = useState(true);
  const [autoPressThreshold, setAutoPressThreshold] = useState(2);
  const [maxPresses, setMaxPresses] = useState(3);
  const [team1, setTeam1] = useState<UUID[]>([]);
  const [team2, setTeam2] = useState<UUID[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [pendingScores, setPendingScores] = useState<{ team1: number | ""; team2: number | "" }>(
    {
      team1: "",
      team2: "",
    }
  );
  const [showPayouts, setShowPayouts] = useState(false);

  // Get player name
  const getPlayerName = useCallback(
    (playerId: UUID): string => {
      const player = players.find((p) => p.id === playerId);
      return player ? `${player.firstName} ${player.lastName?.[0] || ""}`.trim() : "Unknown";
    },
    [players]
  );

  // Start game
  const handleStartGame = useCallback(() => {
    if (team1.length === 0 || team2.length === 0) {
      alert("Each team must have at least 1 player");
      return;
    }

    const newGame = createNassauEnhanced(
      tripId,
      gameName,
      baseValue,
      team1,
      team2,
      sessionId,
      autoPressEnabled,
      autoPressThreshold,
      maxPresses
    );

    setGame(newGame);
    setSetupMode(false);
    onSave?.(newGame);
  }, [
    tripId,
    sessionId,
    gameName,
    baseValue,
    team1,
    team2,
    autoPressEnabled,
    autoPressThreshold,
    maxPresses,
    onSave,
  ]);

  // Record hole score
  const handleRecordHole = useCallback(() => {
    if (!game || pendingScores.team1 === "" || pendingScores.team2 === "") return;

    const updatedGame = recordNassauHoleResult(
      game,
      currentHole,
      Number(pendingScores.team1),
      Number(pendingScores.team2)
    );

    setGame(updatedGame);
    onSave?.(updatedGame);

    if (currentHole < 18) {
      setCurrentHole((h) => h + 1);
      setPendingScores({ team1: "", team2: "" });
    } else {
      setShowPayouts(true);
    }
  }, [game, currentHole, pendingScores, onSave]);

  // Add manual press
  const handleAddPress = useCallback(
    (nine: "front" | "back" | "overall", team: "team1" | "team2") => {
      if (!game) return;

      try {
        const updatedGame = addManualPress(game, nine, team, currentHole);
        setGame(updatedGame);
        onSave?.(updatedGame);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Could not add press");
      }
    },
    [game, currentHole, onSave]
  );

  // Toggle player selection
  const togglePlayer = (playerId: UUID, team: "team1" | "team2") => {
    if (team === "team1") {
      if (team1.includes(playerId)) {
        setTeam1(team1.filter((id) => id !== playerId));
      } else {
        setTeam1([...team1, playerId]);
        setTeam2(team2.filter((id) => id !== playerId));
      }
    } else {
      if (team2.includes(playerId)) {
        setTeam2(team2.filter((id) => id !== playerId));
      } else {
        setTeam2([...team2, playerId]);
        setTeam1(team1.filter((id) => id !== playerId));
      }
    }
  };

  // Calculate current standing for a nine
  const getNineStanding = (nine: NassauEnhanced["frontNine"]) => {
    const diff = nine.team1Holes - nine.team2Holes;
    if (diff > 0) return `Team 1 +${diff}`;
    if (diff < 0) return `Team 2 +${Math.abs(diff)}`;
    return "All Square";
  };

  // Setup mode
  if (setupMode) {
    return (
      <div className="card p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--masters)]/15 text-2xl">
              🏆
            </span>
            <div>
              <h2 className="type-body-lg font-semibold text-[var(--ink-primary)]">Setup Nassau Game</h2>
              <p className="type-caption text-[var(--ink-tertiary)]">
                Configure teams, auto-press rules, and the base wager before starting.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--ink-primary)]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Game Name */}
          <div className="space-y-2">
            <label className="type-caption font-medium text-[var(--ink-secondary)]">Game Name</label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="input-premium w-full"
              placeholder="Nassau"
            />
          </div>

          {/* Base Value */}
          <div className="space-y-2">
            <label className="type-caption font-medium text-[var(--ink-secondary)]">
              Base Value ($) - Each nine + overall
            </label>
            <input
              type="number"
              value={baseValue}
              onChange={(e) => setBaseValue(Math.max(1, parseInt(e.target.value) || 10))}
              className="input-premium w-full"
              min={1}
            />
            <p className="type-caption text-[var(--ink-tertiary)]">
              Total at stake: ${baseValue * 3} (Front + Back + Overall)
            </p>
          </div>

          {/* Auto-Press Settings */}
          <div className="rounded-xl border border-[var(--rule)] bg-[var(--surface-secondary)] p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="type-body font-medium text-[var(--ink-primary)]">Auto-press</span>
              <button
                type="button"
                onClick={() => setAutoPressEnabled(!autoPressEnabled)}
                className={cn(
                  "relative h-6 w-12 rounded-full transition-colors",
                  autoPressEnabled
                    ? "bg-[var(--success)]"
                    : "bg-[color:var(--ink-tertiary)]/25"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-[var(--surface-raised)] shadow-sm transition-transform",
                    autoPressEnabled ? "translate-x-6" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            {autoPressEnabled && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="type-caption text-[var(--ink-tertiary)]">Press when down by</label>
                  <input
                    type="number"
                    value={autoPressThreshold}
                    onChange={(e) =>
                      setAutoPressThreshold(Math.max(1, parseInt(e.target.value) || 2))
                    }
                    className="input-premium w-full"
                    min={1}
                    max={5}
                  />
                </div>
                <div className="space-y-2">
                  <label className="type-caption text-[var(--ink-tertiary)]">Max presses per nine</label>
                  <input
                    type="number"
                    value={maxPresses}
                    onChange={(e) => setMaxPresses(Math.max(1, parseInt(e.target.value) || 3))}
                    className="input-premium w-full"
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Team Selection */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="type-caption font-medium text-[var(--ink-secondary)]">Team 1</label>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => (
                  <button
                    key={`t1-${player.id}`}
                    type="button"
                    onClick={() => togglePlayer(player.id, "team1")}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                      team1.includes(player.id)
                        ? "border-[color:var(--team-usa)]/40 bg-[color:var(--team-usa)]/15 text-[var(--team-usa)] shadow-sm"
                        : "border-transparent bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface)]"
                    )}
                  >
                    {player.firstName} {player.lastName?.[0] || ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="type-caption font-medium text-[var(--ink-secondary)]">Team 2</label>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => (
                  <button
                    key={`t2-${player.id}`}
                    type="button"
                    onClick={() => togglePlayer(player.id, "team2")}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                      team2.includes(player.id)
                        ? "border-[color:var(--team-europe)]/40 bg-[color:var(--team-europe)]/15 text-[var(--team-europe)] shadow-sm"
                        : "border-transparent bg-[var(--surface-secondary)] text-[var(--ink-secondary)] hover:bg-[var(--surface)]"
                    )}
                  >
                    {player.firstName} {player.lastName?.[0] || ""}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            disabled={team1.length === 0 || team2.length === 0}
            className="btn-primary w-full"
          >
            Start Nassau 🏆
          </button>
        </div>
      </div>
    );
  }

  // No game
  if (!game) {
    return (
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--masters)] to-[var(--masters-deep)] px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className="type-body-lg font-semibold text-white">Nassau</h2>
                <p className="type-caption text-white/80">Game unavailable</p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2 text-white/80 transition-colors hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-[var(--rule)] bg-[var(--surface-secondary)] p-4 text-center">
            <p className="type-body-sm font-medium text-[var(--ink-primary)]">
              We couldn’t load this Nassau game.
            </p>
            <p className="mt-1 type-caption text-[var(--ink-tertiary)]">
              Try reopening the game, or start a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate payouts for display
  const payouts = showPayouts ? calculateNassauPayouts(game, players) : null;

  // Get press counts
  const frontPresses = game.presses.filter((p) => p.nine === "front");
  const backPresses = game.presses.filter((p) => p.nine === "back");

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--masters)] to-[var(--masters-deep)] px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h2 className="type-body-lg font-semibold text-white">{game.name}</h2>
              <p className="type-caption text-white/80">
                Hole {currentHole} of 18 • ${game.baseValue}/nine
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-white/80 transition-colors hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {/* Nine Standings */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Front Nine */}
          <div
            className={cn(
              "rounded-lg border-2 p-3",
              currentHole <= 9
                ? "border-[var(--masters)] bg-[color:var(--masters)]/10"
                : "border-[var(--rule)] bg-[var(--surface-secondary)]"
            )}
          >
            <h4 className="type-caption font-semibold text-[var(--ink-primary)]">Front 9</h4>
            <p className="type-caption text-[var(--ink-tertiary)]">{getNineStanding(game.frontNine)}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold text-[var(--team-usa)]">{game.frontNine.team1Holes}</span>
              <span className="type-caption text-[var(--ink-tertiary)]">-</span>
              <span className="text-lg font-bold text-[var(--team-europe)]">{game.frontNine.team2Holes}</span>
            </div>
            {frontPresses.length > 0 && (
              <p className="mt-1 type-caption text-[var(--warning)]">
                {frontPresses.length} press{frontPresses.length !== 1 ? "es" : ""}
              </p>
            )}
          </div>

          {/* Back Nine */}
          <div
            className={cn(
              "rounded-lg border-2 p-3",
              currentHole > 9 && currentHole <= 18
                ? "border-[var(--masters)] bg-[color:var(--masters)]/10"
                : "border-[var(--rule)] bg-[var(--surface-secondary)]"
            )}
          >
            <h4 className="type-caption font-semibold text-[var(--ink-primary)]">Back 9</h4>
            <p className="type-caption text-[var(--ink-tertiary)]">{getNineStanding(game.backNine)}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold text-[var(--team-usa)]">{game.backNine.team1Holes}</span>
              <span className="type-caption text-[var(--ink-tertiary)]">-</span>
              <span className="text-lg font-bold text-[var(--team-europe)]">{game.backNine.team2Holes}</span>
            </div>
            {backPresses.length > 0 && (
              <p className="mt-1 type-caption text-[var(--warning)]">
                {backPresses.length} press{backPresses.length !== 1 ? "es" : ""}
              </p>
            )}
          </div>

          {/* Overall */}
          <div className="rounded-lg border-2 border-[var(--accent)] bg-[var(--accent)]/10 p-3">
            <h4 className="type-caption font-semibold text-[var(--ink-primary)]">Overall</h4>
            <p className="type-caption text-[var(--ink-tertiary)]">
              {game.overall.team1Total > game.overall.team2Total
                ? `Team 1 +${game.overall.team1Total - game.overall.team2Total}`
                : game.overall.team2Total > game.overall.team1Total
                ? `Team 2 +${game.overall.team2Total - game.overall.team1Total}`
                : "All Square"}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold text-[var(--team-usa)]">{game.overall.team1Total}</span>
              <span className="type-caption text-[var(--ink-tertiary)]">-</span>
              <span className="text-lg font-bold text-[var(--team-europe)]">{game.overall.team2Total}</span>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-[color:var(--team-usa)]/10 p-3">
            <h4 className="type-caption font-semibold text-[var(--team-usa)]">Team 1</h4>
            <p className="type-body-sm text-[var(--ink-secondary)]">
              {game.team1PlayerIds.map(getPlayerName).join(", ")}
            </p>
          </div>
          <div className="rounded-lg bg-[color:var(--team-europe)]/10 p-3">
            <h4 className="type-caption font-semibold text-[var(--team-europe)]">Team 2</h4>
            <p className="type-body-sm text-[var(--ink-secondary)]">
              {game.team2PlayerIds.map(getPlayerName).join(", ")}
            </p>
          </div>
        </div>

        {/* Score Entry */}
        {game.status !== "completed" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="type-body font-medium text-[var(--ink-primary)]">
                Hole {currentHole} - {currentHole <= 9 ? "Front 9" : "Back 9"}
              </h4>
              {game.autoPressEnabled && (
                <span className="flex items-center gap-1 type-caption text-[var(--warning)]">
                  ⚡ Auto-press @ {game.autoPressThreshold} down
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="type-caption text-[var(--ink-tertiary)] text-center">
                  Team 1 Score
                </label>
                <input
                  type="number"
                  value={pendingScores.team1}
                  onChange={(e) =>
                    setPendingScores((s) => ({
                      ...s,
                      team1: e.target.value === "" ? "" : parseInt(e.target.value, 10),
                    }))
                  }
                  className="input-premium w-full text-center text-xl font-semibold"
                  min={1}
                  max={15}
                />
              </div>
              <div className="space-y-2">
                <label className="type-caption text-[var(--ink-tertiary)] text-center">
                  Team 2 Score
                </label>
                <input
                  type="number"
                  value={pendingScores.team2}
                  onChange={(e) =>
                    setPendingScores((s) => ({
                      ...s,
                      team2: e.target.value === "" ? "" : parseInt(e.target.value, 10),
                    }))
                  }
                  className="input-premium w-full text-center text-xl font-semibold"
                  min={1}
                  max={15}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecordHole}
              disabled={pendingScores.team1 === "" || pendingScores.team2 === ""}
              className="btn-primary w-full"
            >
              Record Hole {currentHole}
            </button>

            {/* Manual Press Buttons */}
            {!game.autoPressEnabled && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleAddPress(currentHole <= 9 ? "front" : "back", "team1")}
                  className="flex-1 rounded-lg border border-[color:var(--team-usa)]/40 bg-[color:var(--team-usa)]/15 py-2 text-sm font-medium text-[var(--team-usa)] transition-colors hover:bg-[color:var(--team-usa)]/20"
                >
                  Team 1 Press
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPress(currentHole <= 9 ? "front" : "back", "team2")}
                  className="flex-1 rounded-lg border border-[color:var(--team-europe)]/40 bg-[color:var(--team-europe)]/15 py-2 text-sm font-medium text-[var(--team-europe)] transition-colors hover:bg-[color:var(--team-europe)]/20"
                >
                  Team 2 Press
                </button>
              </div>
            )}
          </div>
        )}

        {/* Presses Display */}
        {game.presses.length > 0 && (
          <div className="space-y-2">
            <h4 className="type-caption font-medium text-[var(--ink-primary)]">Active Presses</h4>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {game.presses.map((press: NassauPress) => (
                  <motion.div
                    key={press.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium",
                      press.pressedByTeam === "team1"
                        ? "border border-[color:var(--team-usa)]/40 bg-[color:var(--team-usa)]/15 text-[var(--team-usa)]"
                        : "border border-[color:var(--team-europe)]/40 bg-[color:var(--team-europe)]/15 text-[var(--team-europe)]"
                    )}
                  >
                    {press.nine === "front" ? "F9" : "B9"} - ${press.value}
                    {press.isAuto && " ⚡"}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Payouts Display */}
        {showPayouts && payouts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border border-[color:var(--success)]/40 bg-gradient-to-r from-[color:var(--success)]/10 to-[color:var(--masters)]/10 p-4"
          >
            <h4 className="type-body font-semibold text-[var(--ink-primary)] text-center">
              Final Settlement
            </h4>

            {/* Nine Results */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="text-center">
                <p className="type-caption text-[var(--ink-tertiary)]">Front 9</p>
                <p
                  className={cn(
                    "font-semibold",
                    payouts.frontNineResult.winner === "team1"
                      ? "text-[var(--team-usa)]"
                      : payouts.frontNineResult.winner === "team2"
                      ? "text-[var(--team-europe)]"
                      : "text-[var(--ink-tertiary)]"
                  )}
                >
                  {payouts.frontNineResult.winner === "push"
                    ? "Push"
                    : `${payouts.frontNineResult.winner === "team1" ? "T1" : "T2"} $${
                        payouts.frontNineResult.amount
                      }`}
                </p>
              </div>
              <div className="text-center">
                <p className="type-caption text-[var(--ink-tertiary)]">Back 9</p>
                <p
                  className={cn(
                    "font-semibold",
                    payouts.backNineResult.winner === "team1"
                      ? "text-[var(--team-usa)]"
                      : payouts.backNineResult.winner === "team2"
                      ? "text-[var(--team-europe)]"
                      : "text-[var(--ink-tertiary)]"
                  )}
                >
                  {payouts.backNineResult.winner === "push"
                    ? "Push"
                    : `${payouts.backNineResult.winner === "team1" ? "T1" : "T2"} $${
                        payouts.backNineResult.amount
                      }`}
                </p>
              </div>
              <div className="text-center">
                <p className="type-caption text-[var(--ink-tertiary)]">Overall</p>
                <p
                  className={cn(
                    "font-semibold",
                    payouts.overallResult.winner === "team1"
                      ? "text-[var(--team-usa)]"
                      : payouts.overallResult.winner === "team2"
                      ? "text-[var(--team-europe)]"
                      : "text-[var(--ink-tertiary)]"
                  )}
                >
                  {payouts.overallResult.winner === "push"
                    ? "Push"
                    : `${payouts.overallResult.winner === "team1" ? "T1" : "T2"} $${
                        payouts.overallResult.amount
                      }`}
                </p>
              </div>
            </div>

            {/* Press Results */}
            {payouts.pressResults.length > 0 && (
              <div className="mt-4">
                <p className="type-caption text-[var(--ink-tertiary)] text-center">Presses</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {payouts.pressResults.map((pr, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-medium",
                        pr.winner === "team1"
                          ? "border border-[color:var(--team-usa)]/40 bg-[color:var(--team-usa)]/15 text-[var(--team-usa)]"
                          : pr.winner === "team2"
                          ? "border border-[color:var(--team-europe)]/40 bg-[color:var(--team-europe)]/15 text-[var(--team-europe)]"
                          : "border border-[var(--rule)] bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]"
                      )}
                    >
                      {pr.nine === "front" ? "F9" : "B9"}: {pr.winner === "push" ? "-" : `$${pr.amount}`}
                      {pr.isAuto && " ⚡"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[var(--rule)] pt-4 sm:grid-cols-2">
              <div className="text-center">
                <p className="type-caption text-[var(--ink-tertiary)]">Team 1 Wins</p>
                <p className="text-2xl font-bold text-[var(--team-usa)]">${payouts.totalTeam1}</p>
              </div>
              <div className="text-center">
                <p className="type-caption text-[var(--ink-tertiary)]">Team 2 Wins</p>
                <p className="text-2xl font-bold text-[var(--team-europe)]">${payouts.totalTeam2}</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span
                className={cn(
                  "text-xl font-bold",
                  payouts.totalTeam1 > payouts.totalTeam2
                    ? "text-[var(--team-usa)]"
                    : payouts.totalTeam2 > payouts.totalTeam1
                    ? "text-[var(--team-europe)]"
                    : "text-[var(--ink-secondary)]"
                )}
              >
                {payouts.totalTeam1 === payouts.totalTeam2
                  ? "Push!"
                  : `${payouts.totalTeam1 > payouts.totalTeam2 ? "Team 1" : "Team 2"} owes $${
                      payouts.netSettlement
                    }`}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default NassauEnhancedCard;
