import Foundation
import SwiftData

/// Tee set for a course containing rating, slope, and hole handicaps
@Model
final class TeeSet {
    var id: UUID
    var name: String
    var color: String?
    var rating: Double
    var slope: Int
    var par: Int
    
    // Hole handicaps (1-18, where 1 is the hardest hole)
    var holeHandicaps: [Int]
    
    // Optional hole pars (typically [4,3,5,4,...])
    var holePars: [Int]?
    
    // Optional yardages per hole
    var yardages: [Int]?
    
    // Total yardage (computed or stored)
    var totalYardage: Int?
    
    var createdAt: Date
    var updatedAt: Date
    
    // Relationships
    var course: Course?
    
    @Relationship(deleteRule: .cascade, inverse: \ScheduleItem.teeSet)
    var scheduleItems: [ScheduleItem]?
    
    init(
        id: UUID = UUID(),
        name: String,
        color: String? = nil,
        rating: Double,
        slope: Int,
        par: Int,
        /// Hole handicaps array where index 0 = hole 1's handicap.
        /// Default is sequential 1-18 which is a placeholder.
        /// Should be replaced with actual course-specific hole handicaps.
        holeHandicaps: [Int] = Array(1...18),
        holePars: [Int]? = nil,
        yardages: [Int]? = nil,
        totalYardage: Int? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.color = color
        self.rating = rating
        self.slope = slope
        self.par = par
        self.holeHandicaps = holeHandicaps
        self.holePars = holePars
        self.yardages = yardages
        self.totalYardage = totalYardage
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

extension TeeSet {
    /// Formatted tee name with color
    var displayName: String {
        if let color = color {
            return "\(name) (\(color))"
        }
        return name
    }
    
    /// Get par for a specific hole (1-indexed)
    func par(for hole: Int) -> Int {
        guard let pars = holePars, hole >= 1, hole <= 18 else {
            return 4 // Default to par 4
        }
        return pars[hole - 1]
    }
    
    /// Get hole handicap for a specific hole (1-indexed)
    func holeHandicap(for hole: Int) -> Int {
        guard hole >= 1, hole <= 18, holeHandicaps.count >= hole else {
            return hole // Default to hole number
        }
        return holeHandicaps[hole - 1]
    }
    
    /// Default hole pars (standard par 72 course)
    static var defaultHolePars: [Int] {
        [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]
    }
}
