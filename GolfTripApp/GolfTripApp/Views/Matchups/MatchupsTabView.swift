import SwiftUI
import SwiftData

/// Matchups tab - Session and pairing management
struct MatchupsTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    @Query(sort: \RyderCupSession.scheduledDate) private var sessions: [RyderCupSession]
    @State private var showSessionForm = false
    @State private var selectedSession: RyderCupSession?
    @State private var showAuditLog = false
    @State private var sessionToLock: RyderCupSession?
    @State private var sessionToValidate: RyderCupSession?
    @State private var validationResult: SessionValidationResult?
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    var body: some View {
        NavigationStack {
            Group {
                if let trip = currentTrip {
                    sessionsList(trip)
                } else {
                    EmptyStateView(
                        icon: "rectangle.grid.2x2",
                        title: "No Trip",
                        description: "Create a trip first to manage matchups."
                    )
                }
            }
            .navigationTitle("Matchups")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if let trip = currentTrip, trip.isCaptainModeEnabled {
                        Menu {
                            Button(action: { showAuditLog = true }) {
                                Label("Activity Log", systemImage: "doc.text")
                            }
                        } label: {
                            Image(systemName: "crown.fill")
                                .foregroundColor(.secondaryGold)
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showSessionForm = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showSessionForm) {
                SessionFormView(trip: currentTrip)
            }
            .sheet(item: $selectedSession) { session in
                SessionDetailView(session: session)
            }
            .sheet(isPresented: $showAuditLog) {
                if let trip = currentTrip {
                    AuditLogView(trip: trip)
                }
            }
            .sheet(item: $sessionToLock) { session in
                if let trip = currentTrip {
                    SessionLockView(session: session, trip: trip)
                }
            }
            .sheet(isPresented: Binding(
                get: { validationResult != nil },
                set: { if !$0 { validationResult = nil; sessionToValidate = nil } }
            )) {
                if let validation = validationResult {
                    SessionValidationView(
                        validation: validation,
                        onDismiss: { validationResult = nil; sessionToValidate = nil },
                        onProceed: validation.canStart ? {
                            // Start first match in session
                            if let session = sessionToValidate,
                               let firstMatch = session.sortedMatches.first(where: { $0.status == .scheduled }) {
                                firstMatch.status = .inProgress
                                try? modelContext.save()
                            }
                            validationResult = nil
                            sessionToValidate = nil
                        } : nil
                    )
                }
            }
        }
    }
    
    @ViewBuilder
    private func sessionsList(_ trip: Trip) -> some View {
        let tripSessions = trip.sortedSessions
        
        if tripSessions.isEmpty {
            EmptyStateView(
                icon: "rectangle.grid.2x2",
                title: "No Sessions",
                description: "Add your first session (Foursomes, Fourball, or Singles) to start building matchups.",
                actionTitle: "Add Session",
                action: { showSessionForm = true }
            )
        } else {
            List {
                ForEach(tripSessions, id: \.id) { session in
                    sessionCard(session, trip: trip)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .onTapGesture {
                            selectedSession = session
                        }
                }
                .onDelete { indexSet in
                    deleteSession(at: indexSet, from: tripSessions)
                }
            }
            .listStyle(.plain)
        }
    }
    
    @ViewBuilder
    private func sessionCard(_ session: RyderCupSession, trip: Trip) -> some View {
        let hasLiveScoring = CaptainModeService.shared.shouldAutoLock(session: session)
        
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text(session.displayTitle)
                        .font(.headline)
                    
                    Text(formatDate(session.scheduledDate))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Lock/Status badge
                if session.isComplete {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text("\(String(format: "%.1f", session.teamAPoints))")
                            .foregroundColor(.teamUSA)
                        Text("-")
                            .foregroundColor(.secondary)
                        Text("\(String(format: "%.1f", session.teamBPoints))")
                            .foregroundColor(.teamEurope)
                    }
                    .font(.subheadline.weight(.semibold))
                } else {
                    SessionLockBadge(isLocked: session.isLocked, hasLiveScoring: hasLiveScoring)
                        .onTapGesture {
                            sessionToLock = session
                        }
                }
            }
                    .font(.subheadline.weight(.semibold))
                } else if session.isLocked {
                    Image(systemName: "lock.fill")
                        .foregroundColor(.secondary)
                }
            }
            
            // Matches summary
            let matches = session.sortedMatches
            if matches.isEmpty {
                Text("No matches set")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(matches.prefix(3), id: \.id) { match in
                        matchSummaryRow(match, trip: trip)
                    }
                    
                    if matches.count > 3 {
                        Text("+\(matches.count - 3) more matches")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Footer with validation
            HStack {
                Text("\(matches.count) matches • \(String(format: "%.0f", session.totalPointsAvailable)) points")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if !session.isComplete && !matches.isEmpty {
                    Button {
                        validateAndStart(session: session, trip: trip)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.shield")
                            Text("Validate")
                        }
                        .font(.caption.weight(.medium))
                        .foregroundColor(.accentColor)
                    }
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .cardStyle()
    }
    
    private func validateAndStart(session: RyderCupSession, trip: Trip) {
        let teamAPlayers = trip.teamA?.players ?? []
        let teamBPlayers = trip.teamB?.players ?? []
        
        let result = CaptainModeService.shared.validateSessionForStart(
            session: session,
            teamAPlayers: teamAPlayers,
            teamBPlayers: teamBPlayers
        )
        
        sessionToValidate = session
        validationResult = result
    }
    
    @ViewBuilder
    private func matchSummaryRow(_ match: Match, trip: Trip) -> some View {
        HStack {
            // Team A players
            HStack(spacing: -8) {
                ForEach(Array(match.teamAIds.prefix(2)), id: \.self) { _ in
                    Circle()
                        .fill(Color.teamUSA.opacity(0.3))
                        .frame(width: 24, height: 24)
                        .overlay(
                            Circle()
                                .stroke(Color.teamUSA, lineWidth: 1)
                        )
                }
            }
            
            Text("vs")
                .font(.caption)
                .foregroundColor(.secondary)
            
            // Team B players
            HStack(spacing: -8) {
                ForEach(Array(match.teamBIds.prefix(2)), id: \.self) { _ in
                    Circle()
                        .fill(Color.teamEurope.opacity(0.3))
                        .frame(width: 24, height: 24)
                        .overlay(
                            Circle()
                                .stroke(Color.teamEurope, lineWidth: 1)
                        )
                }
            }
            
            Spacer()
            
            // Status
            statusBadge(match)
        }
    }
    
    @ViewBuilder
    private func statusBadge(_ match: Match) -> some View {
        let (text, color): (String, Color) = {
            switch match.status {
            case .scheduled:
                return ("Not Started", .secondary)
            case .inProgress:
                return ("Hole \(match.currentHole)", .info)
            case .final:
                return (match.resultString, match.result == .teamAWin ? .teamUSA : (match.result == .teamBWin ? .teamEurope : .secondary))
            case .cancelled:
                return ("Cancelled", .error)
            }
        }()
        
        Text(text)
            .font(.caption2.weight(.medium))
            .foregroundColor(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
    
    private func deleteSession(at offsets: IndexSet, from sessions: [RyderCupSession]) {
        for index in offsets {
            let session = sessions[index]
            modelContext.delete(session)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Session Form

struct SessionFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    let trip: Trip?
    
    @State private var name = ""
    @State private var sessionType: SessionType = .fourball
    @State private var scheduledDate = Date()
    @State private var timeSlot = "AM"
    @State private var pointsPerMatch: Double = 1.0
    @State private var notes = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Session Details") {
                    TextField("Session Name", text: $name)
                    
                    Picker("Format", selection: $sessionType) {
                        ForEach(SessionType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                    
                    DatePicker("Date", selection: $scheduledDate, displayedComponents: .date)
                    
                    Picker("Time Slot", selection: $timeSlot) {
                        Text("Morning (AM)").tag("AM")
                        Text("Afternoon (PM)").tag("PM")
                    }
                }
                
                Section("Scoring") {
                    Stepper(value: $pointsPerMatch, in: 0.5...3.0, step: 0.5) {
                        HStack {
                            Text("Points per Match")
                            Spacer()
                            Text("\(String(format: "%.1f", pointsPerMatch))")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(height: 80)
                }
            }
            .navigationTitle("New Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { saveSession() }
                        .disabled(name.isEmpty)
                }
            }
        }
    }
    
    private func saveSession() {
        let session = RyderCupSession(
            name: name.isEmpty ? "\(sessionType.displayName)" : name,
            sessionType: sessionType,
            scheduledDate: scheduledDate,
            timeSlot: timeSlot,
            pointsPerMatch: pointsPerMatch,
            notes: notes.isEmpty ? nil : notes
        )
        session.trip = trip
        modelContext.insert(session)
        dismiss()
    }
}

// MARK: - Session Detail

struct SessionDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var session: RyderCupSession
    @Query private var trips: [Trip]
    @Query private var players: [Player]
    
    @State private var showLineupBuilder = false
    @State private var showMatchForm = false
    @State private var showLockView = false
    
    private var currentTrip: Trip? {
        trips.first
    }
    
    var body: some View {
        NavigationStack {
            List {
                // Session info
                Section {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        HStack {
                            Text(session.sessionType.description)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            SessionLockBadge(
                                isLocked: session.isLocked,
                                hasLiveScoring: CaptainModeService.shared.shouldAutoLock(session: session)
                            )
                        }
                        
                        HStack {
                            Label("\(session.sortedMatches.count) matches", systemImage: "flag.2.crossed")
                            Spacer()
                            Label("\(String(format: "%.1f", session.totalPointsAvailable)) points", systemImage: "star")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                }
                
                // Quick Actions
                if !session.isLocked {
                    Section("Quick Actions") {
                        Button {
                            showLineupBuilder = true
                        } label: {
                            Label("Build Lineup", systemImage: "wand.and.stars")
                        }
                        
                        Button {
                            showLockView = true
                        } label: {
                            Label("Lock Session", systemImage: "lock")
                        }
                    }
                }
                
                // Matches
                Section("Matches") {
                    if session.sortedMatches.isEmpty {
                        VStack(spacing: DesignTokens.Spacing.md) {
                            Image(systemName: "rectangle.grid.2x2")
                                .font(.title)
                                .foregroundColor(.secondary)
                            Text("No matches configured")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            if !session.isLocked {
                                Button {
                                    showLineupBuilder = true
                                } label: {
                                    Text("Build Lineup")
                                        .font(.subheadline.weight(.medium))
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.lg)
                    } else {
                        ForEach(session.sortedMatches, id: \.id) { match in
                            matchDetailRow(match)
                        }
                        
                        if !session.isLocked {
                            Button(action: { showMatchForm = true }) {
                                Label("Add Match", systemImage: "plus")
                            }
                        }
                    }
                }
            }
            .navigationTitle(session.displayTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showMatchForm) {
                MatchFormView(session: session)
            }
            .sheet(isPresented: $showLineupBuilder) {
                if let trip = currentTrip {
                    LineupBuilderView(session: session, trip: trip)
                }
            }
            .sheet(isPresented: $showLockView) {
                if let trip = currentTrip {
                    SessionLockView(session: session, trip: trip)
                }
            }
        }
    }
    
    @ViewBuilder
    private func matchDetailRow(_ match: Match) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text("Match \(match.matchOrder + 1)")
                    .font(.subheadline.weight(.semibold))
                
                Spacer()
                
                statusBadgeForMatch(match)
            }
            
            // Show player names if available
            let teamANames = match.teamAIds.isEmpty ? "TBD" : "\(match.teamAIds.count) players"
            let teamBNames = match.teamBIds.isEmpty ? "TBD" : "\(match.teamBIds.count) players"
            
            Text("\(teamANames) vs \(teamBNames)")
                .font(.caption)
                .foregroundColor(.secondary)
            
            // Show result if final
            if match.status == .final {
                Text(match.resultString)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(match.result == .teamAWin ? .teamUSA : 
                                    (match.result == .teamBWin ? .teamEurope : .secondary))
            }
        }
        .padding(.vertical, 4)
    }
    
    @ViewBuilder
    private func statusBadgeForMatch(_ match: Match) -> some View {
        let (text, color): (String, Color) = {
            switch match.status {
            case .scheduled:
                return ("Scheduled", .secondary)
            case .inProgress:
                return ("Live • Hole \(match.currentHole)", .success)
            case .final:
                return ("Final", .info)
            case .cancelled:
                return ("Cancelled", .error)
            }
        }()
        
        Text(text)
            .font(.caption2.weight(.medium))
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
}

// MARK: - Match Form

struct MatchFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    let session: RyderCupSession
    @Query private var players: [Player]
    @Query private var courses: [Course]
    
    @State private var selectedTeamAPlayers: Set<UUID> = []
    @State private var selectedTeamBPlayers: Set<UUID> = []
    @State private var selectedCourse: Course?
    @State private var selectedTeeSet: TeeSet?
    @State private var startTime = Date()
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Course") {
                    Picker("Course", selection: $selectedCourse) {
                        Text("Select Course").tag(nil as Course?)
                        ForEach(courses, id: \.id) { course in
                            Text(course.name).tag(course as Course?)
                        }
                    }
                    
                    if let course = selectedCourse, !course.sortedTeeSets.isEmpty {
                        Picker("Tee Set", selection: $selectedTeeSet) {
                            Text("Select Tees").tag(nil as TeeSet?)
                            ForEach(course.sortedTeeSets, id: \.id) { teeSet in
                                Text(teeSet.name).tag(teeSet as TeeSet?)
                            }
                        }
                    }
                }
                
                Section("Start Time") {
                    DatePicker("Time", selection: $startTime, displayedComponents: .hourAndMinute)
                }
                
                Section("Team A Players (Select \(session.sessionType.playersPerTeam))") {
                    ForEach(players.prefix(players.count / 2), id: \.id) { player in
                        playerRow(player, selected: selectedTeamAPlayers.contains(player.id)) {
                            toggleTeamAPlayer(player)
                        }
                    }
                }
                
                Section("Team B Players (Select \(session.sessionType.playersPerTeam))") {
                    ForEach(players.suffix(players.count / 2), id: \.id) { player in
                        playerRow(player, selected: selectedTeamBPlayers.contains(player.id)) {
                            toggleTeamBPlayer(player)
                        }
                    }
                }
            }
            .navigationTitle("Add Match")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { saveMatch() }
                        .disabled(!isValid)
                }
            }
        }
    }
    
    @ViewBuilder
    private func playerRow(_ player: Player, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(player.name)
                Spacer()
                Text("\(String(format: "%.1f", player.handicapIndex)) HCP")
                    .font(.caption)
                    .foregroundColor(.secondary)
                if selected {
                    Image(systemName: "checkmark")
                        .foregroundColor(.accentColor)
                }
            }
        }
        .foregroundColor(.primary)
    }
    
    private func toggleTeamAPlayer(_ player: Player) {
        if selectedTeamAPlayers.contains(player.id) {
            selectedTeamAPlayers.remove(player.id)
        } else if selectedTeamAPlayers.count < session.sessionType.playersPerTeam {
            selectedTeamAPlayers.insert(player.id)
        }
    }
    
    private func toggleTeamBPlayer(_ player: Player) {
        if selectedTeamBPlayers.contains(player.id) {
            selectedTeamBPlayers.remove(player.id)
        } else if selectedTeamBPlayers.count < session.sessionType.playersPerTeam {
            selectedTeamBPlayers.insert(player.id)
        }
    }
    
    private var isValid: Bool {
        selectedTeamAPlayers.count == session.sessionType.playersPerTeam &&
        selectedTeamBPlayers.count == session.sessionType.playersPerTeam
    }
    
    private func saveMatch() {
        let match = Match(
            matchOrder: session.sortedMatches.count,
            startTime: startTime,
            teamAPlayerIds: selectedTeamAPlayers.map { $0.uuidString }.joined(separator: ","),
            teamBPlayerIds: selectedTeamBPlayers.map { $0.uuidString }.joined(separator: ",")
        )
        match.session = session
        match.course = selectedCourse
        match.teeSet = selectedTeeSet
        modelContext.insert(match)
        dismiss()
    }
}

#Preview {
    MatchupsTabView()
        .modelContainer(for: [Trip.self, Player.self, Course.self, RyderCupSession.self], inMemory: true)
}
