import Foundation
import SwiftData

/// Trip entity representing a golf trip/event
@Model
final class Trip {
    var id: UUID
    var name: String
    var startDate: Date
    var endDate: Date
    var location: String?
    var notes: String?
    var captainModeEnabled: Bool
    var createdAt: Date
    var updatedAt: Date
    
    // Relationships
    @Relationship(deleteRule: .cascade, inverse: \ScheduleDay.trip)
    var scheduleDays: [ScheduleDay]?
    
    @Relationship(deleteRule: .cascade, inverse: \Team.trip)
    var teams: [Team]?
    
    @Relationship(deleteRule: .cascade, inverse: \RyderCupSession.trip)
    var ryderCupSessions: [RyderCupSession]?
    
    @Relationship(deleteRule: .cascade, inverse: \BanterPost.trip)
    var banterPosts: [BanterPost]?
    
    @Relationship(deleteRule: .cascade, inverse: \TripPhoto.trip)
    var photos: [TripPhoto]?
    
    @Relationship(deleteRule: .cascade, inverse: \AuditLog.trip)
    var auditLogs: [AuditLog]?
    
    init(
        id: UUID = UUID(),
        name: String,
        startDate: Date,
        endDate: Date,
        location: String? = nil,
        notes: String? = nil,
        captainModeEnabled: Bool = true,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.location = location
        self.notes = notes
        self.captainModeEnabled = captainModeEnabled
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

extension Trip {
    /// Sorted schedule days by date
    var sortedDays: [ScheduleDay] {
        (scheduleDays ?? []).sorted { $0.date < $1.date }
    }
    
    /// Get formatted date range
    var dateRangeFormatted: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let start = formatter.string(from: startDate)
        let end = formatter.string(from: endDate)
        
        let yearFormatter = DateFormatter()
        yearFormatter.dateFormat = "yyyy"
        let year = yearFormatter.string(from: startDate)
        
        return "\(start) - \(end), \(year)"
    }
    
    /// Duration in days
    var durationDays: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: startDate, to: endDate)
        return (components.day ?? 0) + 1
    }
    
    /// Sorted Ryder Cup sessions by date and time slot
    var sortedSessions: [RyderCupSession] {
        (ryderCupSessions ?? []).sorted { session1, session2 in
            if session1.scheduledDate != session2.scheduledDate {
                return session1.scheduledDate < session2.scheduledDate
            }
            return session1.timeSlot < session2.timeSlot
        }
    }
    
    /// Team A (first team in Ryder Cup mode)
    var teamA: Team? {
        (teams ?? []).filter { $0.mode == .ryderCup }.first
    }
    
    /// Team B (second team in Ryder Cup mode)
    var teamB: Team? {
        let ryderCupTeams = (teams ?? []).filter { $0.mode == .ryderCup }
        return ryderCupTeams.count > 1 ? ryderCupTeams[1] : nil
    }
    
    /// Total points for Team A across all sessions
    var teamATotalPoints: Double {
        sortedSessions.reduce(0.0) { $0 + $1.teamAPoints }
    }
    
    /// Total points for Team B across all sessions
    var teamBTotalPoints: Double {
        sortedSessions.reduce(0.0) { $0 + $1.teamBPoints }
    }
    
    /// Total points available
    var totalPointsAvailable: Double {
        sortedSessions.reduce(0.0) { $0 + $1.totalPointsAvailable }
    }
    
    /// Points to win (half + 0.5)
    var pointsToWin: Double {
        (totalPointsAvailable / 2) + 0.5
    }
    
    /// Sorted banter posts (newest first)
    var sortedBanterPosts: [BanterPost] {
        (banterPosts ?? []).sorted { $0.timestamp > $1.timestamp }
    }
    
    /// Photos sorted by date
    var sortedPhotos: [TripPhoto] {
        (photos ?? []).sorted { $0.takenAt < $1.takenAt }
    }
}
