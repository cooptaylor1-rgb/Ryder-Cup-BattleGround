import SwiftUI
import SwiftData

/// Home tab - Trip Command Center (Upgraded with Captain's Toolkit)
struct HomeTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    @Query(sort: \RyderCupSession.scheduledDate) private var sessions: [RyderCupSession]
    @State private var showTripForm = false
    @State private var showAuditLog = false
    @State private var selectedSession: RyderCupSession?
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    /// Live matches currently in progress
    private var liveMatches: [Match] {
        currentTrip?.sortedSessions.flatMap { $0.sortedMatches }.filter { $0.status == .inProgress } ?? []
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
            .navigationTitle("🏆 The Ryder Cup")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if let trip = currentTrip, trip.isCaptainModeEnabled {
                        Button {
                            showAuditLog = true
                        } label: {
                            Image(systemName: "crown.fill")
                                .foregroundColor(.secondaryGold)
                        }
                    }
                }
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
            .sheet(isPresented: $showAuditLog) {
                if let trip = currentTrip {
                    AuditLogView(trip: trip)
                }
            }
            .sheet(item: $selectedSession) { session in
                if let trip = currentTrip {
                    LineupBuilderView(session: session, trip: trip)
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
        
        // Hero Standings Card with Magic Number
        if trip.teamA != nil && trip.teamB != nil {
            standingsHeroCard(trip)
            
            // Magic Number / Path to Victory (if not clinched)
            if !trip.hasClinched {
                magicNumberCard(trip)
            }
        }
        
        // Next Up Card with Countdown
        if let nextMatch = nextUpMatch(for: trip) {
            nextUpCard(nextMatch, trip: trip)
        }
        
        // Live Matches Section (NEW)
        if !liveMatches.isEmpty {
            liveMatchesSection(trip)
        }
        
        // Weather Placeholder (seam for future)
        weatherPlaceholder
        
        // Today's Schedule
        todayScheduleSection(trip)
        
        // Captain Actions (ENHANCED)
        captainActionsSection(trip)
        
        // Trip Vibe
        if let notes = trip.notes, !notes.isEmpty {
            tripVibeSection(trip)
        }
    }
    
    // MARK: - Standings Hero Card
    
    @ViewBuilder
    private func standingsHeroCard(_ trip: Trip) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Champion banner if clinched
            if trip.hasClinched, let winner = trip.winningTeamName {
                HStack {
                    Image(systemName: "trophy.fill")
                        .foregroundStyle(LinearGradient.goldGradient)
                    Text("\(winner) WINS!")
                        .font(.headline.weight(.black))
                        .foregroundColor(.gold)
                    Image(systemName: "trophy.fill")
                        .foregroundStyle(LinearGradient.goldGradient)
                }
                .padding(.vertical, DesignTokens.Spacing.sm)
            }
            
            BigScoreDisplay(
                teamAScore: trip.teamATotalPoints,
                teamBScore: trip.teamBTotalPoints,
                teamAName: trip.teamA?.name ?? "Team A",
                teamBName: trip.teamB?.name ?? "Team B",
                teamAColor: .teamUSA,
                teamBColor: .teamEurope,
                showCelebration: trip.hasClinched
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
    
    // MARK: - Magic Number Card
    
    @ViewBuilder
    private func magicNumberCard(_ trip: Trip) -> some View {
        let magic = trip.magicNumber
        
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.secondaryGold)
                Text("MAGIC NUMBER")
                    .font(.caption.weight(.black))
                    .foregroundColor(.secondary)
                Spacer()
            }
            
            HStack(spacing: DesignTokens.Spacing.xxl) {
                // Team A Magic Number
                VStack(spacing: DesignTokens.Spacing.xs) {
                    Text(trip.teamA?.name ?? "Team A")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.teamUSA)
                    
                    Text(String(format: "%.1f", magic.teamA))
                        .font(.scoreLarge)
                        .foregroundColor(.teamUSA)
                    
                    Text("to clinch")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                VStack {
                    Text("vs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Team B Magic Number
                VStack(spacing: DesignTokens.Spacing.xs) {
                    Text(trip.teamB?.name ?? "Team B")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.teamEurope)
                    
                    Text(String(format: "%.1f", magic.teamB))
                        .font(.scoreLarge)
                        .foregroundColor(.teamEurope)
                    
                    Text("to clinch")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Path to victory insight
            let closer = magic.teamA < magic.teamB ? trip.teamA?.name : trip.teamB?.name
            let closerNeeds = min(magic.teamA, magic.teamB)
            if closerNeeds > 0 {
                Text("\(closer ?? "Leader") needs \(String(format: "%.1f", closerNeeds)) more points to lift the cup!")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(
            LinearGradient(
                colors: [Color.surfaceVariant, Color.surfaceVariant.opacity(0.7)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg)
                .stroke(Color.secondaryGold.opacity(0.3), lineWidth: 1)
        )
    }
    
    // MARK: - Weather Placeholder
    
    private var weatherPlaceholder: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Animated weather icon
            ZStack {
                Circle()
                    .fill(Color.secondaryGold.opacity(0.2))
                    .frame(width: 48, height: 48)
                
                Image(systemName: "sun.max.fill")
                    .font(.title2)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.yellow, .orange],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .orange.opacity(0.5), radius: 4)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Perfect Golf Weather")
                    .font(.subheadline.weight(.semibold))
                Text("72°F • Sunny • Low Wind")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Weather animation
            ZStack {
                ForEach(0..<3) { i in
                    Circle()
                        .stroke(Color.secondaryGold.opacity(0.3 - Double(i) * 0.1), lineWidth: 1)
                        .frame(width: CGFloat(20 + i * 10), height: CGFloat(20 + i * 10))
                }
                Text("☀️")
                    .font(.title)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(
            LinearGradient(
                colors: [Color.surfaceVariant.opacity(0.8), Color.surfaceVariant.opacity(0.4)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg)
                .stroke(Color.secondaryGold.opacity(0.2), lineWidth: 1)
        )
    }
    
    // MARK: - Next Up Card with Countdown
    
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
                
                // Countdown Timer (NEW)
                if let time = match.startTime {
                    CountdownView(targetDate: time)
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
    
    // MARK: - Live Matches Section
    
    @ViewBuilder
    private func liveMatchesSection(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Circle()
                        .fill(Color.success)
                        .frame(width: 8, height: 8)
                        .pulsingAnimation()
                    Text("LIVE NOW")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.success)
                }
                
                Spacer()
                
                Text("\(liveMatches.count) match\(liveMatches.count > 1 ? "es" : "")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            ForEach(liveMatches.prefix(3), id: \.id) { match in
                NavigationLink(destination: MatchScoringView(match: match)) {
                    liveMatchRow(match, trip: trip)
                }
            }
            
            if liveMatches.count > 3 {
                NavigationLink(destination: ScoreTabView()) {
                    Text("View all \(liveMatches.count) live matches →")
                        .font(.caption)
                        .foregroundColor(.accentColor)
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .cardStyle()
    }
    
    @ViewBuilder
    private func liveMatchRow(_ match: Match, trip: Trip) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Match \(match.matchOrder + 1)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)
                
                Text(match.statusString)
                    .font(.caption)
                    .foregroundColor(match.matchScore > 0 ? .teamUSA : (match.matchScore < 0 ? .teamEurope : .secondary))
            }
            
            Spacer()
            
            HStack(spacing: DesignTokens.Spacing.xs) {
                Text("Hole \(match.currentHole)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(Color.surfaceElevated)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
    }
    
    // MARK: - Captain Actions (Enhanced)
    
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
            
            // Session state summary
            let state = CaptainModeService.shared.sessionStateSummary(for: trip)
            HStack(spacing: DesignTokens.Spacing.md) {
                statChip(value: "\(state.locked)", label: "Locked", color: .warning)
                statChip(value: "\(state.live)", label: "Live", color: .success)
                statChip(value: "\(state.total - state.locked - state.live)", label: "Open", color: .info)
            }
            
            // Quick action buttons grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: DesignTokens.Spacing.md) {
                // Build Lineup (if there's an unlocked session)
                if let nextSession = trip.sortedSessions.first(where: { !$0.isLocked && !$0.isComplete }) {
                    actionButtonWithSubtitle(
                        icon: "wand.and.stars",
                        title: "Build Lineup",
                        subtitle: nextSession.displayTitle,
                        color: .accentColor
                    ) {
                        selectedSession = nextSession
                    }
                }
                
                // View Standings
                NavigationLink(destination: StandingsTabView()) {
                    actionButtonContent(
                        icon: "trophy.fill",
                        title: "Standings",
                        subtitle: "Full breakdown",
                        color: .secondaryGold
                    )
                }
                
                // View Matchups
                NavigationLink(destination: MatchupsTabView()) {
                    actionButtonContent(
                        icon: "rectangle.grid.2x2.fill",
                        title: "Matchups",
                        subtitle: "All sessions",
                        color: .teamUSA
                    )
                }
                
                // Score Now
                NavigationLink(destination: ScoreTabView()) {
                    actionButtonContent(
                        icon: "plus.circle.fill",
                        title: "Score Now",
                        subtitle: "Enter results",
                        color: .success
                    )
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .cardStyle()
    }
    
    @ViewBuilder
    private func statChip(value: String, label: String, color: Color) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }
    
    @ViewBuilder
    private func actionButtonWithSubtitle(icon: String, title: String, subtitle: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            actionButtonContent(icon: icon, title: title, subtitle: subtitle, color: color)
        }
    }
    
    @ViewBuilder
    private func actionButtonContent(icon: String, title: String, subtitle: String, color: Color) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            VStack(spacing: 2) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.primary)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.md)
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
            icon: "trophy.fill",
            title: "Welcome to Ryder Cup",
            description: "Create your legendary buddies trip tournament. Set up teams, build matchups, and compete for the cup!",
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

// MARK: - Countdown View Component

struct CountdownView: View {
    let targetDate: Date
    @State private var timeRemaining: String = ""
    
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "timer")
                .font(.caption)
            Text(timeRemaining)
                .font(.caption.weight(.bold).monospacedDigit())
        }
        .foregroundColor(.warning)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(Color.warning.opacity(0.15))
        .clipShape(Capsule())
        .onReceive(timer) { _ in
            updateTimeRemaining()
        }
        .onAppear {
            updateTimeRemaining()
        }
    }
    
    private func updateTimeRemaining() {
        let now = Date()
        let interval = targetDate.timeIntervalSince(now)
        
        if interval <= 0 {
            timeRemaining = "NOW"
            return
        }
        
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60
        
        if hours > 0 {
            timeRemaining = String(format: "%dh %dm", hours, minutes)
        } else if minutes > 0 {
            timeRemaining = String(format: "%dm %ds", minutes, seconds)
        } else {
            timeRemaining = String(format: "%ds", seconds)
        }
    }
}

#Preview {
    HomeTabView()
        .modelContainer(for: [Trip.self, Player.self, Course.self], inMemory: true)
}
