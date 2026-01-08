import Foundation

/// Handicap calculation service implementing USGA rules
struct HandicapCalculator {
    
    // MARK: - Course Handicap Calculation
    
    /// Calculate course handicap from handicap index, slope rating, course rating, and par
    /// Formula: CourseHandicap = round(HandicapIndex * (Slope / 113) + (CourseRating - Par))
    ///
    /// Note: Uses Swift's standard rounding (round half away from zero), which rounds 0.5 up.
    /// This aligns with USGA's recommended rounding method for course handicap calculations.
    ///
    /// - Parameters:
    ///   - handicapIndex: Player's USGA Handicap Index (can be negative for plus-handicap)
    ///   - slopeRating: Course slope rating (typically 55-155, standard is 113)
    ///   - courseRating: Course rating (typically close to par)
    ///   - par: Course par (typically 70-72)
    /// - Returns: Course handicap (rounded to nearest integer using standard rounding)
    static func calculateCourseHandicap(
        handicapIndex: Double,
        slopeRating: Int,
        courseRating: Double,
        par: Int
    ) -> Int {
        let slopeFactor = Double(slopeRating) / 113.0
        let ratingAdjustment = courseRating - Double(par)
        let courseHandicap = handicapIndex * slopeFactor + ratingAdjustment
        return Int(courseHandicap.rounded())
    }
    
    // MARK: - Strokes Allocation
    
    /// Allocate strokes per hole based on course handicap and hole handicap ranking
    /// - Parameters:
    ///   - courseHandicap: Calculated course handicap
    ///   - holeHandicaps: Array of 18 hole handicaps (1 = hardest, 18 = easiest)
    /// - Returns: Array of strokes received on each hole (index 0 = hole 1)
    static func allocateStrokes(
        courseHandicap: Int,
        holeHandicaps: [Int]
    ) -> [Int] {
        guard holeHandicaps.count == 18 else {
            // Return zero strokes if invalid hole handicaps
            return Array(repeating: 0, count: 18)
        }
        
        var strokes = Array(repeating: 0, count: 18)
        
        if courseHandicap >= 0 {
            // Positive handicap: receive strokes
            let baseStrokes = courseHandicap / 18
            let extraStrokes = courseHandicap % 18
            
            // Everyone gets base strokes on all holes
            strokes = Array(repeating: baseStrokes, count: 18)
            
            // Allocate extra strokes to hardest holes (lowest handicap numbers)
            // Create sorted indices by hole handicap (hardest first)
            let sortedIndices = holeHandicaps.enumerated()
                .sorted { $0.element < $1.element }
                .map { $0.offset }
            
            for i in 0..<extraStrokes {
                strokes[sortedIndices[i]] += 1
            }
        } else {
            // Negative handicap (plus-handicap): give strokes back
            let absHandicap = abs(courseHandicap)
            let baseStrokes = absHandicap / 18
            let extraStrokes = absHandicap % 18
            
            // Start with negative base strokes
            strokes = Array(repeating: -baseStrokes, count: 18)
            
            // Subtract extra strokes from hardest holes (lowest handicap numbers)
            let sortedIndices = holeHandicaps.enumerated()
                .sorted { $0.element < $1.element }
                .map { $0.offset }
            
            for i in 0..<extraStrokes {
                strokes[sortedIndices[i]] -= 1
            }
        }
        
        return strokes
    }
    
    // MARK: - Net Score Calculation
    
    /// Calculate net score for a hole
    /// - Parameters:
    ///   - grossScore: Actual strokes taken
    ///   - strokesReceived: Number of strokes received on this hole
    /// - Returns: Net score
    static func calculateNetScore(grossScore: Int, strokesReceived: Int) -> Int {
        return grossScore - strokesReceived
    }
    
    // MARK: - Stableford Points
    
    /// Calculate Stableford points for a hole using net score
    /// Standard net Stableford:
    /// - Net double bogey or worse: 0 points
    /// - Net bogey: 1 point
    /// - Net par: 2 points
    /// - Net birdie: 3 points
    /// - Net eagle: 4 points
    /// - Net albatross+: 5 points
    /// - Parameters:
    ///   - grossScore: Actual strokes taken
    ///   - par: Hole par
    ///   - strokesReceived: Strokes received on this hole
    /// - Returns: Stableford points (0-5)
    static func stablefordPoints(grossScore: Int, par: Int, strokesReceived: Int) -> Int {
        let netScore = grossScore - strokesReceived
        let relativeToPar = netScore - par
        
        switch relativeToPar {
        case ...(-3):
            return 5  // Albatross or better
        case -2:
            return 4  // Eagle
        case -1:
            return 3  // Birdie
        case 0:
            return 2  // Par
        case 1:
            return 1  // Bogey
        default:
            return 0  // Double bogey or worse
        }
    }
    
    // MARK: - Team Scoring
    
    /// Calculate best ball score for a team on a hole
    /// - Parameters:
    ///   - scores: Array of gross scores for team members
    ///   - strokesAllocations: Array of strokes received per player
    /// - Returns: Best net score among team members
    static func bestBallNetScore(scores: [Int], strokesAllocations: [Int]) -> Int {
        guard !scores.isEmpty, scores.count == strokesAllocations.count else {
            return 0
        }
        
        var bestNet = Int.max
        for i in 0..<scores.count {
            let net = scores[i] - strokesAllocations[i]
            if net < bestNet {
                bestNet = net
            }
        }
        
        return bestNet
    }
    
    /// Calculate best ball Stableford points for a team on a hole
    /// - Parameters:
    ///   - scores: Array of gross scores for team members
    ///   - par: Hole par
    ///   - strokesAllocations: Array of strokes received per player
    /// - Returns: Best Stableford points among team members
    static func bestBallStablefordPoints(scores: [Int], par: Int, strokesAllocations: [Int]) -> Int {
        guard !scores.isEmpty, scores.count == strokesAllocations.count else {
            return 0
        }
        
        var bestPoints = 0
        for i in 0..<scores.count {
            let points = stablefordPoints(
                grossScore: scores[i],
                par: par,
                strokesReceived: strokesAllocations[i]
            )
            if points > bestPoints {
                bestPoints = points
            }
        }
        
        return bestPoints
    }
    
    // MARK: - Leaderboard Helpers
    
    /// Calculate front 9, back 9, last 6, last 3, and last hole scores for tiebreakers
    /// - Parameters:
    ///   - holeScores: Array of 18 hole scores
    ///   - strokesAllocation: Array of 18 strokes received
    /// - Returns: Tuple with various score breakdowns
    static func scoringBreakdown(
        holeScores: [Int],
        strokesAllocation: [Int]
    ) -> (
        front9: Int,
        back9: Int,
        last6: Int,
        last3: Int,
        last1: Int,
        total: Int
    ) {
        guard holeScores.count == 18, strokesAllocation.count == 18 else {
            return (0, 0, 0, 0, 0, 0)
        }
        
        var netScores: [Int] = []
        for i in 0..<18 {
            netScores.append(holeScores[i] - strokesAllocation[i])
        }
        
        let front9 = netScores[0..<9].reduce(0, +)
        let back9 = netScores[9..<18].reduce(0, +)
        let last6 = netScores[12..<18].reduce(0, +)
        let last3 = netScores[15..<18].reduce(0, +)
        let last1 = netScores[17]
        let total = front9 + back9
        
        return (front9, back9, last6, last3, last1, total)
    }
}
