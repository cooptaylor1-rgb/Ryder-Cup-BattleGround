import SwiftUI
import SwiftData

/// Score tab - Match play scoring
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
                VStack(spacing: DesignTokens.Spacing.lg) {
                    // Score Now CTA
                    if let nextMatch = scheduledMatches.first ?? inProgressMatches.first {
                        scoreNowCard(nextMatch)
                    }
                    
                    // In Progress
                    if !inProgressMatches.isEmpty {
                        matchSection(title: "In Progress", matches: inProgressMatches, icon: "play.circle.fill", color: .info)
                    }
                    
                    // Scheduled
                    if !scheduledMatches.isEmpty {
                        matchSection(title: "Scheduled", matches: scheduledMatches, icon: "clock", color: .secondary)
                    }
                    
                    // Completed
                    if !completedMatches.isEmpty {
                        matchSection(title: "Completed", matches: completedMatches, icon: "checkmark.circle.fill", color: .success)
                    }
                    
                    // Empty state
                    if allMatches.isEmpty {
                        EmptyStateView(
                            icon: "plus.circle",
                            title: "No Matches",
                            description: "Add matches in the Matchups tab to start scoring."
                        )
                        .padding(.top, DesignTokens.Spacing.xxxl)
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .navigationTitle("Score")
            .fullScreenCover(item: $selectedMatch) { match in
                MatchScoringView(match: match)
            }
        }
    }
    
    // MARK: - Score Now Card
    
    @ViewBuilder
    private func scoreNowCard(_ match: Match) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            HStack {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: match.status == .inProgress ? "play.circle.fill" : "plus.circle.fill")
                        .font(.title)
                        .foregroundColor(match.status == .inProgress ? .success : .accentColor)
                    
                    if match.status == .inProgress {
                        Circle()
                            .fill(Color.success)
                            .frame(width: 8, height: 8)
                            .pulsingAnimation()
                    }
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(match.status == .inProgress ? "Continue Scoring" : "Score Now")
                        .font(.headline)
                    
                    if let session = match.session {
                        Text(session.displayTitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            
            // Match preview
            matchPreview(match)
            
            // Big CTA with animation
            Button(action: { 
                HapticManager.buttonTap()
                selectedMatch = match 
            }) {
                HStack {
                    Image(systemName: match.status == .inProgress ? "play.fill" : "flag.checkered")
                    Text(match.status == .inProgress ? "Continue" : "Start Match")
                }
                .primaryButtonStyle()
            }
            .pressAnimation()
        }
        .padding(DesignTokens.Spacing.xl)
        .heroCardStyle()
    }
    
    @ViewBuilder
    private func matchPreview(_ match: Match) -> some View {
        HStack {
            // Team A
            VStack {
                HStack(spacing: -8) {
                    ForEach(Array(match.teamAIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                        Circle()
                            .fill(Color.teamUSA.opacity(0.3))
                            .frame(width: 32, height: 32)
                            .overlay(Circle().stroke(Color.teamUSA, lineWidth: 2))
                    }
                }
                Text("Team A")
                    .font(.caption)
                    .foregroundColor(.teamUSA)
            }
            
            Spacer()
            
            // Status
            VStack {
                if match.status == .inProgress {
                    Text(match.statusString)
                        .font(.subheadline.weight(.semibold))
                    Text("Hole \(match.currentHole)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    Text("vs")
                        .font(.title3)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Team B
            VStack {
                HStack(spacing: -8) {
                    ForEach(Array(match.teamBIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                        Circle()
                            .fill(Color.teamEurope.opacity(0.3))
                            .frame(width: 32, height: 32)
                            .overlay(Circle().stroke(Color.teamEurope, lineWidth: 2))
                    }
                }
                Text("Team B")
                    .font(.caption)
                    .foregroundColor(.teamEurope)
            }
        }
    }
    
    // MARK: - Match Section
    
    @ViewBuilder
    private func matchSection(title: String, matches: [Match], icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.headline)
                Spacer()
                Text("\(matches.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            ForEach(matches, id: \.id) { match in
                matchRow(match)
                    .onTapGesture {
                        selectedMatch = match
                    }
            }
        }
    }
    
    @ViewBuilder
    private func matchRow(_ match: Match) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                if let session = match.session {
                    Text(session.sessionType.displayName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Circle()
                        .fill(Color.teamUSA)
                        .frame(width: 8, height: 8)
                    Text("\(match.teamAIds.count)")
                        .font(.subheadline)
                    Text("vs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(match.teamBIds.count)")
                        .font(.subheadline)
                    Circle()
                        .fill(Color.teamEurope)
                        .frame(width: 8, height: 8)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing) {
                if match.status == .final {
                    Text(match.resultString)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(match.result == .teamAWin ? .teamUSA : (match.result == .teamBWin ? .teamEurope : .secondary))
                } else if match.status == .inProgress {
                    Text(match.statusString)
                        .font(.caption.weight(.semibold))
                    Text("Hole \(match.currentHole)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else if let time = match.startTime {
                    Text(time, style: .time)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(DesignTokens.Spacing.md)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
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
    
    private var matchState: ScoringEngine.MatchState {
        ScoringEngine.calculateMatchState(holeResults: match.sortedHoleResults)
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                scoringHeader
                
                // Main scoring area
                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.xl) {
                        // Match status
                        matchStatusCard
                        
                        // Current hole
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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    if matchState.isClosedOut || !matchState.canContinue {
                        Button("Finalize") {
                            showFinalizeAlert = true
                        }
                    }
                }
            }
            .alert("Finalize Match", isPresented: $showFinalizeAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Finalize") { finalizeMatch() }
            } message: {
                Text("Are you sure you want to finalize this match? This cannot be undone.")
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
        VStack(spacing: DesignTokens.Spacing.sm) {
            if let session = match.session {
                Text(session.displayTitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                // Team A
                VStack {
                    Text("Team A")
                        .font(.caption)
                        .foregroundColor(.teamUSA)
                    
                    HStack(spacing: -8) {
                        ForEach(Array(match.teamAIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                            Circle()
                                .fill(Color.teamUSA.opacity(0.3))
                                .frame(width: 36, height: 36)
                                .overlay(Circle().stroke(Color.teamUSA, lineWidth: 2))
                        }
                    }
                }
                
                Spacer()
                
                // Team B
                VStack {
                    Text("Team B")
                        .font(.caption)
                        .foregroundColor(.teamEurope)
                    
                    HStack(spacing: -8) {
                        ForEach(Array(match.teamBIds.prefix(2).enumerated()), id: \.offset) { _, _ in
                            Circle()
                                .fill(Color.teamEurope.opacity(0.3))
                                .frame(width: 36, height: 36)
                                .overlay(Circle().stroke(Color.teamEurope, lineWidth: 2))
                        }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .padding(.vertical, DesignTokens.Spacing.md)
        .background(Color.surfaceVariant)
    }
    
    // MARK: - Match Status Card
    
    private var matchStatusCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Status with enhanced styling
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(matchState.statusText)
                    .font(.title.weight(.bold))
                    .foregroundColor(statusColor)
                    .contentTransition(.numericText())
                
                if matchState.isDormie {
                    Text("DORMIE")
                        .font(.caption.weight(.black))
                        .foregroundColor(.warning)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.warning.opacity(0.2))
                        .clipShape(Capsule())
                }
            }
            
            // Enhanced hole indicators
            HoleIndicatorDots(
                holeResults: match.sortedHoleResults,
                currentHole: match.currentHole,
                teamAColor: .teamUSA,
                teamBColor: .teamEurope
            )
        }
        .padding(DesignTokens.Spacing.xl)
        .cardStyle(elevation: 1)
    }
    
    private var statusColor: Color {
        if matchState.matchScore > 0 { return .teamUSA }
        if matchState.matchScore < 0 { return .teamEurope }
        return .primary
    }
    
    // MARK: - Current Hole Card
    
    private var currentHoleCard: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            // Hole number with enhanced display
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text("HOLE")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
                
                Text("\(match.currentHole)")
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                
                if let teeSet = match.teeSet {
                    let pars = teeSet.holePars ?? TeeSet.defaultHolePars
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Text("Par \(pars[match.currentHole - 1])")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(.secondary)
                        
                        if let hdcp = teeSet.holeHandicaps[safe: match.currentHole - 1] {
                            Text("•")
                                .foregroundColor(.secondary)
                            Text("HDCP \(hdcp)")
                                .font(.caption)
                                .foregroundColor(.secondary.opacity(0.8))
                        }
                    }
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            
            // Enhanced scoring buttons
            HStack(spacing: DesignTokens.Spacing.md) {
                // Team A wins
                Button(action: { 
                    scoreHole(.teamA)
                    HapticManager.heavyImpact()
                }) {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                        Text("Team A")
                            .font(.subheadline.weight(.semibold))
                    }
                    .scoringButtonStyle(teamColor: .teamUSA)
                }
                .pressAnimation()
                
                // Halved
                Button(action: { 
                    scoreHole(.halved)
                    HapticManager.scoreEntered()
                }) {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "equal.circle.fill")
                            .font(.title)
                        Text("Halved")
                            .font(.subheadline.weight(.semibold))
                    }
                    .scoringButtonStyle(teamColor: Color.secondary.opacity(0.6))
                }
                .pressAnimation()
                
                // Team B wins
                Button(action: { 
                    scoreHole(.teamB)
                    HapticManager.heavyImpact()
                }) {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                        Text("Team B")
                            .font(.subheadline.weight(.semibold))
                    }
                    .scoringButtonStyle(teamColor: .teamEurope)
                }
                .pressAnimation()
            }
            .disabled(!matchState.canContinue)
            .opacity(matchState.canContinue ? 1.0 : 0.5)
        }
        .padding(DesignTokens.Spacing.xl)
        .heroCardStyle()
    }
    
    // MARK: - Hole History
    
    private var holeHistorySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("HOLE HISTORY")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary)
            
            if match.sortedHoleResults.isEmpty {
                Text("No holes scored yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
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
            Text("Hole \(result.holeNumber)")
                .font(.subheadline)
            
            Spacer()
            
            Text(result.winner.displayName)
                .font(.subheadline.weight(.medium))
                .foregroundColor(resultColor(result.winner))
        }
        .padding(DesignTokens.Spacing.md)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
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
                Text("Hole \(lastAction.holeNumber)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: performUndo) {
                Label("Undo", systemImage: "arrow.uturn.backward")
            }
        }
        .padding(DesignTokens.Spacing.md)
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
        HapticManager.scoreEntered()
        
        // Auto-advance
        if match.currentHole < 18 {
            let newState = ScoringEngine.calculateMatchState(holeResults: match.sortedHoleResults + [HoleResult(holeNumber: match.currentHole, winner: winner)])
            if newState.canContinue {
                match.currentHole += 1
            }
        }
        
        match.updatedAt = Date()
    }
    
    private func performUndo() {
        guard let action = undoManager.popLastAction() else { return }
        
        if let previousWinner = action.previousWinner {
            // Restore previous value
            if let result = match.sortedHoleResults.first(where: { $0.holeNumber == action.holeNumber }) {
                result.winner = previousWinner
            }
        } else {
            // Remove the result
            if let result = match.sortedHoleResults.first(where: { $0.holeNumber == action.holeNumber }) {
                modelContext.delete(result)
            }
        }
        
        match.currentHole = action.holeNumber
        HapticManager.selection()
    }
    
    private func finalizeMatch() {
        match.finalizeMatch()
        HapticManager.success()
        dismiss()
    }
}

#Preview {
    ScoreTabView()
        .modelContainer(for: [Trip.self, Match.self, HoleResult.self], inMemory: true)
}
