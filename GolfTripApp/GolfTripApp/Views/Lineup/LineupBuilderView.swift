import SwiftUI
import SwiftData

/// Lineup Builder - Drag-and-drop interface for creating match pairings
struct LineupBuilderView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Bindable var session: RyderCupSession
    let trip: Trip
    
    @State private var teamAPlayers: [Player] = []
    @State private var teamBPlayers: [Player] = []
    @State private var matchPairings: [MatchPairing] = []
    @State private var showAutoFillAlert = false
    @State private var autoFillResult: LineupAutoFillService.AutoFillResult?
    @State private var fairnessScore: LineupAutoFillService.FairnessScore?
    @State private var lockedMatches: Set<Int> = []
    @State private var showPublishConfirm = false
    @State private var isDragging = false
    
    struct MatchPairing: Identifiable {
        let id = UUID()
        var matchIndex: Int
        var teamAPlayers: [Player]
        var teamBPlayers: [Player]
        var isLocked: Bool = false
    }
    
    private let playersPerTeam: Int
    
    init(session: RyderCupSession, trip: Trip) {
        self.session = session
        self.trip = trip
        self.playersPerTeam = session.sessionType.playersPerTeam
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header with fairness score
                headerSection
                
                // Main content
                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.lg) {
                        // Available players
                        availablePlayersSection
                        
                        // Match slots
                        matchSlotsSection
                    }
                    .padding(DesignTokens.Spacing.lg)
                }
                
                // Bottom actions
                bottomActions
            }
            .background(Color.surfaceBackground)
            .navigationTitle("Build Lineup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { savePairings() }
                }
            }
            .onAppear {
                loadInitialData()
            }
            .alert("Auto-Fill Lineup", isPresented: $showAutoFillAlert) {
                Button("Keep Locked Matches") {
                    runAutoFill(keepLocked: true)
                }
                Button("Fill All") {
                    runAutoFill(keepLocked: false)
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Auto-fill will optimize pairings for handicap balance and minimize repeat matchups.")
            }
            .confirmationDialog("Publish Lineup?", isPresented: $showPublishConfirm, titleVisibility: .visible) {
                Button("Publish & Lock") {
                    publishLineup()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will lock the session, post to Banter, and notify players.")
            }
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            // Session info
            HStack {
                VStack(alignment: .leading) {
                    Text(session.displayTitle)
                        .font(.headline)
                    Text("\(session.sessionType.displayName) • \(session.sortedMatches.count) matches")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Fairness score badge
                if let fairness = fairnessScore {
                    FairnessScoreBadge(score: fairness)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.md)
            
            // Fairness details (if available)
            if let fairness = fairnessScore, !fairness.drivers.isEmpty {
                FairnessDetailsView(fairness: fairness)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .background(Color.surfaceVariant)
    }
    
    // MARK: - Available Players Section
    
    private var availablePlayersSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("AVAILABLE PLAYERS")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary)
            
            HStack(alignment: .top, spacing: DesignTokens.Spacing.lg) {
                // Team A
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Circle()
                            .fill(Color.teamUSA)
                            .frame(width: 8, height: 8)
                        Text(trip.teamA?.name ?? "Team A")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.teamUSA)
                    }
                    
                    let availableA = teamAPlayers.filter { player in
                        !matchPairings.flatMap { $0.teamAPlayers }.contains { $0.id == player.id }
                    }
                    
                    if availableA.isEmpty {
                        Text("All assigned")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, DesignTokens.Spacing.sm)
                    } else {
                        FlowLayout(spacing: DesignTokens.Spacing.sm) {
                            ForEach(availableA, id: \.id) { player in
                                PlayerChip(
                                    player: player,
                                    teamColor: .teamUSA,
                                    isCompact: true
                                )
                                .draggable(PlayerDragData(player: player, team: .teamA))
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                // Team B
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Circle()
                            .fill(Color.teamEurope)
                            .frame(width: 8, height: 8)
                        Text(trip.teamB?.name ?? "Team B")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.teamEurope)
                    }
                    
                    let availableB = teamBPlayers.filter { player in
                        !matchPairings.flatMap { $0.teamBPlayers }.contains { $0.id == player.id }
                    }
                    
                    if availableB.isEmpty {
                        Text("All assigned")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, DesignTokens.Spacing.sm)
                    } else {
                        FlowLayout(spacing: DesignTokens.Spacing.sm) {
                            ForEach(availableB, id: \.id) { player in
                                PlayerChip(
                                    player: player,
                                    teamColor: .teamEurope,
                                    isCompact: true
                                )
                                .draggable(PlayerDragData(player: player, team: .teamB))
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
    }
    
    // MARK: - Match Slots Section
    
    private var matchSlotsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text("MATCHES")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button {
                    addMatch()
                } label: {
                    Label("Add Match", systemImage: "plus.circle")
                        .font(.caption)
                }
            }
            
            ForEach(Array(matchPairings.enumerated()), id: \.element.id) { index, pairing in
                MatchSlotView(
                    matchIndex: index + 1,
                    pairing: pairing,
                    playersPerTeam: playersPerTeam,
                    teamAName: trip.teamA?.name ?? "Team A",
                    teamBName: trip.teamB?.name ?? "Team B",
                    isLocked: lockedMatches.contains(index),
                    onLockToggle: { toggleLock(at: index) },
                    onRemovePlayer: { team, playerIndex in
                        removePlayer(from: index, team: team, playerIndex: playerIndex)
                    },
                    onDrop: { data, team in
                        handleDrop(data: data, matchIndex: index, team: team)
                    },
                    onDelete: { deleteMatch(at: index) }
                )
            }
            
            if matchPairings.isEmpty {
                emptyMatchesState
            }
        }
    }
    
    private var emptyMatchesState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "rectangle.grid.2x2.fill")
                .font(.system(size: 36))
                .foregroundColor(.secondary)
            
            Text("No matches yet")
                .font(.subheadline)
            
            Text("Tap 'Add Match' or use Auto-Fill to create pairings")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.xxxl)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
    }
    
    // MARK: - Bottom Actions
    
    private var bottomActions: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Button {
                    showAutoFillAlert = true
                } label: {
                    HStack {
                        Image(systemName: "wand.and.stars")
                        Text("Auto-Fill")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.md)
                    .background(Color.surfaceVariant)
                    .foregroundColor(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
                }
                
                Button {
                    showPublishConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "megaphone.fill")
                        Text("Publish")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.md)
                    .background(isReadyToPublish ? Color.accentColor : Color.secondary.opacity(0.3))
                    .foregroundColor(isReadyToPublish ? .white : .secondary)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
                }
                .disabled(!isReadyToPublish)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(Color.surface)
    }
    
    private var isReadyToPublish: Bool {
        !matchPairings.isEmpty && matchPairings.allSatisfy { pairing in
            pairing.teamAPlayers.count == playersPerTeam &&
            pairing.teamBPlayers.count == playersPerTeam
        }
    }
    
    // MARK: - Actions
    
    private func loadInitialData() {
        teamAPlayers = trip.teamA?.players ?? []
        teamBPlayers = trip.teamB?.players ?? []
        
        // Load existing matches
        matchPairings = session.sortedMatches.enumerated().map { index, match in
            let teamA = match.teamAIds.compactMap { id in
                teamAPlayers.first { $0.id == id }
            }
            let teamB = match.teamBIds.compactMap { id in
                teamBPlayers.first { $0.id == id }
            }
            return MatchPairing(
                matchIndex: index,
                teamAPlayers: teamA,
                teamBPlayers: teamB,
                isLocked: false
            )
        }
        
        updateFairnessScore()
    }
    
    private func addMatch() {
        let newMatch = MatchPairing(
            matchIndex: matchPairings.count,
            teamAPlayers: [],
            teamBPlayers: []
        )
        matchPairings.append(newMatch)
    }
    
    private func deleteMatch(at index: Int) {
        guard index < matchPairings.count else { return }
        matchPairings.remove(at: index)
        lockedMatches.remove(index)
        // Reindex locked matches
        lockedMatches = Set(lockedMatches.compactMap { $0 > index ? $0 - 1 : ($0 < index ? $0 : nil) })
        updateFairnessScore()
    }
    
    private func toggleLock(at index: Int) {
        if lockedMatches.contains(index) {
            lockedMatches.remove(index)
        } else {
            lockedMatches.insert(index)
        }
    }
    
    private func removePlayer(from matchIndex: Int, team: TeamSide, playerIndex: Int) {
        guard matchIndex < matchPairings.count else { return }
        
        if team == .teamA {
            guard playerIndex < matchPairings[matchIndex].teamAPlayers.count else { return }
            matchPairings[matchIndex].teamAPlayers.remove(at: playerIndex)
        } else {
            guard playerIndex < matchPairings[matchIndex].teamBPlayers.count else { return }
            matchPairings[matchIndex].teamBPlayers.remove(at: playerIndex)
        }
        updateFairnessScore()
    }
    
    private func handleDrop(data: PlayerDragData, matchIndex: Int, team: TeamSide) {
        guard matchIndex < matchPairings.count else { return }
        
        // Verify player is for correct team
        guard data.team == team else { return }
        
        // Check if player already in this match
        let existingPlayers = team == .teamA ? 
            matchPairings[matchIndex].teamAPlayers : 
            matchPairings[matchIndex].teamBPlayers
        
        if existingPlayers.contains(where: { $0.id == data.player.id }) {
            return // Already in match
        }
        
        // Check slot limit
        if existingPlayers.count >= playersPerTeam {
            return // Full
        }
        
        // Remove from any other match
        for i in matchPairings.indices {
            if team == .teamA {
                matchPairings[i].teamAPlayers.removeAll { $0.id == data.player.id }
            } else {
                matchPairings[i].teamBPlayers.removeAll { $0.id == data.player.id }
            }
        }
        
        // Add to new match
        if team == .teamA {
            matchPairings[matchIndex].teamAPlayers.append(data.player)
        } else {
            matchPairings[matchIndex].teamBPlayers.append(data.player)
        }
        
        HapticManager.buttonTap()
        updateFairnessScore()
    }
    
    private func runAutoFill(keepLocked: Bool) {
        let locked: [(teamA: [Player], teamB: [Player])]
        if keepLocked {
            locked = matchPairings.enumerated().compactMap { index, pairing in
                lockedMatches.contains(index) ? (pairing.teamAPlayers, pairing.teamBPlayers) : nil
            }
        } else {
            locked = []
        }
        
        let result = LineupAutoFillService.shared.autoFillSession(
            sessionType: session.sessionType,
            matchCount: max(matchPairings.count, 4), // At least 4 matches
            teamAPlayers: teamAPlayers,
            teamBPlayers: teamBPlayers,
            lockedPairings: locked,
            pairingHistory: []  // TODO: Load actual history
        )
        
        autoFillResult = result
        
        // Apply result
        matchPairings = result.pairings.enumerated().map { index, suggested in
            MatchPairing(
                matchIndex: index,
                teamAPlayers: suggested.teamAPlayers,
                teamBPlayers: suggested.teamBPlayers,
                isLocked: keepLocked && index < locked.count
            )
        }
        
        fairnessScore = result.fairnessScore
    }
    
    private func updateFairnessScore() {
        let pairings = matchPairings.map { pairing in
            LineupAutoFillService.SuggestedPairing(
                teamAPlayers: pairing.teamAPlayers,
                teamBPlayers: pairing.teamBPlayers,
                handicapDifference: 0,
                repeatPairingScore: 0,
                repeatOpponentScore: 0
            )
        }
        
        fairnessScore = LineupAutoFillService.shared.calculateFairnessScore(
            pairings: pairings,
            teamAName: trip.teamA?.name ?? "Team A",
            teamBName: trip.teamB?.name ?? "Team B"
        )
    }
    
    private func savePairings() {
        // Delete existing matches
        for match in session.sortedMatches {
            modelContext.delete(match)
        }
        
        // Create new matches
        for (index, pairing) in matchPairings.enumerated() {
            let match = Match(
                matchOrder: index,
                teamAPlayerIds: pairing.teamAPlayers.map { $0.id.uuidString }.joined(separator: ","),
                teamBPlayerIds: pairing.teamBPlayers.map { $0.id.uuidString }.joined(separator: ",")
            )
            match.session = session
            modelContext.insert(match)
        }
        
        try? modelContext.save()
        dismiss()
    }
    
    private func publishLineup() {
        savePairings()
        
        // Lock the session
        let actorName = trip.captainName ?? "Captain"
        _ = CaptainModeService.shared.lockSession(session, actorName: actorName, context: modelContext)
        
        // Create banter post
        let post = BanterPost.lineupPublished(sessionName: session.displayTitle, captainName: actorName)
        post.trip = trip
        modelContext.insert(post)
        
        // Log the action
        _ = CaptainModeService.shared.logLineupPublish(session: session, actorName: actorName, context: modelContext)
        
        try? modelContext.save()
        dismiss()
    }
}

// MARK: - Supporting Types

enum TeamSide: String, Codable {
    case teamA
    case teamB
}

struct PlayerDragData: Codable, Transferable {
    let playerId: UUID
    let playerName: String
    let handicap: Double
    let team: TeamSide
    
    init(player: Player, team: TeamSide) {
        self.playerId = player.id
        self.playerName = player.name
        self.handicap = player.handicapIndex
        self.team = team
    }
    
    var player: Player {
        // Note: This creates a stub - in real use, lookup from context
        Player(id: playerId, name: playerName, handicapIndex: handicap)
    }
    
    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .json)
    }
}

// MARK: - Player Chip

struct PlayerChip: View {
    let player: Player
    let teamColor: Color
    var isCompact: Bool = false
    var onRemove: (() -> Void)? = nil
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Text(player.name)
                .font(isCompact ? .caption : .subheadline)
                .fontWeight(.medium)
                .lineLimit(1)
            
            Text(player.formattedHandicap)
                .font(.caption2)
                .foregroundColor(.secondary)
            
            if let onRemove = onRemove {
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(teamColor.opacity(0.2))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(teamColor.opacity(0.5), lineWidth: 1)
        )
    }
}

// MARK: - Match Slot View

struct MatchSlotView: View {
    let matchIndex: Int
    let pairing: LineupBuilderView.MatchPairing
    let playersPerTeam: Int
    let teamAName: String
    let teamBName: String
    let isLocked: Bool
    let onLockToggle: () -> Void
    let onRemovePlayer: (TeamSide, Int) -> Void
    let onDrop: (PlayerDragData, TeamSide) -> Void
    let onDelete: () -> Void
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            // Header
            HStack {
                Text("Match \(matchIndex)")
                    .font(.subheadline.weight(.semibold))
                
                if isLocked {
                    Image(systemName: "lock.fill")
                        .font(.caption)
                        .foregroundColor(.warning)
                }
                
                Spacer()
                
                HStack(spacing: DesignTokens.Spacing.md) {
                    Button(action: onLockToggle) {
                        Image(systemName: isLocked ? "lock.fill" : "lock.open")
                            .font(.caption)
                            .foregroundColor(isLocked ? .warning : .secondary)
                    }
                    
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundColor(.error)
                    }
                }
            }
            
            // Players
            HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                // Team A
                teamSlot(
                    players: pairing.teamAPlayers,
                    team: .teamA,
                    teamColor: .teamUSA,
                    teamName: teamAName
                )
                
                Text("vs")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
                    .padding(.top, DesignTokens.Spacing.lg)
                
                // Team B
                teamSlot(
                    players: pairing.teamBPlayers,
                    team: .teamB,
                    teamColor: .teamEurope,
                    teamName: teamBName
                )
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                .stroke(isLocked ? Color.warning.opacity(0.5) : Color.clear, lineWidth: 2)
        )
    }
    
    @ViewBuilder
    private func teamSlot(
        players: [Player],
        team: TeamSide,
        teamColor: Color,
        teamName: String
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(teamName)
                .font(.caption.weight(.medium))
                .foregroundColor(teamColor)
            
            VStack(spacing: DesignTokens.Spacing.xs) {
                ForEach(Array(players.enumerated()), id: \.element.id) { index, player in
                    PlayerChip(
                        player: player,
                        teamColor: teamColor,
                        onRemove: isLocked ? nil : { onRemovePlayer(team, index) }
                    )
                }
                
                // Empty slots
                let emptySlots = playersPerTeam - players.count
                if emptySlots > 0 && !isLocked {
                    ForEach(0..<emptySlots, id: \.self) { _ in
                        DropSlot(teamColor: teamColor) { data in
                            onDrop(data, team)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Drop Slot

struct DropSlot: View {
    let teamColor: Color
    let onDrop: (PlayerDragData) -> Void
    
    @State private var isTargeted = false
    
    var body: some View {
        RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm)
            .strokeBorder(
                style: StrokeStyle(lineWidth: 2, dash: [6, 3])
            )
            .foregroundColor(isTargeted ? teamColor : teamColor.opacity(0.3))
            .frame(height: 32)
            .overlay(
                Text("Drop player here")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            )
            .dropDestination(for: PlayerDragData.self) { items, _ in
                if let item = items.first {
                    onDrop(item)
                    return true
                }
                return false
            } isTargeted: { targeted in
                withAnimation(.easeInOut(duration: 0.15)) {
                    isTargeted = targeted
                }
            }
    }
}

// MARK: - Fairness Score Badge

struct FairnessScoreBadge: View {
    let score: LineupAutoFillService.FairnessScore
    
    private var scoreColor: Color {
        if score.score >= 80 { return .success }
        if score.score >= 60 { return .warning }
        return .error
    }
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "scale.3d")
                .font(.caption)
            Text("Fairness: \(score.score)")
                .font(.caption.weight(.semibold))
        }
        .foregroundColor(scoreColor)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(scoreColor.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Fairness Details View

struct FairnessDetailsView: View {
    let fairness: LineupAutoFillService.FairnessScore
    
    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let advantageTeam = fairness.advantageTeam {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "info.circle")
                        .font(.caption)
                    Text("Favors \(advantageTeam) by ~\(String(format: "%.1f", abs(fairness.strokesAdvantage))) strokes")
                        .font(.caption)
                }
                .foregroundColor(.warning)
            }
            
            ForEach(fairness.drivers.prefix(3)) { driver in
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Circle()
                        .fill(driverColor(driver.severity))
                        .frame(width: 6, height: 6)
                    Text("\(driver.factor): \(driver.impact)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(DesignTokens.Spacing.sm)
        .background(Color.surfaceElevated)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
    }
    
    private func driverColor(_ severity: LineupAutoFillService.FairnessScore.FairnessDriver.Severity) -> Color {
        switch severity {
        case .low: return .success
        case .medium: return .warning
        case .high: return .error
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                      y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }
                
                positions.append(CGPoint(x: x, y: y))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }
            
            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}

#Preview {
    LineupBuilderView(
        session: RyderCupSession(name: "Test", sessionType: .fourball, scheduledDate: Date()),
        trip: Trip(name: "Test Trip", startDate: Date(), endDate: Date())
    )
}
