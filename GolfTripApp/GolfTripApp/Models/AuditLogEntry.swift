import Foundation
import SwiftData

/// Type of auditable action in the app
enum AuditActionType: String, Codable, CaseIterable {
    case sessionCreated = "session_created"
    case sessionLocked = "session_locked"
    case sessionUnlocked = "session_unlocked"
    case pairingCreated = "pairing_created"
    case pairingEdited = "pairing_edited"
    case pairingDeleted = "pairing_deleted"
    case lineupPublished = "lineup_published"
    case matchStarted = "match_started"
    case matchFinalized = "match_finalized"
    case scoreEntered = "score_entered"
    case scoreEdited = "score_edited"
    case scoreUndone = "score_undone"
    case captainModeEnabled = "captain_mode_enabled"
    case captainModeDisabled = "captain_mode_disabled"
    
    var displayName: String {
        switch self {
        case .sessionCreated: return "Session Created"
        case .sessionLocked: return "Session Locked"
        case .sessionUnlocked: return "Session Unlocked"
        case .pairingCreated: return "Pairing Created"
        case .pairingEdited: return "Pairing Edited"
        case .pairingDeleted: return "Pairing Deleted"
        case .lineupPublished: return "Lineup Published"
        case .matchStarted: return "Match Started"
        case .matchFinalized: return "Match Finalized"
        case .scoreEntered: return "Score Entered"
        case .scoreEdited: return "Score Edited"
        case .scoreUndone: return "Score Undone"
        case .captainModeEnabled: return "Captain Mode Enabled"
        case .captainModeDisabled: return "Captain Mode Disabled"
        }
    }
    
    var iconName: String {
        switch self {
        case .sessionCreated: return "plus.circle"
        case .sessionLocked: return "lock.fill"
        case .sessionUnlocked: return "lock.open.fill"
        case .pairingCreated: return "person.2.badge.plus"
        case .pairingEdited: return "pencil.circle"
        case .pairingDeleted: return "person.2.badge.minus"
        case .lineupPublished: return "megaphone.fill"
        case .matchStarted: return "play.circle.fill"
        case .matchFinalized: return "checkmark.seal.fill"
        case .scoreEntered: return "number.circle"
        case .scoreEdited: return "pencil"
        case .scoreUndone: return "arrow.uturn.backward"
        case .captainModeEnabled: return "crown.fill"
        case .captainModeDisabled: return "crown"
        }
    }
    
    var isCritical: Bool {
        switch self {
        case .sessionLocked, .sessionUnlocked, .pairingEdited, .pairingDeleted, 
             .matchFinalized, .scoreEdited, .scoreUndone:
            return true
        default:
            return false
        }
    }
}

/// Audit log entry for tracking critical actions
@Model
final class AuditLogEntry {
    var id: UUID
    var actionType: AuditActionType
    var timestamp: Date
    var actorName: String  // Who performed the action (captain name or "System")
    var summary: String    // Human-readable summary
    var details: String?   // Optional JSON or additional context
    var relatedEntityId: String?  // Session ID, Match ID, etc.
    var relatedEntityType: String?  // "session", "match", "pairing"
    
    // Relationships
    var trip: Trip?
    
    init(
        id: UUID = UUID(),
        actionType: AuditActionType,
        timestamp: Date = Date(),
        actorName: String = "Captain",
        summary: String,
        details: String? = nil,
        relatedEntityId: String? = nil,
        relatedEntityType: String? = nil
    ) {
        self.id = id
        self.actionType = actionType
        self.timestamp = timestamp
        self.actorName = actorName
        self.summary = summary
        self.details = details
        self.relatedEntityId = relatedEntityId
        self.relatedEntityType = relatedEntityType
    }
}

extension AuditLogEntry {
    /// Formatted timestamp for display
    var formattedTimestamp: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: timestamp)
    }
    
    /// Relative time string
    var relativeTime: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: timestamp, relativeTo: Date())
    }
    
    // MARK: - Factory Methods
    
    /// Create audit entry for session lock
    static func sessionLocked(session: RyderCupSession, actorName: String) -> AuditLogEntry {
        AuditLogEntry(
            actionType: .sessionLocked,
            actorName: actorName,
            summary: "Locked \(session.displayTitle) - editing disabled",
            relatedEntityId: session.id.uuidString,
            relatedEntityType: "session"
        )
    }
    
    /// Create audit entry for session unlock
    static func sessionUnlocked(session: RyderCupSession, actorName: String, reason: String? = nil) -> AuditLogEntry {
        let summary = reason != nil 
            ? "Unlocked \(session.displayTitle): \(reason!)"
            : "Unlocked \(session.displayTitle) for editing"
        return AuditLogEntry(
            actionType: .sessionUnlocked,
            actorName: actorName,
            summary: summary,
            relatedEntityId: session.id.uuidString,
            relatedEntityType: "session"
        )
    }
    
    /// Create audit entry for pairing edit
    static func pairingEdited(match: Match, changeDescription: String, actorName: String) -> AuditLogEntry {
        AuditLogEntry(
            actionType: .pairingEdited,
            actorName: actorName,
            summary: "Match \(match.matchOrder): \(changeDescription)",
            relatedEntityId: match.id.uuidString,
            relatedEntityType: "match"
        )
    }
    
    /// Create audit entry for score edit
    static func scoreEdited(match: Match, holeNumber: Int, oldResult: String, newResult: String, actorName: String) -> AuditLogEntry {
        AuditLogEntry(
            actionType: .scoreEdited,
            actorName: actorName,
            summary: "Match \(match.matchOrder), Hole \(holeNumber): \(oldResult) → \(newResult)",
            details: "{\"hole\": \(holeNumber), \"old\": \"\(oldResult)\", \"new\": \"\(newResult)\"}",
            relatedEntityId: match.id.uuidString,
            relatedEntityType: "match"
        )
    }
    
    /// Create audit entry for lineup published
    static func lineupPublished(session: RyderCupSession, actorName: String) -> AuditLogEntry {
        AuditLogEntry(
            actionType: .lineupPublished,
            actorName: actorName,
            summary: "Published lineup for \(session.displayTitle)",
            relatedEntityId: session.id.uuidString,
            relatedEntityType: "session"
        )
    }
    
    /// Create audit entry for match finalized
    static func matchFinalized(match: Match, result: String, actorName: String) -> AuditLogEntry {
        AuditLogEntry(
            actionType: .matchFinalized,
            actorName: actorName,
            summary: "Match \(match.matchOrder) finalized: \(result)",
            relatedEntityId: match.id.uuidString,
            relatedEntityType: "match"
        )
    }
}
