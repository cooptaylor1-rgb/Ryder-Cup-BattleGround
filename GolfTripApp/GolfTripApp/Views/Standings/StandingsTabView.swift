import SwiftUI
import SwiftData

/// Standings tab - Live points and leaderboards
struct StandingsTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    @Query private var players: [Player]
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                if let trip = currentTrip {
                    VStack(spacing: DesignTokens.Spacing.lg) {
                        // Big score
                        bigScoreCard(trip)
                        
                        // Points info
                        pointsInfoCard(trip)
                        
                        // Session breakdown
                        sessionBreakdownSection(trip)
                        
                        // Player leaderboard
                        playerLeaderboardSection(trip)
                    }
                    .padding(DesignTokens.Spacing.lg)
                } else {
                    EmptyStateView(
                        icon: "trophy",
                        title: "No Trip",
                        description: "Create a trip to see standings."
                    )
                }
            }
            .navigationTitle("Standings")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    ShareLink(item: "Team A \(currentTrip?.teamATotalPoints ?? 0) - \(currentTrip?.teamBTotalPoints ?? 0) Team B") {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
    }
    
    // MARK: - Big Score Card
    
    @ViewBuilder
    private func bigScoreCard(_ trip: Trip) -> some View {
        let hasClinched = hasTeamClinched(trip)
        
        VStack(spacing: DesignTokens.Spacing.xl) {
            BigScoreDisplay(
                teamAScore: trip.teamATotalPoints,
                teamBScore: trip.teamBTotalPoints,
                teamAName: trip.teamA?.name ?? "Team A",
                teamBName: trip.teamB?.name ?? "Team B",
                teamAColor: .teamUSA,
                teamBColor: .teamEurope,
                showCelebration: hasClinched
            )
            
            // Winner banner if clinched
            if hasClinched {
                clinchBanner(trip)
            }
            
            // Momentum indicator - last 5 matches
            momentumView(trip)
        }
        .padding(DesignTokens.Spacing.xxl)
        .heroCardStyle()
    }
    
    // MARK: - Momentum View
    
    @ViewBuilder
    private func momentumView(_ trip: Trip) -> some View {
        let recentMatches = trip.sortedSessions
            .flatMap { $0.sortedMatches }
            .filter { $0.status == .final }
            .suffix(5)
        
        if !recentMatches.isEmpty {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text("MOMENTUM")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.secondary)
                
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(Array(recentMatches), id: \.id) { match in
                        Circle()
                            .fill(match.result == .teamAWin ? Color.teamUSA : (match.result == .teamBWin ? Color.teamEurope : Color.secondary))
                            .frame(width: 12, height: 12)
                            .overlay(
                                Circle()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private func clinchBanner(_ trip: Trip) -> some View {
        let teamAWins = trip.teamATotalPoints >= trip.pointsToWin
        let winningTeam = teamAWins ? (trip.teamA?.name ?? "Team A") : (trip.teamB?.name ?? "Team B")
        let winningColor: Color = teamAWins ? .teamUSA : .teamEurope
        
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "trophy.fill")
                    .font(.title2)
                Text("\(winningTeam) WINS!")
                    .font(.title3.weight(.black))
                Image(systemName: "trophy.fill")
                    .font(.title2)
            }
            .foregroundColor(winningColor)
            
            Text("🎉 Congratulations! 🎉")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [winningColor.opacity(0.2), winningColor.opacity(0.1)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                .stroke(winningColor.opacity(0.5), lineWidth: 2)
        )
    }
    
    private func hasTeamClinched(_ trip: Trip) -> Bool {
        trip.teamATotalPoints >= trip.pointsToWin || trip.teamBTotalPoints >= trip.pointsToWin
    }
    
    // MARK: - Points Info Card
    
    @ViewBuilder
    private func pointsInfoCard(_ trip: Trip) -> some View {
        let pointsRemaining = trip.totalPointsAvailable - trip.teamATotalPoints - trip.teamBTotalPoints
        
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Points to Win")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f", trip.pointsToWin))
                        .font(.title2.weight(.bold))
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text("Points Remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f", pointsRemaining))
                        .font(.title2.weight(.bold))
                }
            }
            
            // What needs to happen
            if !hasTeamClinched(trip) && pointsRemaining > 0 {
                whatNeedsToHappen(trip, pointsRemaining: pointsRemaining)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .cardStyle()
    }
    
    @ViewBuilder
    private func whatNeedsToHappen(_ trip: Trip, pointsRemaining: Double) -> some View {
        let teamANeeds = max(0, trip.pointsToWin - trip.teamATotalPoints)
        let teamBNeeds = max(0, trip.pointsToWin - trip.teamBTotalPoints)
        
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Divider()
            
            Text("TO WIN")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary)
            
            HStack {
                VStack(alignment: .leading) {
                    Text(trip.teamA?.name ?? "Team A")
                        .font(.caption)
                        .foregroundColor(.teamUSA)
                    Text("\(String(format: "%.1f", teamANeeds)) more")
                        .font(.subheadline.weight(.semibold))
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(trip.teamB?.name ?? "Team B")
                        .font(.caption)
                        .foregroundColor(.teamEurope)
                    Text("\(String(format: "%.1f", teamBNeeds)) more")
                        .font(.subheadline.weight(.semibold))
                }
            }
        }
    }
    
    // MARK: - Session Breakdown
    
    @ViewBuilder
    private func sessionBreakdownSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("SESSION BREAKDOWN")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary)
            
            if trip.sortedSessions.isEmpty {
                Text("No sessions yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(trip.sortedSessions, id: \.id) { session in
                    sessionRow(session)
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
    
    @ViewBuilder
    private func sessionRow(_ session: RyderCupSession) -> some View {
        HStack {
            VStack(alignment: .leading) {
                Text(session.displayTitle)
                    .font(.subheadline.weight(.medium))
                
                Text("\(session.sortedMatches.count) matches")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if session.isComplete {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Text(String(format: "%.1f", session.teamAPoints))
                        .foregroundColor(.teamUSA)
                    Text("-")
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f", session.teamBPoints))
                        .foregroundColor(.teamEurope)
                }
                .font(.subheadline.weight(.semibold))
            } else {
                let inProgress = session.sortedMatches.filter { $0.status == .inProgress }.count
                if inProgress > 0 {
                    Text("\(inProgress) in progress")
                        .font(.caption)
                        .foregroundColor(.info)
                } else {
                    Text("Not started")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }
    
    // MARK: - Player Leaderboard
    
    @ViewBuilder
    private func playerLeaderboardSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("TOP PERFORMERS")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary)
            
            let allMatches = trip.sortedSessions.flatMap { $0.sortedMatches }
            let teamAIds = Set((trip.teamA?.players ?? []).map { $0.id })
            
            let playerStats = players.map { player -> (player: Player, points: Double, record: (Int, Int, Int)) in
                let points = TournamentEngine.playerPoints(playerId: player.id, matches: allMatches, teamAPlayerIds: teamAIds)
                let record = TournamentEngine.playerRecord(playerId: player.id, matches: allMatches)
                return (player, points, record)
            }
            .filter { $0.points > 0 || $0.record.0 > 0 || $0.record.1 > 0 || $0.record.2 > 0 }
            .sorted { $0.points > $1.points }
            
            if playerStats.isEmpty {
                Text("No completed matches yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(Array(playerStats.prefix(10).enumerated()), id: \.element.player.id) { index, stat in
                    playerRow(index: index + 1, stat: stat, teamAIds: teamAIds)
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
    
    @ViewBuilder
    private func playerRow(index: Int, stat: (player: Player, points: Double, record: (Int, Int, Int)), teamAIds: Set<UUID>) -> some View {
        let isTeamA = teamAIds.contains(stat.player.id)
        
        HStack {
            Text("\(index).")
                .font(.subheadline.weight(.bold))
                .foregroundColor(.secondary)
                .frame(width: 24)
            
            Circle()
                .fill(isTeamA ? Color.teamUSA : Color.teamEurope)
                .frame(width: 8, height: 8)
            
            Text(stat.player.name)
                .font(.subheadline)
            
            Spacer()
            
            VStack(alignment: .trailing) {
                Text(String(format: "%.1f pts", stat.points))
                    .font(.subheadline.weight(.semibold))
                
                Text("\(stat.record.0)-\(stat.record.1)-\(stat.record.2)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.xs)
    }
}

#Preview {
    StandingsTabView()
        .modelContainer(for: [Trip.self, Player.self, RyderCupSession.self, Match.self], inMemory: true)
}
