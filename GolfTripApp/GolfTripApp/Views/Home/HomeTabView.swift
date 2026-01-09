import SwiftUI
import SwiftData

/// Home tab - Trip Command Center
struct HomeTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    @Query(sort: \RyderCupSession.scheduledDate) private var sessions: [RyderCupSession]
    @State private var showTripForm = false
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    if let trip = currentTrip {
                        tripContent(trip)
                    } else {
                        emptyTripState
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(Color.surfaceBackground)
            .navigationTitle("🏆 Ryder Cup")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if currentTrip != nil {
                        Menu {
                            Button("Edit Trip", systemImage: "pencil") {
                                showTripForm = true
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
            .sheet(isPresented: $showTripForm) {
                if let trip = currentTrip {
                    TripFormView(trip: trip)
                }
            }
        }
    }
    
    // MARK: - Trip Content
    
    @ViewBuilder
    private func tripContent(_ trip: Trip) -> some View {
        // Trip Header with enhanced styling
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(trip.name)
                .font(.title.weight(.bold))
                .foregroundColor(.primary)
            
            if let location = trip.location {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.accentColor)
                    Text(location)
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
            
            Text(trip.dateRangeFormatted)
                .font(.caption)
                .foregroundColor(.secondary.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, DesignTokens.Spacing.md)
        
        // Hero Standings Card
        if trip.teamA != nil && trip.teamB != nil {
            standingsHeroCard(trip)
        }
        
        // Next Up Card
        if let nextMatch = nextUpMatch(for: trip) {
            nextUpCard(nextMatch, trip: trip)
        }
        
        // Weather Placeholder (seam for future)
        weatherPlaceholder
        
        // Today's Schedule
        todayScheduleSection(trip)
        
        // Captain Actions
        captainActionsSection(trip)
        
        // Trip Vibe
        if let notes = trip.notes, !notes.isEmpty {
            tripVibeSection(trip)
        }
    }
    
    // MARK: - Standings Hero Card
    
    @ViewBuilder
    private func standingsHeroCard(_ trip: Trip) -> some View {
        let hasClinched = trip.teamATotalPoints >= trip.pointsToWin || trip.teamBTotalPoints >= trip.pointsToWin
        
        VStack(spacing: DesignTokens.Spacing.lg) {
            BigScoreDisplay(
                teamAScore: trip.teamATotalPoints,
                teamBScore: trip.teamBTotalPoints,
                teamAName: trip.teamA?.name ?? "Team A",
                teamBName: trip.teamB?.name ?? "Team B",
                teamAColor: .teamUSA,
                teamBColor: .teamEurope,
                showCelebration: hasClinched
            )
            
            // Status indicator
            HStack(spacing: DesignTokens.Spacing.lg) {
                VStack(spacing: 2) {
                    Text("\(String(format: "%.1f", trip.pointsToWin))")
                        .font(.subheadline.weight(.bold))
                    Text("to win")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Divider()
                    .frame(height: 30)
                
                VStack(spacing: 2) {
                    let completed = trip.sortedSessions.filter { $0.isComplete }.count
                    Text("\(completed)/\(trip.sortedSessions.count)")
                        .font(.subheadline.weight(.bold))
                    Text("sessions")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Divider()
                    .frame(height: 30)
                
                VStack(spacing: 2) {
                    let remaining = trip.totalPointsAvailable - trip.teamATotalPoints - trip.teamBTotalPoints
                    Text("\(String(format: "%.0f", remaining))")
                        .font(.subheadline.weight(.bold))
                    Text("remaining")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(DesignTokens.Spacing.xl)
        .heroCardStyle()
    }
    
    // MARK: - Weather Placeholder
    
    private var weatherPlaceholder: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "sun.max.fill")
                .font(.title2)
                .foregroundColor(.secondaryGold)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Perfect golf weather")
                    .font(.subheadline.weight(.medium))
                Text("Sunny, 72°F")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("☀️")
                .font(.largeTitle)
        }
        .padding(DesignTokens.Spacing.md)
        .background(Color.surfaceVariant.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
    }
    
    // MARK: - Next Up Card
    
    @ViewBuilder
    private func nextUpCard(_ match: Match, trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Circle()
                        .fill(Color.success)
                        .frame(width: 8, height: 8)
                        .pulsingAnimation()
                    
                    Text("NEXT UP")
                        .font(.caption.weight(.black))
                        .foregroundColor(.success)
                }
                
                Spacer()
                
                if let time = match.startTime {
                    Text(time, style: .time)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.primary)
                }
            }
            
            Divider()
                .background(Color.secondary.opacity(0.3))
            
            // Match info
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                if let session = match.session {
                    Text(session.sessionType.displayName)
                        .font(.headline)
                }
                
                if let course = match.course {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "flag.fill")
                            .foregroundColor(.fairway)
                        Text(course.name)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Players with enhanced avatars
            HStack(spacing: DesignTokens.Spacing.xl) {
                // Team A
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: -12) {
                        ForEach(match.teamAIds.prefix(2), id: \.self) { playerId in
                            AvatarView(name: "P", size: 44, teamColor: .teamUSA)
                                .shadow(color: .teamUSA.opacity(0.3), radius: 4)
                        }
                    }
                    Text(trip.teamA?.name ?? "Team A")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.teamUSA)
                }
                
                VStack(spacing: 2) {
                    Text("vs")
                        .font(.title3.weight(.bold))
                        .foregroundColor(.secondary.opacity(0.6))
                }
                
                // Team B
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: -12) {
                        ForEach(match.teamBIds.prefix(2), id: \.self) { playerId in
                            AvatarView(name: "P", size: 44, teamColor: .teamEurope)
                                .shadow(color: .teamEurope.opacity(0.3), radius: 4)
                        }
                    }
                    Text(trip.teamB?.name ?? "Team B")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.teamEurope)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.sm)
            
            // Start Scoring CTA
            NavigationLink(destination: MatchScoringView(match: match)) {
                HStack {
                    Image(systemName: "play.fill")
                    Text("Start Scoring")
                }
                .primaryButtonStyle()
            }
            .pressAnimation()
        }
        .padding(DesignTokens.Spacing.lg)
        .heroCardStyle()
    }
    
    // MARK: - Today's Schedule
    
    @ViewBuilder
    private func todayScheduleSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.accentColor)
                Text("TODAY'S SCHEDULE")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
            }
            
            let todaySessions = trip.sortedSessions.filter { 
                Calendar.current.isDateInToday($0.scheduledDate)
            }
            
            if todaySessions.isEmpty {
                HStack {
                    Image(systemName: "moon.zzz.fill")
                        .foregroundColor(.secondary)
                    Text("No sessions scheduled for today")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, DesignTokens.Spacing.md)
            } else {
                ForEach(todaySessions, id: \.id) { session in
                    sessionRow(session)
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .cardStyle()
    }
    
    @ViewBuilder
    private func sessionRow(_ session: RyderCupSession) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Circle()
                .fill(session.isComplete ? Color.success : Color.info)
                .frame(width: 10, height: 10)
                .overlay(
                    Circle()
                        .stroke(session.isComplete ? Color.success.opacity(0.3) : Color.info.opacity(0.3), lineWidth: 3)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(session.displayTitle)
                    .font(.subheadline.weight(.semibold))
                
                Text("\(session.sortedMatches.count) matches • \(String(format: "%.0f", session.totalPointsAvailable)) points")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if session.isComplete {
                HStack(spacing: 4) {
                    Text("\(String(format: "%.1f", session.teamAPoints))")
                        .foregroundColor(.teamUSA)
                    Text("-")
                        .foregroundColor(.secondary)
                    Text("\(String(format: "%.1f", session.teamBPoints))")
                        .foregroundColor(.teamEurope)
                }
                .font(.caption.weight(.bold))
            } else {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.xs)
    }
    
    // MARK: - Captain Actions
    
    @ViewBuilder
    private func captainActionsSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Image(systemName: "crown.fill")
                    .foregroundColor(.secondaryGold)
                Text("CAPTAIN ACTIONS")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: DesignTokens.Spacing.md) {
                NavigationLink(destination: MatchupsTabView()) {
                    actionButton(icon: "list.bullet.rectangle.fill", title: "Lineups", color: .teamUSA)
                }
                
                NavigationLink(destination: StandingsTabView()) {
                    actionButton(icon: "trophy.fill", title: "Standings", color: .secondaryGold)
                }
            }
        }
    }
    
    @ViewBuilder
    private func actionButton(icon: String, title: String, color: Color) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.lg)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }
    
    // MARK: - Trip Vibe
    
    @ViewBuilder
    private func tripVibeSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Image(systemName: "note.text")
                    .foregroundColor(.secondary)
                Text("TRIP NOTES")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
            }
            
            if let notes = trip.notes, !notes.isEmpty {
                Text(notes)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
    
    // MARK: - Empty State
    
    private var emptyTripState: some View {
        EmptyStateView(
            icon: "airplane.departure",
            title: "Ready for Your Trip?",
            description: "Create your Ryder Cup trip to start managing teams, matchups, and scoring. Your legendary golf weekend awaits!",
            actionTitle: "Create Trip",
            action: { showTripForm = true }
        )
    }
    
    // MARK: - Helpers
    
    private func nextUpMatch(for trip: Trip) -> Match? {
        for session in trip.sortedSessions {
            for match in session.sortedMatches where match.status == .scheduled {
                return match
            }
        }
        return nil
    }
}

#Preview {
    HomeTabView()
        .modelContainer(for: [Trip.self, Player.self, Course.self], inMemory: true)
}
