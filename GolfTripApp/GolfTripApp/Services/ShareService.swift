import SwiftUI

/// Service for generating shareable content (standings cards, match results)
/// P1.B Share/Export Feature
@MainActor
final class ShareService {
    static let shared = ShareService()
    
    private init() {}
    
    // MARK: - Standings Share Card
    
    /// Generate a shareable standings image
    func generateStandingsCard(for trip: Trip) -> UIImage? {
        let view = StandingsShareCard(trip: trip)
        return renderViewToImage(view, size: CGSize(width: 400, height: 500))
    }
    
    /// Generate shareable text for standings
    func generateStandingsText(for trip: Trip) -> String {
        let teamA = trip.teamA?.name ?? "Team A"
        let teamB = trip.teamB?.name ?? "Team B"
        let scoreA = String(format: "%.1f", trip.teamATotalPoints)
        let scoreB = String(format: "%.1f", trip.teamBTotalPoints)
        
        var text = """
        🏆 \(trip.name)
        
        \(teamA): \(scoreA)
        \(teamB): \(scoreB)
        
        """
        
        // Add leader info
        if trip.teamATotalPoints > trip.teamBTotalPoints {
            text += "\(teamA) leads by \(String(format: "%.1f", trip.teamATotalPoints - trip.teamBTotalPoints)) points!"
        } else if trip.teamBTotalPoints > trip.teamATotalPoints {
            text += "\(teamB) leads by \(String(format: "%.1f", trip.teamBTotalPoints - trip.teamATotalPoints)) points!"
        } else {
            text += "All square!"
        }
        
        // Add clinch info if available
        if trip.hasClinched {
            if let winner = trip.winningTeamName {
                text += "\n\n🎉 \(winner) has won the cup!"
            }
        } else {
            let magic = trip.magicNumber
            let closer = magic.teamA < magic.teamB ? teamA : teamB
            let closerNeeds = min(magic.teamA, magic.teamB)
            text += "\n\nMagic number: \(closer) needs \(String(format: "%.1f", closerNeeds)) to clinch."
        }
        
        text += "\n\n#RyderCup #GolfTrip"
        
        return text
    }
    
    // MARK: - Match Result Share
    
    /// Generate shareable text for a match result
    func generateMatchResultText(for match: Match, trip: Trip) -> String {
        let teamA = trip.teamA?.name ?? "Team A"
        let teamB = trip.teamB?.name ?? "Team B"
        
        var text = "⛳️ Match Result\n\n"
        
        if let session = match.session {
            text += "\(session.sessionType.displayName)\n"
        }
        
        text += "\(match.statusString)\n\n"
        
        // Add team names
        text += "\(teamA) vs \(teamB)\n"
        
        // Add result details
        switch match.result {
        case .teamAWins:
            text += "🏆 \(teamA) wins!"
        case .teamBWins:
            text += "🏆 \(teamB) wins!"
        case .halved:
            text += "🤝 Match halved"
        case .inProgress:
            text += "Match in progress (Hole \(match.currentHole))"
        case .notStarted:
            text += "Match not started"
        }
        
        text += "\n\n#RyderCup #GolfTrip"
        
        return text
    }
    
    // MARK: - Session Results Share
    
    /// Generate shareable text for a session's results
    func generateSessionResultsText(for session: RyderCupSession, trip: Trip) -> String {
        let teamA = trip.teamA?.name ?? "Team A"
        let teamB = trip.teamB?.name ?? "Team B"
        
        var text = """
        ⛳️ \(session.displayTitle)
        
        \(teamA): \(String(format: "%.1f", session.teamAPoints))
        \(teamB): \(String(format: "%.1f", session.teamBPoints))
        
        """
        
        // Add individual match results
        for match in session.sortedMatches {
            let emoji: String
            switch match.result {
            case .teamAWins: emoji = "🔵"
            case .teamBWins: emoji = "🔴"
            case .halved: emoji = "⚪️"
            default: emoji = "⏳"
            }
            text += "\(emoji) \(match.statusString)\n"
        }
        
        // Overall standings update
        text += "\nOverall: \(teamA) \(String(format: "%.1f", trip.teamATotalPoints)) - \(String(format: "%.1f", trip.teamBTotalPoints)) \(teamB)"
        
        text += "\n\n#RyderCup #GolfTrip"
        
        return text
    }
    
    // MARK: - Leaderboard Share
    
    /// Generate shareable text for individual leaderboard
    func generateLeaderboardText(for players: [Player], trip: Trip) -> String {
        var text = "🏌️ Leaderboard - \(trip.name)\n\n"
        
        // Sort by points earned (would need match history to calculate properly)
        for (index, player) in players.prefix(10).enumerated() {
            let medal: String
            switch index {
            case 0: medal = "🥇"
            case 1: medal = "🥈"
            case 2: medal = "🥉"
            default: medal = "\(index + 1)."
            }
            
            text += "\(medal) \(player.fullName)\n"
        }
        
        text += "\n#RyderCup #GolfTrip"
        
        return text
    }
    
    // MARK: - Helper Methods
    
    private func renderViewToImage<V: View>(_ view: V, size: CGSize) -> UIImage? {
        let controller = UIHostingController(rootView: view)
        controller.view.bounds = CGRect(origin: .zero, size: size)
        controller.view.backgroundColor = .clear
        
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            controller.view.drawHierarchy(in: controller.view.bounds, afterScreenUpdates: true)
        }
    }
}

// MARK: - Share Card Views

struct StandingsShareCard: View {
    let trip: Trip
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 4) {
                Text("🏆")
                    .font(.largeTitle)
                Text(trip.name)
                    .font(.title2.weight(.bold))
                    .foregroundColor(.primary)
                
                if let location = trip.location {
                    Text(location)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Score
            HStack(spacing: 40) {
                VStack(spacing: 8) {
                    Text(trip.teamA?.name ?? "Team A")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.teamUSA)
                    Text(String(format: "%.1f", trip.teamATotalPoints))
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(.teamUSA)
                }
                
                Text("–")
                    .font(.title)
                    .foregroundColor(.secondary)
                
                VStack(spacing: 8) {
                    Text(trip.teamB?.name ?? "Team B")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.teamEurope)
                    Text(String(format: "%.1f", trip.teamBTotalPoints))
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(.teamEurope)
                }
            }
            
            // Status
            VStack(spacing: 4) {
                if trip.hasClinched, let winner = trip.winningTeamName {
                    Text("\(winner) WINS!")
                        .font(.headline.weight(.black))
                        .foregroundColor(.gold)
                } else {
                    let completed = trip.sortedSessions.filter { $0.isComplete }.count
                    Text("\(completed)/\(trip.sortedSessions.count) sessions complete")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            // Footer
            Text("Golf Trip App")
                .font(.caption2)
                .foregroundColor(.secondary.opacity(0.5))
        }
        .padding(30)
        .background(Color.surfaceBackground)
        .frame(width: 400, height: 500)
    }
}

// MARK: - Share Button View

struct ShareButton: View {
    let items: [Any]
    var label: String = "Share"
    var icon: String = "square.and.arrow.up"
    var style: ShareButtonStyle = .default
    
    enum ShareButtonStyle {
        case `default`
        case compact
        case icon
    }
    
    var body: some View {
        ShareLink(items: items.compactMap { $0 as? String }) {
            switch style {
            case .default:
                Label(label, systemImage: icon)
            case .compact:
                HStack(spacing: 4) {
                    Image(systemName: icon)
                        .font(.caption)
                    Text(label)
                        .font(.caption)
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xs)
                .background(Color.accentColor.opacity(0.1))
                .clipShape(Capsule())
            case .icon:
                Image(systemName: icon)
            }
        }
    }
}

// MARK: - Quick Share Buttons

struct StandingsShareButton: View {
    let trip: Trip
    
    var body: some View {
        let text = ShareService.shared.generateStandingsText(for: trip)
        ShareLink(item: text) {
            Label("Share Standings", systemImage: "square.and.arrow.up")
        }
    }
}

struct MatchShareButton: View {
    let match: Match
    let trip: Trip
    
    var body: some View {
        let text = ShareService.shared.generateMatchResultText(for: match, trip: trip)
        ShareLink(item: text) {
            Image(systemName: "square.and.arrow.up")
        }
    }
}

struct SessionShareButton: View {
    let session: RyderCupSession
    let trip: Trip
    
    var body: some View {
        let text = ShareService.shared.generateSessionResultsText(for: session, trip: trip)
        ShareLink(item: text) {
            Label("Share Results", systemImage: "square.and.arrow.up")
        }
    }
}

#Preview("Standings Share Card") {
    StandingsShareCard(
        trip: Trip(
            name: "2024 Buddies Cup",
            startDate: Date(),
            endDate: Date().addingTimeInterval(86400 * 3)
        )
    )
}
