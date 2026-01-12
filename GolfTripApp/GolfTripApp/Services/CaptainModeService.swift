import Foundation
import SwiftData

/// Service for managing captain mode features including locks, validation, and audit logging
struct CaptainModeService {
    
    // MARK: - Session Validation
    
    /// Validate if session can be edited
    /// - Parameter session: The session to check
    /// - Returns: Tuple with canEdit flag and optional reason message
    static func canEditSession(_ session: RyderCupSession) -> (canEdit: Bool, reason: String?) {
        // If any match has started, session should be locked
        let hasStartedMatches = session.matches?.contains { 
            $0.status == .inProgress || $0.status == .final 
        } ?? false
        
        if hasStartedMatches && !session.isLocked {
            return (false, "Cannot edit session: matches have started. Lock session first.")
        }
        
        if session.isLocked {
            return (false, "Session is locked. Unlock to make changes.")
        }
        
        return (true, nil)
    }
    
    // MARK: - Pairing Validation
    
    /// Validate pairing before allowing match setup
    /// - Parameters:
    ///   - match: The match to validate
    ///   - session: The session containing the match
    ///   - allPlayers: All available players for validation
    /// - Returns: Array of error messages (empty if valid)
    static func validatePairing(match: Match, session: RyderCupSession, allPlayers: [Player]) -> [String] {
        var errors: [String] = []
        
        // Check player counts
        let expectedCount = session.sessionType.playersPerTeam
        if match.teamAIds.count != expectedCount {
            errors.append("Team A needs \(expectedCount) player(s)")
        }
        if match.teamBIds.count != expectedCount {
            errors.append("Team B needs \(expectedCount) player(s)")
        }
        
        // Check for duplicates in same match
        let allIds = match.teamAIds + match.teamBIds
        if Set(allIds).count != allIds.count {
            errors.append("Duplicate player in same match")
        }
        
        // Validate player IDs exist
        let allPlayerIds = Set(allPlayers.map { $0.id })
        let matchPlayerIds = Set(allIds)
        let invalidIds = matchPlayerIds.subtracting(allPlayerIds)
        if !invalidIds.isEmpty {
            errors.append("\(invalidIds.count) invalid player ID(s)")
        }
        
        return errors
    }
    
    // MARK: - Duplicate Detection
    
    /// Check for duplicate players across session
    /// - Parameter session: The session to check
    /// - Returns: Dictionary mapping player ID to occurrence count (only players appearing > 1 time)
    static func findDuplicatesInSession(_ session: RyderCupSession) -> [UUID: Int] {
        var playerCounts: [UUID: Int] = [:]
        
        for match in session.sortedMatches {
            for playerId in match.teamAIds + match.teamBIds {
                playerCounts[playerId, default: 0] += 1
            }
        }
        
        return playerCounts.filter { $0.value > 1 }
    }
    
    /// Get list of duplicate player warnings
    /// - Parameters:
    ///   - session: The session to check
    ///   - players: All players for name lookup
    /// - Returns: Array of warning messages
    static func getDuplicateWarnings(session: RyderCupSession, players: [Player]) -> [String] {
        let duplicates = findDuplicatesInSession(session)
        guard !duplicates.isEmpty else { return [] }
        
        let playerMap = Dictionary(uniqueKeysWithValues: players.map { ($0.id, $0.name) })
        
        return duplicates.map { playerId, count in
            let name = playerMap[playerId] ?? "Unknown Player"
            return "\(name) appears in \(count) matches"
        }
    }
    
    // MARK: - Audit Logging
    
    /// Log captain action to audit trail
    /// - Parameters:
    ///   - action: The action type
    ///   - entityType: Type of entity ("Session", "Match", etc.)
    ///   - entityId: UUID of the entity
    ///   - details: Optional details string
    ///   - trip: The trip to associate the log with
    ///   - modelContext: SwiftData model context
    static func logAction(
        action: AuditAction,
        entityType: String,
        entityId: UUID,
        details: String?,
        trip: Trip,
        modelContext: ModelContext
    ) {
        let log = AuditLog(
            action: action,
            entityType: entityType,
            entityId: entityId.uuidString,
            details: details
        )
        log.trip = trip
        modelContext.insert(log)
        try? modelContext.save()
    }
    
    // MARK: - Lock Management
    
    /// Toggle session lock state with validation
    /// - Parameters:
    ///   - session: The session to lock/unlock
    ///   - trip: The trip for audit logging
    ///   - modelContext: SwiftData model context
    /// - Returns: True if successful, false if operation not allowed
    @discardableResult
    static func toggleLock(
        session: RyderCupSession,
        trip: Trip,
        modelContext: ModelContext
    ) -> Bool {
        let newLockState = !session.isLocked
        
        // If unlocking, verify no matches are in progress
        if !newLockState {
            let hasActiveMatches = session.matches?.contains { 
                $0.status == .inProgress 
            } ?? false
            
            if hasActiveMatches {
                return false // Cannot unlock with active matches
            }
        }
        
        // Update lock state
        session.isLocked = newLockState
        session.updatedAt = Date()
        
        // Log the action
        logAction(
            action: newLockState ? .sessionLocked : .sessionUnlocked,
            entityType: "Session",
            entityId: session.id,
            details: session.name,
            trip: trip,
            modelContext: modelContext
        )
        
        return true
    }
    
    // MARK: - Course Validation
    
    /// Validate that match has required course data
    /// - Parameter match: The match to validate
    /// - Returns: Array of warning messages
    static func validateMatchCourse(_ match: Match) -> [String] {
        var warnings: [String] = []
        
        if match.course == nil {
            warnings.append("No course assigned")
        }
        
        if match.teeSet == nil {
            warnings.append("No tee set assigned")
        }
        
        if let teeSet = match.teeSet {
            if teeSet.holeHandicaps.isEmpty {
                warnings.append("Course missing hole handicaps")
            }
        }
        
        return warnings
    }
}
