import SwiftUI
import SwiftData

/// Score tab - Match play scoring with premium UX
struct ScoreTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    @Query(filter: #Predicate<Match> { $0.status != .cancelled }, sort: \Match.matchOrder)
    private var allMatches: [Match]
    
    @State private var selectedMatch: Match?
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    private var inProgressMatches: [Match] {
        allMatches.filter { $0.status == .inProgress }
    }
    
    private var scheduledMatches: [Match] {
        allMatches.filter { $0.status == .scheduled }
    }
    
    private var completedMatches: [Match] {
        allMatches.filter { $0.status == .final }
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    // Hero Score Now CTA
                    if let nextMatch = inProgressMatches.first ?? scheduledMatches.first {
                        heroScoreCard(nextMatch)
                    }
                    
                    // In Progress Section
                    if !inProgressMatches.isEmpty {
                        matchSection(
                            title: "LIVE",
                            subtitle: "\(inProgressMatches.count) match\(inProgressMatches.count > 1 ? "es" : "") in progress",
                            matches: inProgressMatches,
                            icon: "play.circle.fill",
                            color: .success,
                            isLive: true
                        )
                    }
                    
                    // Scheduled Section
                    if !scheduledMatches.isEmpty {
                        matchSection(
                            title: "UP NEXT",
                            subtitle: "\(scheduledMatches.count) match\(scheduledMatches.count > 1 ? "es" : "") scheduled",
                            matches: scheduledMatches,
                            icon: "clock.fill",
                            color: .info,
                            isLive: false
                        )
                    }
                    
                    // Completed Section
                    if !completedMatches.isEmpty {
                        matchSection(
                            title: "FINAL",
                            subtitle: "\(completedMatches.count) match\(completedMatches.count > 1 ? "es" : "") completed",
                            matches: completedMatches,
                            icon: "checkmark.circle.fill",
                            color: .secondary,
                            isLive: false
                        )
                    }
                    
                    // Empty State
                    if allMatches.isEmpty {
                        EmptyStateView(
                            icon: "flag.checkered",
                            title: "Ready to Score",
                            description: "Add matches in the Matchups tab to start tracking your Ryder Cup competition."
                        )
                        .padding(.top, DesignTokens.Spacing.xxxl)
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(Color.surfaceBackground)
            .navigationTitle("Score")
            .fullScreenCover(item: $selectedMatch) { match in
                MatchScoringView(match: match)
            }
        }
    }
    
    // MARK: - Hero Score Card
    
    @ViewBuilder
    private func heroScoreCard(_ match: Match) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            // Header
            HStack {
                if match.status == .inProgress {
                    LiveStatusIndicator(text: "LIVE", color: .success)
                } else {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "flag.checkered")
                            .foregroundColor(.accentColor)
                        Text("READY TO START")
                            .font(.caption.weight(.black))
                            .foregroundColor(.accentColor)
                    }
                }
                
                Spacer()
                
                if let session = match.session {
                    Text(session.sessionType.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            // Match Preview
            matchHeroPreview(match)
            
            // Status
            if match.status == .inProgress {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    Text(match.statusString)
                        .font(.title2.weight(.bold))
                        .foregroundColor(statusColor(for: match))
                    
                    Text("Hole \(match.currentHole) of 18")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            // CTA Button
            Button(action: { 
                HapticManager.heavyImpact()
                selectedMatch = match 
            }) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: match.status == .inProgress ? "play.fill" : "flag.checkered")
                        .font(.title3)
                    Text(match.status == .inProgress ? "Continue Scoring" : "Start Match")
                        .font(.headline.weight(.bold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: DesignTokens.ButtonSize.large)
                .background(
                    LinearGradient(
                        colors: [Color.accentColor, Color.accentColor.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
                .shadow(color: Color.accentColor.opacity(0.4), radius: 12, y: 6)
            }
            .pressAnimation()
        }
        .padding(DesignTokens.Spacing.xl)
        .heroCardStyle()
    }
    
    @ViewBuilder
    private func matchHeroPreview(_ match: Match) -> some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            // Team A
            VStack(spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: -12) {
                    ForEach(Array(match.teamAIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                        Circle()
                            .fill(Color.teamUSA.opacity(0.3))
                            .frame(width: 48, height: 48)
                            .overlay(Circle().stroke(Color.teamUSA, lineWidth: 2))
                    }
                }
                Text(currentTrip?.teamA?.name ?? "Team A")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.teamUSA)
            }
            
            // VS
            VStack {
                Text("vs")
                    .font(.title2.weight(.bold))
                    .foregroundColor(.secondary.opacity(0.5))
            }
            
            // Team B
            VStack(spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: -12) {
                    ForEach(Array(match.teamBIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                        Circle()
                            .fill(Color.teamEurope.opacity(0.3))
                            .frame(width: 48, height: 48)
                            .overlay(Circle().stroke(Color.teamEurope, lineWidth: 2))
                    }
                }
                Text(currentTrip?.teamB?.name ?? "Team B")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.teamEurope)
            }
        }
    }
    
    private func statusColor(for match: Match) -> Color {
        let state = ScoringEngine.calculateMatchState(holeResults: match.sortedHoleResults)
        if state.matchScore > 0 { return .teamUSA }
        if state.matchScore < 0 { return .teamEurope }
        return .primary
    }
    
    // MARK: - Match Section
    
    @ViewBuilder
    private func matchSection(title: String, subtitle: String, matches: [Match], icon: String, color: Color, isLive: Bool) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: icon)
                        .foregroundColor(color)
                    Text(title)
                        .font(.subheadline.weight(.black))
                        .foregroundColor(color)
                }
                
                Spacer()
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            ForEach(matches, id: \.id) { match in
                matchCard(match, isLive: isLive)
                    .onTapGesture {
                        HapticManager.selection()
                        selectedMatch = match
                    }
            }
        }
    }
    
    @ViewBuilder
    private func matchCard(_ match: Match, isLive: Bool) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Team indicators
            HStack(spacing: DesignTokens.Spacing.sm) {
                // Team A avatars
                HStack(spacing: -8) {
                    ForEach(Array(match.teamAIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                        Circle()
                            .fill(Color.teamUSA.opacity(0.3))
                            .frame(width: 32, height: 32)
                            .overlay(Circle().stroke(Color.teamUSA, lineWidth: 1.5))
                    }
                }
                
                Text("vs")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                // Team B avatars
                HStack(spacing: -8) {
                    ForEach(Array(match.teamBIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                        Circle()
                            .fill(Color.teamEurope.opacity(0.3))
                            .frame(width: 32, height: 32)
                            .overlay(Circle().stroke(Color.teamEurope, lineWidth: 1.5))
                    }
                }
            }
            
            Spacer()
            
            // Status
            VStack(alignment: .trailing, spacing: 2) {
                if match.status == .final {
                    Text(match.resultString)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(match.result == .teamAWin ? .teamUSA : (match.result == .teamBWin ? .teamEurope : .secondary))
                } else if match.status == .inProgress {
                    Text(match.statusString)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(statusColor(for: match))
                    Text("Hole \(match.currentHole)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else if let time = match.startTime {
                    Text(time, style: .time)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary.opacity(0.5))
        }
        .padding(DesignTokens.Spacing.lg)
        .background(
            isLive ? Color.success.opacity(0.05) : Color.surfaceVariant
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg)
                .stroke(isLive ? Color.success.opacity(0.2) : Color.clear, lineWidth: 1)
        )
    }
}

// MARK: - Match Scoring View

struct MatchScoringView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var match: Match
    
    @State private var undoManager = ScoringEngine.UndoManager()
    @State private var showFinalizeAlert = false
    @State private var showUndoToast = false
    @State private var lastCommentary: String?
    @State private var showVictory = false
    
    private var matchState: ScoringEngine.MatchState {
        ScoringEngine.calculateMatchState(holeResults: match.sortedHoleResults)
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color.surfaceBackground.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header with teams
                    scoringHeader
                    
                    // Main content
                    ScrollView {
                        VStack(spacing: DesignTokens.Spacing.xl) {
                            // Match status card
                            matchStatusCard
                            
                            // Commentary (if any)
                            if let commentary = lastCommentary {
                                MatchCommentary(
                                    commentary: commentary,
                                    teamColor: matchState.matchScore > 0 ? .teamUSA : (matchState.matchScore < 0 ? .teamEurope : nil)
                                )
                            }
                            
                            // Current hole scoring
                            currentHoleCard
                            
                            // Hole history
                            holeHistorySection
                        }
                        .padding(DesignTokens.Spacing.lg)
                    }
                    
                    // Undo bar
                    if undoManager.canUndo() {
                        undoBar
                    }
                }
                
                // Victory overlay with fireworks
                if showVictory {
                    ZStack {
                        Color.black.opacity(0.85)
                            .ignoresSafeArea()
                            .onTapGesture { showVictory = false }
                        
                        // Fireworks
                        FireworksView(colors: [
                            matchState.matchScore > 0 ? .teamUSA : .teamEurope,
                            .gold,
                            .white
                        ])
                        .ignoresSafeArea()
                        
                        // Trophy animation
                        TrophyAnimation(
                            teamColor: matchState.matchScore > 0 ? .teamUSA : .teamEurope,
                            teamName: matchState.matchScore > 0 ? "Team A" : "Team B"
                        )
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    if matchState.isClosedOut || !matchState.canContinue {
                        Button("Finalize") {
                            showFinalizeAlert = true
                        }
                        .foregroundColor(.gold)
                        .fontWeight(.bold)
                    }
                }
            }
            .alert("Finalize Match", isPresented: $showFinalizeAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Finalize") { finalizeMatch() }
            } message: {
                Text("Confirm the final result? This cannot be undone.")
            }
            .onAppear {
                if match.status == .scheduled {
                    match.status = .inProgress
                }
            }
        }
    }
    
    // MARK: - Scoring Header
    
    private var scoringHeader: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if let session = match.session {
                Text(session.displayTitle)
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: DesignTokens.Spacing.xxxl) {
                // Team A
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: -12) {
                        ForEach(Array(match.teamAIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.teamUSALight, Color.teamUSA],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 44, height: 44)
                                .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))
                                .shadow(color: .teamUSA.opacity(0.4), radius: 4)
                        }
                    }
                    Text("Team A")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.teamUSA)
                }
                
                // Team B
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: -12) {
                        ForEach(Array(match.teamBIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.teamEuropeLight, Color.teamEurope],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 44, height: 44)
                                .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))
                                .shadow(color: .teamEurope.opacity(0.4), radius: 4)
                        }
                    }
                    Text("Team B")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.teamEurope)
                }
            }
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.surfaceVariant, Color.surface],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
    
    // MARK: - Match Status Card
    
    private var matchStatusCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Status text with glow
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(matchState.statusText)
                    .font(.displayMedium)
                    .foregroundColor(statusColor)
                    .glow(color: statusColor, radius: 8)
                    .contentTransition(.numericText())
                
                if matchState.isDormie {
                    Text("DORMIE")
                        .font(.caption.weight(.black))
                        .foregroundColor(.black)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(
                            LinearGradient(
                                colors: [.warning, .warningLight],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .clipShape(Capsule())
                        .shadow(color: .warning.opacity(0.5), radius: 8)
                }
                
                if matchState.isClosedOut {
                    Text("MATCH COMPLETE")
                        .font(.caption.weight(.black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(statusColor)
                        .clipShape(Capsule())
                }
            }
            
            // Hole indicator dots
            HoleIndicatorDots(
                holeResults: match.sortedHoleResults,
                currentHole: match.currentHole,
                teamAColor: .teamUSA,
                teamBColor: .teamEurope
            )
        }
        .padding(DesignTokens.Spacing.xl)
        .cardStyle(elevation: 2)
    }
    
    private var statusColor: Color {
        if matchState.matchScore > 0 { return .teamUSA }
        if matchState.matchScore < 0 { return .teamEurope }
        return .primary
    }
    
    // MARK: - Current Hole Card
    
    private var currentHoleCard: some View {
        VStack(spacing: DesignTokens.Spacing.xxl) {
            // Hole number with enhanced display
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text("HOLE")
                    .font(.caption.weight(.black))
                    .foregroundColor(.secondary)
                    .tracking(2)
                
                Text("\(match.currentHole)")
                    .font(.system(size: 72, weight: .black, design: .rounded))
                    .foregroundColor(.primary)
                    .contentTransition(.numericText())
                
                if let teeSet = match.teeSet {
                    let pars = teeSet.holePars ?? TeeSet.defaultHolePars
                    HStack(spacing: DesignTokens.Spacing.md) {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "flag.fill")
                                .foregroundColor(.fairway)
                            Text("Par \(pars[match.currentHole - 1])")
                                .font(.subheadline.weight(.semibold))
                        }
                        
                        if let hdcp = teeSet.holeHandicaps[safe: match.currentHole - 1] {
                            Text("•")
                                .foregroundColor(.secondary)
                            Text("HDCP \(hdcp)")
                                .font(.caption.weight(.medium))
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            
            // Hero scoring buttons
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    // Team A wins hole
                    Button(action: { scoreHole(.teamA) }) {
                        VStack(spacing: DesignTokens.Spacing.sm) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 32))
                            Text("Team A")
                                .font(.headline.weight(.bold))
                            Text("Wins Hole")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                        }
                        .heroScoringButtonStyle(teamColor: .teamUSA)
                    }
                    .pressAnimation()
                    
                    // Team B wins hole
                    Button(action: { scoreHole(.teamB) }) {
                        VStack(spacing: DesignTokens.Spacing.sm) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 32))
                            Text("Team B")
                                .font(.headline.weight(.bold))
                            Text("Wins Hole")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                        }
                        .heroScoringButtonStyle(teamColor: .teamEurope)
                    }
                    .pressAnimation()
                }
                
                // Halved button
                Button(action: { scoreHole(.halved) }) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "equal.circle.fill")
                            .font(.title2)
                        Text("Halved")
                            .font(.headline.weight(.bold))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: DesignTokens.ButtonSize.medium)
                    .background(Color.surfaceElevated)
                    .foregroundColor(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                }
                .pressAnimation()
            }
            .disabled(!matchState.canContinue)
            .opacity(matchState.canContinue ? 1.0 : 0.4)
        }
        .padding(DesignTokens.Spacing.xl)
        .heroCardStyle()
    }
    
    // MARK: - Hole History
    
    private var holeHistorySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundColor(.secondary)
                Text("HOLE HISTORY")
                    .font(.caption.weight(.black))
                    .foregroundColor(.secondary)
                    .tracking(1)
            }
            
            if match.sortedHoleResults.isEmpty {
                HStack {
                    Spacer()
                    Text("No holes scored yet")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.vertical, DesignTokens.Spacing.xl)
            } else {
                ForEach(match.sortedHoleResults.reversed(), id: \.id) { result in
                    holeResultRow(result)
                }
            }
        }
    }
    
    @ViewBuilder
    private func holeResultRow(_ result: HoleResult) -> some View {
        HStack {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text("Hole \(result.holeNumber)")
                    .font(.subheadline.weight(.medium))
                
                Circle()
                    .fill(resultColor(result.winner))
                    .frame(width: 8, height: 8)
            }
            
            Spacer()
            
            Text(result.winner.displayName)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(resultColor(result.winner))
        }
        .padding(DesignTokens.Spacing.md)
        .background(Color.surfaceVariant.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
    }
    
    private func resultColor(_ winner: HoleWinner) -> Color {
        switch winner {
        case .teamA: return .teamUSA
        case .teamB: return .teamEurope
        case .halved: return .secondary
        }
    }
    
    // MARK: - Undo Bar
    
    private var undoBar: some View {
        HStack {
            if let lastAction = undoManager.lastAction {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.caption)
                    Text("Hole \(lastAction.holeNumber)")
                        .font(.caption.weight(.medium))
                }
                .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: performUndo) {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "arrow.uturn.backward")
                    Text("Undo")
                        .fontWeight(.semibold)
                }
            }
            .foregroundColor(.accentColor)
        }
        .padding(DesignTokens.Spacing.lg)
        .background(Color.surfaceVariant)
    }
    
    // MARK: - Actions
    
    private func scoreHole(_ winner: HoleWinner) {
        // Record undo action
        let existingResult = match.sortedHoleResults.first { $0.holeNumber == match.currentHole }
        undoManager.recordAction(ScoringEngine.UndoAction(
            holeNumber: match.currentHole,
            previousWinner: existingResult?.winner,
            timestamp: Date()
        ))
        
        // Create or update result
        if let existing = existingResult {
            existing.winner = winner
            existing.timestamp = Date()
        } else {
            let result = HoleResult(holeNumber: match.currentHole, winner: winner)
            result.match = match
            modelContext.insert(result)
        }
        
        // Haptic feedback
        HapticManager.heavyImpact()
        
        // Generate commentary
        let newState = ScoringEngine.calculateMatchState(
            holeResults: match.sortedHoleResults + [HoleResult(holeNumber: match.currentHole, winner: winner)]
        )
        updateCommentary(winner: winner, newState: newState)
        
        // Auto-advance
        if match.currentHole < 18 && newState.canContinue {
            withAnimation(.snappy) {
                match.currentHole += 1
            }
        }
        
        // Check for victory
        if newState.isClosedOut {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                showVictory = true
                HapticManager.victory()
            }
        }
        
        match.updatedAt = Date()
    }
    
    private func updateCommentary(winner: HoleWinner, newState: ScoringEngine.MatchState) {
        var commentary = ""
        
        switch winner {
        case .teamA:
            if newState.matchScore == 1 && matchState.matchScore == 0 {
                commentary = "Team A takes the lead!"
            } else if newState.matchScore > matchState.matchScore {
                commentary = "Team A extends the lead!"
            } else if newState.matchScore == 0 {
                commentary = "Team A squares the match!"
            }
        case .teamB:
            if newState.matchScore == -1 && matchState.matchScore == 0 {
                commentary = "Team B takes the lead!"
            } else if newState.matchScore < matchState.matchScore {
                commentary = "Team B extends the lead!"
            } else if newState.matchScore == 0 {
                commentary = "Team B squares the match!"
            }
        case .halved:
            commentary = "Hole halved"
        }
        
        if newState.isDormie {
            commentary = "DORMIE! \(newState.matchScore > 0 ? "Team A" : "Team B") can close it out"
        }
        
        if newState.isClosedOut {
            commentary = "\(newState.matchScore > 0 ? "Team A" : "Team B") wins!"
        }
        
        withAnimation(.smooth) {
            lastCommentary = commentary.isEmpty ? nil : commentary
        }
    }
    
    private func performUndo() {
        guard let action = undoManager.popLastAction() else { return }
        
        if let previousWinner = action.previousWinner {
            if let result = match.sortedHoleResults.first(where: { $0.holeNumber == action.holeNumber }) {
                result.winner = previousWinner
            }
        } else {
            if let result = match.sortedHoleResults.first(where: { $0.holeNumber == action.holeNumber }) {
                modelContext.delete(result)
            }
        }
        
        withAnimation(.snappy) {
            match.currentHole = action.holeNumber
            lastCommentary = nil
        }
        HapticManager.selection()
    }
    
    private func finalizeMatch() {
        match.finalizeMatch()
        HapticManager.victory()
        dismiss()
    }
}

#Preview {
    ScoreTabView()
        .modelContainer(for: [Trip.self, Match.self, HoleResult.self], inMemory: true)
        .preferredColorScheme(.dark)
}
