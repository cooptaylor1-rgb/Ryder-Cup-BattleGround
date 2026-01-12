import Foundation

/// Service for auto-filling lineups with optimal pairings
final class LineupAutoFillService {
    
    // MARK: - Singleton
    static let shared = LineupAutoFillService()
    private init() {}
    
    // MARK: - Types
    
    /// A suggested pairing for a match
    struct SuggestedPairing {
        let teamAPlayers: [Player]
        let teamBPlayers: [Player]
        let handicapDifference: Double
        let repeatPairingScore: Int  // How many times these players have been paired before
        let repeatOpponentScore: Int // How many times these opponents have faced each other
    }
    
    /// Result of auto-fill algorithm
    struct AutoFillResult {
        let pairings: [SuggestedPairing]
        let fairnessScore: FairnessScore
        let warnings: [String]
    }
    
    /// Fairness score with explainability
    struct FairnessScore {
        let score: Int  // 0-100, 100 is perfectly fair
        let strokesAdvantage: Double  // Positive = Team A advantage
        let advantageTeam: String?
        let drivers: [FairnessDriver]
        
        struct FairnessDriver: Identifiable {
            let id = UUID()
            let factor: String
            let impact: String
            let severity: Severity
            
            enum Severity: String {
                case low = "low"
                case medium = "medium"
                case high = "high"
                
                var color: String {
                    switch self {
                    case .low: return "success"
                    case .medium: return "warning"
                    case .high: return "error"
                    }
                }
            }
        }
    }
    
    /// Pairing history entry
    struct PairingHistoryEntry {
        let player1Id: UUID
        let player2Id: UUID
        let asPartners: Bool
        let asOpponents: Bool
        let count: Int
    }
    
    // MARK: - Auto-Fill Algorithm
    
    /// Generate optimal pairings for a session
    func autoFillSession(
        sessionType: SessionType,
        matchCount: Int,
        teamAPlayers: [Player],
        teamBPlayers: [Player],
        lockedPairings: [(teamA: [Player], teamB: [Player])] = [],
        pairingHistory: [PairingHistoryEntry] = []
    ) -> AutoFillResult {
        
        var warnings: [String] = []
        let playersPerTeam = sessionType.playersPerTeam
        
        // Validate we have enough players
        let requiredA = (matchCount - lockedPairings.count) * playersPerTeam
        let requiredB = (matchCount - lockedPairings.count) * playersPerTeam
        
        let availableA = teamAPlayers.filter { player in
            !lockedPairings.flatMap { $0.teamA }.contains { $0.id == player.id }
        }
        let availableB = teamBPlayers.filter { player in
            !lockedPairings.flatMap { $0.teamB }.contains { $0.id == player.id }
        }
        
        if availableA.count < requiredA {
            warnings.append("Not enough Team A players for all matches")
        }
        if availableB.count < requiredB {
            warnings.append("Not enough Team B players for all matches")
        }
        
        // Sort by handicap for balanced matching
        let sortedA = availableA.sorted { $0.handicapIndex < $1.handicapIndex }
        let sortedB = availableB.sorted { $0.handicapIndex < $1.handicapIndex }
        
        var pairings: [SuggestedPairing] = lockedPairings.map { locked in
            SuggestedPairing(
                teamAPlayers: locked.teamA,
                teamBPlayers: locked.teamB,
                handicapDifference: calculateHandicapDifference(locked.teamA, locked.teamB),
                repeatPairingScore: calculateRepeatPairingScore(locked.teamA, locked.teamB, history: pairingHistory),
                repeatOpponentScore: calculateRepeatOpponentScore(locked.teamA, locked.teamB, history: pairingHistory)
            )
        }
        
        // Generate remaining pairings
        let remainingMatches = matchCount - lockedPairings.count
        
        switch sessionType {
        case .singles:
            pairings.append(contentsOf: generateSinglesPairings(
                sortedA: sortedA,
                sortedB: sortedB,
                matchCount: remainingMatches,
                history: pairingHistory
            ))
            
        case .fourball, .foursomes:
            pairings.append(contentsOf: generateTeamPairings(
                sortedA: sortedA,
                sortedB: sortedB,
                playersPerTeam: playersPerTeam,
                matchCount: remainingMatches,
                history: pairingHistory
            ))
        }
        
        // Calculate fairness
        let fairness = calculateFairnessScore(pairings: pairings, teamAName: "Team A", teamBName: "Team B")
        
        return AutoFillResult(
            pairings: pairings,
            fairnessScore: fairness,
            warnings: warnings
        )
    }
    
    // MARK: - Singles Pairing Generation
    
    private func generateSinglesPairings(
        sortedA: [Player],
        sortedB: [Player],
        matchCount: Int,
        history: [PairingHistoryEntry]
    ) -> [SuggestedPairing] {
        var pairings: [SuggestedPairing] = []
        
        // Match players by similar handicap ranking
        for i in 0..<min(matchCount, sortedA.count, sortedB.count) {
            let playerA = sortedA[i]
            let playerB = sortedB[i]
            
            pairings.append(SuggestedPairing(
                teamAPlayers: [playerA],
                teamBPlayers: [playerB],
                handicapDifference: abs(playerA.handicapIndex - playerB.handicapIndex),
                repeatPairingScore: 0,
                repeatOpponentScore: calculateRepeatOpponentScore([playerA], [playerB], history: history)
            ))
        }
        
        return pairings
    }
    
    // MARK: - Team Pairing Generation (Fourball/Foursomes)
    
    private func generateTeamPairings(
        sortedA: [Player],
        sortedB: [Player],
        playersPerTeam: Int,
        matchCount: Int,
        history: [PairingHistoryEntry]
    ) -> [SuggestedPairing] {
        var pairings: [SuggestedPairing] = []
        
        // Pair up players within each team (strongest with weakest for balance)
        let teamAPairs = createBalancedPairs(from: sortedA, pairSize: playersPerTeam)
        let teamBPairs = createBalancedPairs(from: sortedB, pairSize: playersPerTeam)
        
        // Match pairs by combined handicap
        let sortedAPairs = teamAPairs.sorted { pair1, pair2 in
            pair1.reduce(0) { $0 + $1.handicapIndex } < pair2.reduce(0) { $0 + $1.handicapIndex }
        }
        let sortedBPairs = teamBPairs.sorted { pair1, pair2 in
            pair1.reduce(0) { $0 + $1.handicapIndex } < pair2.reduce(0) { $0 + $1.handicapIndex }
        }
        
        for i in 0..<min(matchCount, sortedAPairs.count, sortedBPairs.count) {
            let teamA = sortedAPairs[i]
            let teamB = sortedBPairs[i]
            
            pairings.append(SuggestedPairing(
                teamAPlayers: teamA,
                teamBPlayers: teamB,
                handicapDifference: calculateHandicapDifference(teamA, teamB),
                repeatPairingScore: calculateRepeatPairingScore(teamA, teamB, history: history),
                repeatOpponentScore: calculateRepeatOpponentScore(teamA, teamB, history: history)
            ))
        }
        
        return pairings
    }
    
    /// Create balanced pairs (strongest with weakest)
    private func createBalancedPairs(from players: [Player], pairSize: Int) -> [[Player]] {
        guard pairSize == 2 else {
            // For pairSize != 2, just chunk the sorted array
            return stride(from: 0, to: players.count, by: pairSize).map { startIndex in
                Array(players[startIndex..<min(startIndex + pairSize, players.count)])
            }
        }
        
        // For pairs: match strongest with weakest
        var pairs: [[Player]] = []
        let sorted = players.sorted { $0.handicapIndex < $1.handicapIndex }
        var used = Set<UUID>()
        
        var left = 0
        var right = sorted.count - 1
        
        while left < right {
            if !used.contains(sorted[left].id) && !used.contains(sorted[right].id) {
                pairs.append([sorted[left], sorted[right]])
                used.insert(sorted[left].id)
                used.insert(sorted[right].id)
            }
            left += 1
            right -= 1
        }
        
        return pairs
    }
    
    // MARK: - Fairness Calculation
    
    func calculateFairnessScore(
        pairings: [SuggestedPairing],
        teamAName: String,
        teamBName: String
    ) -> FairnessScore {
        guard !pairings.isEmpty else {
            return FairnessScore(
                score: 100,
                strokesAdvantage: 0,
                advantageTeam: nil,
                drivers: []
            )
        }
        
        var drivers: [FairnessScore.FairnessDriver] = []
        var totalScore: Double = 100
        
        // Factor 1: Handicap balance
        let totalHandicapDiff = pairings.reduce(0.0) { total, pairing in
            let teamAAvg = pairing.teamAPlayers.isEmpty ? 0 : 
                pairing.teamAPlayers.reduce(0) { $0 + $1.handicapIndex } / Double(pairing.teamAPlayers.count)
            let teamBAvg = pairing.teamBPlayers.isEmpty ? 0 :
                pairing.teamBPlayers.reduce(0) { $0 + $1.handicapIndex } / Double(pairing.teamBPlayers.count)
            return total + (teamAAvg - teamBAvg)
        }
        
        let avgHandicapDiff = totalHandicapDiff / Double(pairings.count)
        let strokesAdvantage = avgHandicapDiff  // Positive = Team A has higher average (gets more strokes)
        
        if abs(avgHandicapDiff) > 3 {
            totalScore -= 30
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Handicap Gap",
                impact: String(format: "%.1f stroke average difference", abs(avgHandicapDiff)),
                severity: .high
            ))
        } else if abs(avgHandicapDiff) > 1.5 {
            totalScore -= 15
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Handicap Gap",
                impact: String(format: "%.1f stroke average difference", abs(avgHandicapDiff)),
                severity: .medium
            ))
        } else if abs(avgHandicapDiff) > 0.5 {
            totalScore -= 5
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Handicap Gap",
                impact: String(format: "%.1f stroke average difference", abs(avgHandicapDiff)),
                severity: .low
            ))
        }
        
        // Factor 2: Repeat pairings
        let totalRepeatPairings = pairings.reduce(0) { $0 + $1.repeatPairingScore }
        if totalRepeatPairings > 2 {
            totalScore -= 15
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Repeat Partners",
                impact: "\(totalRepeatPairings) repeated partner combinations",
                severity: .medium
            ))
        } else if totalRepeatPairings > 0 {
            totalScore -= 5
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Repeat Partners",
                impact: "\(totalRepeatPairings) repeated partner combination(s)",
                severity: .low
            ))
        }
        
        // Factor 3: Repeat opponents
        let totalRepeatOpponents = pairings.reduce(0) { $0 + $1.repeatOpponentScore }
        if totalRepeatOpponents > 2 {
            totalScore -= 15
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Repeat Matchups",
                impact: "\(totalRepeatOpponents) repeated opponent matchups",
                severity: .medium
            ))
        } else if totalRepeatOpponents > 0 {
            totalScore -= 5
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Repeat Matchups",
                impact: "\(totalRepeatOpponents) repeated opponent matchup(s)",
                severity: .low
            ))
        }
        
        // Factor 4: Individual match lopsidedness
        let lopsidedMatches = pairings.filter { $0.handicapDifference > 5 }.count
        if lopsidedMatches > 0 {
            totalScore -= Double(lopsidedMatches) * 10
            drivers.append(FairnessScore.FairnessDriver(
                factor: "Lopsided Matchups",
                impact: "\(lopsidedMatches) match(es) with >5 stroke gap",
                severity: lopsidedMatches > 1 ? .high : .medium
            ))
        }
        
        let advantageTeam: String? = {
            if strokesAdvantage > 0.5 {
                return teamBName  // Team A has higher handicaps, so Team B has advantage
            } else if strokesAdvantage < -0.5 {
                return teamAName
            }
            return nil
        }()
        
        return FairnessScore(
            score: max(0, Int(totalScore)),
            strokesAdvantage: strokesAdvantage,
            advantageTeam: advantageTeam,
            drivers: drivers
        )
    }
    
    // MARK: - Helper Methods
    
    private func calculateHandicapDifference(_ teamA: [Player], _ teamB: [Player]) -> Double {
        let avgA = teamA.isEmpty ? 0 : teamA.reduce(0) { $0 + $1.handicapIndex } / Double(teamA.count)
        let avgB = teamB.isEmpty ? 0 : teamB.reduce(0) { $0 + $1.handicapIndex } / Double(teamB.count)
        return abs(avgA - avgB)
    }
    
    private func calculateRepeatPairingScore(_ teamA: [Player], _ teamB: [Player], history: [PairingHistoryEntry]) -> Int {
        // Count how many times players on same team have been partners
        var score = 0
        
        for i in 0..<teamA.count {
            for j in (i+1)..<teamA.count {
                if history.contains(where: { 
                    ($0.player1Id == teamA[i].id && $0.player2Id == teamA[j].id ||
                     $0.player1Id == teamA[j].id && $0.player2Id == teamA[i].id) &&
                    $0.asPartners
                }) {
                    score += 1
                }
            }
        }
        
        for i in 0..<teamB.count {
            for j in (i+1)..<teamB.count {
                if history.contains(where: {
                    ($0.player1Id == teamB[i].id && $0.player2Id == teamB[j].id ||
                     $0.player1Id == teamB[j].id && $0.player2Id == teamB[i].id) &&
                    $0.asPartners
                }) {
                    score += 1
                }
            }
        }
        
        return score
    }
    
    private func calculateRepeatOpponentScore(_ teamA: [Player], _ teamB: [Player], history: [PairingHistoryEntry]) -> Int {
        var score = 0
        
        for playerA in teamA {
            for playerB in teamB {
                if history.contains(where: {
                    ($0.player1Id == playerA.id && $0.player2Id == playerB.id ||
                     $0.player1Id == playerB.id && $0.player2Id == playerA.id) &&
                    $0.asOpponents
                }) {
                    score += 1
                }
            }
        }
        
        return score
    }
    
    // MARK: - Stroke Preview
    
    /// Calculate expected strokes given for each match
    func calculateMatchStrokes(
        pairing: SuggestedPairing,
        sessionType: SessionType,
        teeSet: TeeSet?
    ) -> (teamAStrokes: Int, teamBStrokes: Int) {
        guard let teeSet = teeSet else { return (0, 0) }
        
        let teamACourseHandicaps = pairing.teamAPlayers.map { $0.courseHandicap(for: teeSet) }
        let teamBCourseHandicaps = pairing.teamBPlayers.map { $0.courseHandicap(for: teeSet) }
        
        switch sessionType {
        case .singles:
            guard let hcpA = teamACourseHandicaps.first, let hcpB = teamBCourseHandicaps.first else {
                return (0, 0)
            }
            return TournamentEngine.singlesStrokes(
                playerACourseHandicap: hcpA,
                playerBCourseHandicap: hcpB
            )
            
        case .fourball:
            let (teamAStrokes, teamBStrokes) = TournamentEngine.fourballStrokes(
                teamACourseHandicaps: teamACourseHandicaps,
                teamBCourseHandicaps: teamBCourseHandicaps
            )
            return (teamAStrokes.max() ?? 0, teamBStrokes.max() ?? 0)
            
        case .foursomes:
            return TournamentEngine.foursomesStrokes(
                teamACourseHandicaps: teamACourseHandicaps,
                teamBCourseHandicaps: teamBCourseHandicaps
            )
        }
    }
}
