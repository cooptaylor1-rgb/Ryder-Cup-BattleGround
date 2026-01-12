import Foundation
import SwiftData

/// Validation result for session data integrity
struct SessionValidationResult {
    var isValid: Bool
    var errors: [ValidationError]
    var warnings: [ValidationWarning]
    
    var canStart: Bool {
        // Can only start if no blocking errors exist
        errors.filter { $0.isBlocking }.isEmpty
    }
    
    struct ValidationError: Identifiable {
        let id = UUID()
        let message: String
        let fix: String
        let isBlocking: Bool  // If true, session cannot start
        
        static func blocking(_ message: String, fix: String) -> ValidationError {
            ValidationError(message: message, fix: fix, isBlocking: true)
        }
        
        static func nonBlocking(_ message: String, fix: String) -> ValidationError {
            ValidationError(message: message, fix: fix, isBlocking: false)
        }
    }
    
    struct ValidationWarning: Identifiable {
        let id = UUID()
        let message: String
        let suggestion: String
    }
}

/// Service for Captain Mode features: locking, validation, audit logging
final class CaptainModeService {
    
    // MARK: - Singleton
    static let shared = CaptainModeService()
    private init() {}
    
    // MARK: - Session Locking
    
    /// Check if a session should be auto-locked (any match has started scoring)
    func shouldAutoLock(session: RyderCupSession) -> Bool {
        guard let matches = session.matches else { return false }
        return matches.contains { $0.status == .inProgress || $0.status == .final }
    }
    
    /// Lock a session (prevent editing)
    func lockSession(
        _ session: RyderCupSession,
        actorName: String,
        context: ModelContext
    ) -> AuditLogEntry {
        session.isLocked = true
        session.updatedAt = Date()
        
        let auditEntry = AuditLogEntry.sessionLocked(session: session, actorName: actorName)
        context.insert(auditEntry)
        auditEntry.trip = session.trip
        
        return auditEntry
    }
    
    /// Unlock a session (enable editing)
    func unlockSession(
        _ session: RyderCupSession,
        actorName: String,
        reason: String?,
        context: ModelContext
    ) -> AuditLogEntry {
        session.isLocked = false
        session.updatedAt = Date()
        
        let auditEntry = AuditLogEntry.sessionUnlocked(session: session, actorName: actorName, reason: reason)
        context.insert(auditEntry)
        auditEntry.trip = session.trip
        
        return auditEntry
    }
    
    /// Check if session can be edited
    func canEditSession(_ session: RyderCupSession) -> (canEdit: Bool, reason: String?) {
        if session.isLocked {
            return (false, "Session is locked. Unlock to make changes.")
        }
        
        if shouldAutoLock(session: session) && !session.isLocked {
            return (false, "Scoring has started. Lock session for safety or proceed with caution.")
        }
        
        return (true, nil)
    }
    
    // MARK: - Data Validation
    
    /// Validate session before starting
    func validateSessionForStart(
        session: RyderCupSession,
        teamAPlayers: [Player],
        teamBPlayers: [Player]
    ) -> SessionValidationResult {
        var errors: [SessionValidationResult.ValidationError] = []
        var warnings: [SessionValidationResult.ValidationWarning] = []
        
        let matches = session.sortedMatches
        let playersPerTeam = session.sessionType.playersPerTeam
        
        // Check 1: All matches have correct player counts
        for (index, match) in matches.enumerated() {
            if match.teamAIds.count != playersPerTeam {
                errors.append(.blocking(
                    "Match \(index + 1) needs \(playersPerTeam) Team A player\(playersPerTeam > 1 ? "s" : "")",
                    fix: "Add players to Match \(index + 1)"
                ))
            }
            if match.teamBIds.count != playersPerTeam {
                errors.append(.blocking(
                    "Match \(index + 1) needs \(playersPerTeam) Team B player\(playersPerTeam > 1 ? "s" : "")",
                    fix: "Add players to Match \(index + 1)"
                ))
            }
        }
        
        // Check 2: No duplicate players in session (same team)
        let duplicates = findDuplicatePlayers(in: session)
        for dup in duplicates {
            if dup.sameTeam {
                errors.append(.blocking(
                    "\(dup.playerName) appears in multiple \(dup.team) matches",
                    fix: "Remove duplicate from one match"
                ))
            } else {
                errors.append(.blocking(
                    "\(dup.playerName) is assigned to both teams",
                    fix: "Remove from one team's matches"
                ))
            }
        }
        
        // Check 3: Hole handicaps exist for course
        for match in matches {
            if let teeSet = match.teeSet {
                if teeSet.holeHandicaps.isEmpty || teeSet.holeHandicaps.count != 18 {
                    errors.append(.blocking(
                        "Missing hole handicaps for \(match.course?.name ?? "course")",
                        fix: "Set up hole handicaps in Course settings"
                    ))
                    break // Only need to report once per session
                }
            } else if match.course != nil {
                warnings.append(SessionValidationResult.ValidationWarning(
                    message: "Match \(match.matchOrder) has no tee set selected",
                    suggestion: "Select a tee set for accurate handicap strokes"
                ))
            }
        }
        
        // Check 4: Team membership consistency
        let membershipIssues = validateTeamMembership(
            matches: matches,
            teamAPlayers: teamAPlayers,
            teamBPlayers: teamBPlayers
        )
        for issue in membershipIssues {
            errors.append(.nonBlocking(
                issue,
                fix: "Check team rosters or remove player from match"
            ))
        }
        
        // Check 5: Handicap allowances calculated
        for match in matches where match.teamAHandicapAllowance == 0 && match.teamBHandicapAllowance == 0 {
            let hasPlayers = !match.teamAIds.isEmpty && !match.teamBIds.isEmpty
            if hasPlayers {
                warnings.append(SessionValidationResult.ValidationWarning(
                    message: "Match \(match.matchOrder) handicap strokes not calculated",
                    suggestion: "Calculate handicap allowances before starting"
                ))
            }
        }
        
        // Check 6: At least one match exists
        if matches.isEmpty {
            errors.append(.blocking(
                "No matches in this session",
                fix: "Create at least one match"
            ))
        }
        
        return SessionValidationResult(
            isValid: errors.isEmpty,
            errors: errors,
            warnings: warnings
        )
    }
    
    // MARK: - Duplicate Detection
    
    struct DuplicatePlayer {
        let playerId: UUID
        let playerName: String
        let team: String
        let sameTeam: Bool
    }
    
    /// Find players appearing multiple times in a session
    func findDuplicatePlayers(in session: RyderCupSession) -> [DuplicatePlayer] {
        var duplicates: [DuplicatePlayer] = []
        var teamAAppearances: [UUID: Int] = [:]
        var teamBAppearances: [UUID: Int] = [:]
        
        for match in session.sortedMatches {
            for id in match.teamAIds {
                teamAAppearances[id, default: 0] += 1
            }
            for id in match.teamBIds {
                teamBAppearances[id, default: 0] += 1
            }
        }
        
        // Find duplicates within Team A
        for (id, count) in teamAAppearances where count > 1 {
            duplicates.append(DuplicatePlayer(
                playerId: id,
                playerName: "Player", // Would need context to get name
                team: "Team A",
                sameTeam: true
            ))
        }
        
        // Find duplicates within Team B
        for (id, count) in teamBAppearances where count > 1 {
            duplicates.append(DuplicatePlayer(
                playerId: id,
                playerName: "Player",
                team: "Team B",
                sameTeam: true
            ))
        }
        
        // Find players on both teams
        let teamASet = Set(teamAAppearances.keys)
        let teamBSet = Set(teamBAppearances.keys)
        let crossTeam = teamASet.intersection(teamBSet)
        for id in crossTeam {
            duplicates.append(DuplicatePlayer(
                playerId: id,
                playerName: "Player",
                team: "Both Teams",
                sameTeam: false
            ))
        }
        
        return duplicates
    }
    
    // MARK: - Team Membership Validation
    
    /// Check that players in matches belong to their respective teams
    func validateTeamMembership(
        matches: [Match],
        teamAPlayers: [Player],
        teamBPlayers: [Player]
    ) -> [String] {
        var issues: [String] = []
        
        let teamAIds = Set(teamAPlayers.map { $0.id })
        let teamBIds = Set(teamBPlayers.map { $0.id })
        
        for match in matches {
            for id in match.teamAIds {
                if !teamAIds.contains(id) {
                    let name = teamBPlayers.first { $0.id == id }?.name ?? "Unknown player"
                    issues.append("\(name) is in Team A match but not on Team A roster")
                }
            }
            
            for id in match.teamBIds {
                if !teamBIds.contains(id) {
                    let name = teamAPlayers.first { $0.id == id }?.name ?? "Unknown player"
                    issues.append("\(name) is in Team B match but not on Team B roster")
                }
            }
        }
        
        return issues
    }
    
    // MARK: - Audit Logging
    
    /// Log a pairing change
    func logPairingChange(
        match: Match,
        changeDescription: String,
        actorName: String,
        context: ModelContext
    ) -> AuditLogEntry {
        let entry = AuditLogEntry.pairingEdited(
            match: match,
            changeDescription: changeDescription,
            actorName: actorName
        )
        context.insert(entry)
        entry.trip = match.session?.trip
        return entry
    }
    
    /// Log a score edit
    func logScoreEdit(
        match: Match,
        holeNumber: Int,
        oldResult: HoleWinner,
        newResult: HoleWinner,
        actorName: String,
        context: ModelContext
    ) -> AuditLogEntry {
        let entry = AuditLogEntry.scoreEdited(
            match: match,
            holeNumber: holeNumber,
            oldResult: oldResult.displayName,
            newResult: newResult.displayName,
            actorName: actorName
        )
        context.insert(entry)
        entry.trip = match.session?.trip
        return entry
    }
    
    /// Log a lineup publish
    func logLineupPublish(
        session: RyderCupSession,
        actorName: String,
        context: ModelContext
    ) -> AuditLogEntry {
        let entry = AuditLogEntry.lineupPublished(session: session, actorName: actorName)
        context.insert(entry)
        entry.trip = session.trip
        return entry
    }
    
    /// Log match finalization
    func logMatchFinalized(
        match: Match,
        actorName: String,
        context: ModelContext
    ) -> AuditLogEntry {
        let entry = AuditLogEntry.matchFinalized(
            match: match,
            result: match.resultString,
            actorName: actorName
        )
        context.insert(entry)
        entry.trip = match.session?.trip
        return entry
    }
    
    // MARK: - Captain Mode State
    
    /// Check if captain mode actions are available
    func captainActionsAvailable(for trip: Trip) -> Bool {
        // Captain actions are always available if there's at least one team set up
        return trip.teamA != nil && trip.teamB != nil
    }
    
    /// Get summary of session states for a trip
    func sessionStateSummary(for trip: Trip) -> (locked: Int, live: Int, total: Int) {
        let sessions = trip.sortedSessions
        let locked = sessions.filter { $0.isLocked }.count
        let live = sessions.filter { session in
            session.sortedMatches.contains { $0.status == .inProgress }
        }.count
        return (locked, live, sessions.count)
    }
}
