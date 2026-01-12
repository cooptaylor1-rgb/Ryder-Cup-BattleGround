import Foundation
import SwiftData

/// Action types for audit logging
enum AuditAction: String, Codable {
    case sessionLocked = "session_locked"
    case sessionUnlocked = "session_unlocked"
    case pairingChanged = "pairing_changed"
    case matchScoreEdited = "match_score_edited"
    case matchFinalized = "match_finalized"
    case lineupPublished = "lineup_published"
    
    var displayName: String {
        switch self {
        case .sessionLocked: return "Session Locked"
        case .sessionUnlocked: return "Session Unlocked"
        case .pairingChanged: return "Pairing Changed"
        case .matchScoreEdited: return "Score Edited"
        case .matchFinalized: return "Match Finalized"
        case .lineupPublished: return "Lineup Published"
        }
    }
    
    var iconName: String {
        switch self {
        case .sessionLocked: return "lock.fill"
        case .sessionUnlocked: return "lock.open.fill"
        case .pairingChanged: return "arrow.left.arrow.right"
        case .matchScoreEdited: return "pencil"
        case .matchFinalized: return "checkmark.circle.fill"
        case .lineupPublished: return "megaphone.fill"
        }
    }
}

/// Audit log entry for tracking critical captain actions
@Model
final class AuditLog {
    var id: UUID
    var action: AuditAction
    var entityType: String  // "Session", "Match", etc.
    var entityId: String   // UUID as string
    var details: String?   // JSON or human-readable description
    var timestamp: Date
    
    // Relationship
    var trip: Trip?
    
    init(
        id: UUID = UUID(),
        action: AuditAction,
        entityType: String,
        entityId: String,
        details: String? = nil,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.action = action
        self.entityType = entityType
        self.entityId = entityId
        self.details = details
        self.timestamp = timestamp
    }
}

extension AuditLog {
    /// Static formatter for better performance
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter
    }()
    
    /// Formatted timestamp for display
    var formattedTimestamp: String {
        Self.dateFormatter.string(from: timestamp)
    }
    
    /// Display text for the log entry
    var displayText: String {
        var text = action.displayName
        if let details = details, !details.isEmpty {
            text += " - \(details)"
        }
        return text
    }
}
