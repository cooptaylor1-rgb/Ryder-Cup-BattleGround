import SwiftUI
import SwiftData

/// Standings tab - Live points and premium leaderboards
struct StandingsTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    @Query private var players: [Player]
    
    @State private var showShareSheet = false
    @State private var shareImage: UIImage?
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                if let trip = currentTrip {
                    VStack(spacing: DesignTokens.Spacing.xl) {
                        // Hero big score
                        heroScoreCard(trip)
                        
                        // Magic numbers / what needs to happen
                        if !hasTeamClinched(trip) {
                            magicNumbersCard(trip)
                        }
                        
                        // Session breakdown
                        sessionBreakdownCard(trip)
                        
                        // Player leaderboard
                        playerLeaderboardCard(trip)
                        
                        // Share button
                        shareButton(trip)
                    }
                    .padding(DesignTokens.Spacing.lg)
                } else {
                    EmptyStateView(
                        icon: "trophy.fill",
                        title: "No Tournament",
                        description: "Create a trip to track your Ryder Cup standings."
                    )
                }
            }
            .background(Color.surfaceBackground)
            .navigationTitle("Standings")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if let trip = currentTrip {
                        Button(action: { shareStandings(trip) }) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Hero Score Card
    
    @ViewBuilder
    private func heroScoreCard(_ trip: Trip) -> some View {
        let hasClinched = hasTeamClinched(trip)
        
        VStack(spacing: DesignTokens.Spacing.xxl) {
            // Trophy header if clinched
            if hasClinched {
                VStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(LinearGradient.goldGradient)
                        .shadow(color: .gold.opacity(0.5), radius: 10)
                    
                    let winningTeam = trip.teamATotalPoints > trip.teamBTotalPoints ? trip.teamA?.name : trip.teamB?.name
                    Text("\(winningTeam ?? "Winner") WINS!")
                        .font(.title.weight(.black))
                        .foregroundColor(.gold)
                }
                .padding(.top, DesignTokens.Spacing.md)
            }
            
            // Big score display
            BigScoreDisplay(
                teamAScore: trip.teamATotalPoints,
                teamBScore: trip.teamBTotalPoints,
                teamAName: trip.teamA?.name ?? "Team A",
                teamBName: trip.teamB?.name ?? "Team B",
                teamAColor: .teamUSA,
                teamBColor: .teamEurope,
                showCelebration: hasClinched,
                large: true
            )
            
            // Points info row
            HStack(spacing: DesignTokens.Spacing.xxl) {
                statPill(
                    value: String(format: "%.1f", trip.pointsToWin),
                    label: "To Win",
                    icon: "trophy"
                )
                
                let remaining = trip.totalPointsAvailable - trip.teamATotalPoints - trip.teamBTotalPoints
                statPill(
                    value: String(format: "%.0f", remaining),
                    label: "Remaining",
                    icon: "clock"
                )
                
                let completed = trip.sortedSessions.filter { $0.isComplete }.count
                statPill(
                    value: "\(completed)/\(trip.sortedSessions.count)",
                    label: "Sessions",
                    icon: "flag.2.crossed"
                )
            }
            
            // Momentum view
            momentumView(trip)
        }
        .padding(DesignTokens.Spacing.xxl)
        .heroCardStyle()
    }
    
    @ViewBuilder
    private func statPill(value: String, label: String, icon: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.title3.weight(.bold))
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
    
    @ViewBuilder
    private func momentumView(_ trip: Trip) -> some View {
        let recentMatches = trip.sortedSessions
            .flatMap { $0.sortedMatches }
            .filter { $0.status == .final }
            .suffix(7)
        
        if !recentMatches.isEmpty {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text("MOMENTUM")
                    .font(.caption2.weight(.black))
                    .foregroundColor(.secondary)
                    .tracking(2)
                
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(Array(recentMatches), id: \.id) { match in
                        VStack(spacing: 2) {
                            Circle()
                                .fill(matchResultColor(match))
                                .frame(width: 16, height: 16)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                                .shadow(color: matchResultColor(match).opacity(0.5), radius: 4)
                        }
                    }
                }
            }
        }
    }
    
    private func matchResultColor(_ match: Match) -> Color {
        switch match.result {
        case .teamAWin: return .teamUSA
        case .teamBWin: return .teamEurope
        case .halved: return .secondary
        case .inProgress, .notStarted: return .clear
        }
    }
    
    // MARK: - Magic Numbers Card
    
    @ViewBuilder
    private func magicNumbersCard(_ trip: Trip) -> some View {
        let teamANeeds = max(0, trip.pointsToWin - trip.teamATotalPoints)
        let teamBNeeds = max(0, trip.pointsToWin - trip.teamBTotalPoints)
        let remaining = trip.totalPointsAvailable - trip.teamATotalPoints - trip.teamBTotalPoints
        
        VStack(spacing: DesignTokens.Spacing.lg) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.gold)
                Text("TO CLINCH")
                    .font(.caption.weight(.black))
                    .foregroundColor(.secondary)
                    .tracking(2)
            }
            
            HStack(spacing: DesignTokens.Spacing.xxl) {
                // Team A magic number
                VStack(spacing: DesignTokens.Spacing.sm) {
                    Text(trip.teamA?.name ?? "Team A")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.teamUSA)
                    
                    Text(String(format: "%.1f", teamANeeds))
                        .font(.scoreMedium)
                        .foregroundColor(.teamUSA)
                        .glow(color: .teamUSA, radius: 6)
                    
                    Text("points needed")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Divider()
                    .frame(height: 60)
                
                // Team B magic number
                VStack(spacing: DesignTokens.Spacing.sm) {
                    Text(trip.teamB?.name ?? "Team B")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.teamEurope)
                    
                    Text(String(format: "%.1f", teamBNeeds))
                        .font(.scoreMedium)
                        .foregroundColor(.teamEurope)
                        .glow(color: .teamEurope, radius: 6)
                    
                    Text("points needed")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Scenario
            if remaining > 0 {
                Divider()
                
                VStack(spacing: DesignTokens.Spacing.xs) {
                    if teamANeeds <= remaining && teamBNeeds <= remaining {
                        Text("Either team can still win!")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.warning)
                    } else if teamANeeds > remaining {
                        Text("\(trip.teamB?.name ?? "Team B") has secured at least a tie")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.teamEurope)
                    } else if teamBNeeds > remaining {
                        Text("\(trip.teamA?.name ?? "Team A") has secured at least a tie")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.teamUSA)
                    }
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .glassStyle()
    }
    
    // MARK: - Session Breakdown
    
    @ViewBuilder
    private func sessionBreakdownCard(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            HStack {
                Image(systemName: "flag.2.crossed.fill")
                    .foregroundColor(.fairway)
                Text("SESSION BREAKDOWN")
                    .font(.caption.weight(.black))
                    .foregroundColor(.secondary)
                    .tracking(1)
            }
            
            if trip.sortedSessions.isEmpty {
                HStack {
                    Spacer()
                    Text("No sessions yet")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            } else {
                ForEach(trip.sortedSessions, id: \.id) { session in
                    sessionRow(session)
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .cardStyle(elevation: 1)
    }
    
    @ViewBuilder
    private func sessionRow(_ session: RyderCupSession) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(session.displayTitle)
                    .font(.subheadline.weight(.semibold))
                
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Text("\(session.sortedMatches.count) matches")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if !session.isComplete {
                        let inProgress = session.sortedMatches.filter { $0.status == .inProgress }.count
                        if inProgress > 0 {
                            LiveStatusIndicator(text: "\(inProgress) live", color: .success)
                        }
                    }
                }
            }
            
            Spacer()
            
            if session.isComplete {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Text(String(format: "%.1f", session.teamAPoints))
                        .font(.headline.weight(.bold))
                        .foregroundColor(.teamUSA)
                    
                    Text("-")
                        .foregroundColor(.secondary)
                    
                    Text(String(format: "%.1f", session.teamBPoints))
                        .font(.headline.weight(.bold))
                        .foregroundColor(.teamEurope)
                }
            } else {
                Text("In Progress")
                    .font(.caption)
                    .foregroundColor(.info)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }
    
    // MARK: - Player Leaderboard
    
    @ViewBuilder
    private func playerLeaderboardCard(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(.gold)
                Text("TOP PERFORMERS")
                    .font(.caption.weight(.black))
                    .foregroundColor(.secondary)
                    .tracking(1)
            }
            
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
                HStack {
                    Spacer()
                    Text("Complete matches to see standings")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            } else {
                ForEach(Array(playerStats.prefix(8).enumerated()), id: \.element.player.id) { index, stat in
                    playerRow(rank: index + 1, stat: stat, teamAIds: teamAIds)
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .cardStyle(elevation: 1)
    }
    
    @ViewBuilder
    private func playerRow(rank: Int, stat: (player: Player, points: Double, record: (Int, Int, Int)), teamAIds: Set<UUID>) -> some View {
        let isTeamA = teamAIds.contains(stat.player.id)
        let teamColor: Color = isTeamA ? .teamUSA : .teamEurope
        let isHotStreak = stat.record.0 >= 2 && stat.record.1 == 0  // 2+ wins, 0 losses
        
        HStack(spacing: DesignTokens.Spacing.md) {
            // Rank with crown for top 3
            ZStack {
                if rank <= 3 {
                    ChampionCrown(rank: rank, size: 20)
                } else {
                    Text("\(rank)")
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.secondary)
                }
            }
            .frame(width: 32)
            
            // Team indicator with avatar
            ZStack {
                Circle()
                    .fill(teamColor.opacity(0.2))
                    .frame(width: 36, height: 36)
                
                Circle()
                    .stroke(teamColor, lineWidth: 2)
                    .frame(width: 36, height: 36)
                
                Text(String(stat.player.name.prefix(1)))
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(teamColor)
            }
            
            // Name and badges
            VStack(alignment: .leading, spacing: 2) {
                Text(stat.player.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                
                if isHotStreak {
                    PerformanceBadge(type: .hotStreak)
                }
            }
            
            Spacer()
            
            // Stats with enhanced styling
            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 4) {
                    Text(String(format: "%.1f", stat.points))
                        .font(.headline.weight(.bold))
                        .foregroundColor(teamColor)
                    
                    Text("pts")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Text("\(stat.record.0)-\(stat.record.1)-\(stat.record.2)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .background(
            rank == 1 ? Color.gold.opacity(0.08) : Color.clear
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
    }
    
    // MARK: - Share Button
    
    @ViewBuilder
    private func shareButton(_ trip: Trip) -> some View {
        Button(action: { shareStandings(trip) }) {
            HStack {
                Image(systemName: "square.and.arrow.up")
                Text("Share Standings")
            }
            .secondaryButtonStyle()
        }
        .pressAnimation()
    }
    
    // MARK: - Helpers
    
    private func hasTeamClinched(_ trip: Trip) -> Bool {
        trip.teamATotalPoints >= trip.pointsToWin || trip.teamBTotalPoints >= trip.pointsToWin
    }
    
    private func shareStandings(_ trip: Trip) {
        // Generate shareable card
        let text = """
        🏆 \(trip.name) Standings
        
        \(trip.teamA?.name ?? "Team A"): \(String(format: "%.1f", trip.teamATotalPoints))
        \(trip.teamB?.name ?? "Team B"): \(String(format: "%.1f", trip.teamBTotalPoints))
        
        #RyderCup #GolfTrip
        """
        
        let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
}

#Preview {
    StandingsTabView()
        .modelContainer(for: [Trip.self, Player.self, RyderCupSession.self, Match.self], inMemory: true)
        .preferredColorScheme(.dark)
}
