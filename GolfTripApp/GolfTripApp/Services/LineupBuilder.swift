import Foundation

/// Service for generating optimal lineup suggestions with fairness scoring
struct LineupBuilder {
    
    // MARK: - Data Structures
    
    /// A suggested lineup with fairness metrics
    struct Suggestion {
        var matches: [MatchPairing]
        var fairnessScore: Double  // 0-100, higher is better
        var explanation: [String]
    }
    
    /// A single match pairing
    struct MatchPairing {
        var teamAPlayerIds: [UUID]
        var teamBPlayerIds: [UUID]
        var expectedStrokeDifference: Int
    }
    
    // MARK: - Auto-Fill Algorithm
    
    /// Generate optimal lineup suggestions
    /// - Parameters:
    ///   - session: The session to build lineup for
    ///   - teamAPlayers: Team A roster
    ///   - teamBPlayers: Team B roster
    ///   - lockedPairings: Existing pairings that cannot be changed
    ///   - pairingHistory: Dictionary tracking how many times players have been paired (key: sorted player IDs)
    /// - Returns: A lineup suggestion with fairness score
    static func generateLineup(
        session: RyderCupSession,
        teamAPlayers: [Player],
        teamBPlayers: [Player],
        lockedPairings: [MatchPairing] = [],
        pairingHistory: [[UUID]: Int] = [:]
    ) -> Suggestion {
        
        let sessionType = session.sessionType
        let playersPerTeam = sessionType.playersPerTeam
        let numMatches = min(teamAPlayers.count / playersPerTeam, teamBPlayers.count / playersPerTeam)
        
        var pairings: [MatchPairing] = lockedPairings
        var availableTeamA = teamAPlayers.filter { player in
            !lockedPairings.contains { pairing in
                pairing.teamAPlayerIds.contains(player.id)
            }
        }
        var availableTeamB = teamBPlayers.filter { player in
            !lockedPairings.contains { pairing in
                pairing.teamBPlayerIds.contains(player.id)
            }
        }
        
        // Sort by handicap for balanced matching
        availableTeamA.sort { $0.handicapIndex < $1.handicapIndex }
        availableTeamB.sort { $0.handicapIndex < $1.handicapIndex }
        
        // Create pairings with alternating strength
        while pairings.count < numMatches && !availableTeamA.isEmpty && !availableTeamB.isEmpty {
            let teamAPair: [Player]
            let teamBPair: [Player]
            
            if playersPerTeam == 1 {
                // Singles: match similar skill levels
                teamAPair = [availableTeamA.removeFirst()]
                teamBPair = [availableTeamB.removeFirst()]
            } else {
                // Pairs: alternate strong/weak combinations
                if pairings.count % 2 == 0 {
                    // Match top players
                    teamAPair = Array(availableTeamA.prefix(playersPerTeam))
                    teamBPair = Array(availableTeamB.prefix(playersPerTeam))
                } else {
                    // Mix skill levels - pair strongest with weakest
                    if availableTeamA.count >= 2 && availableTeamB.count >= 2 {
                        teamAPair = [availableTeamA.first!, availableTeamA.last!]
                        teamBPair = [availableTeamB.first!, availableTeamB.last!]
                    } else {
                        teamAPair = Array(availableTeamA.prefix(playersPerTeam))
                        teamBPair = Array(availableTeamB.prefix(playersPerTeam))
                    }
                }
                
                availableTeamA.removeAll { teamAPair.contains($0) }
                availableTeamB.removeAll { teamBPair.contains($0) }
            }
            
            // Calculate expected stroke difference based on handicaps
            let teamAAvgHandicap = teamAPair.map { $0.handicapIndex }.reduce(0, +) / Double(teamAPair.count)
            let teamBAvgHandicap = teamBPair.map { $0.handicapIndex }.reduce(0, +) / Double(teamBPair.count)
            let strokeDiff = Int(round(abs(teamAAvgHandicap - teamBAvgHandicap)))
            
            pairings.append(MatchPairing(
                teamAPlayerIds: teamAPair.map { $0.id },
                teamBPlayerIds: teamBPair.map { $0.id },
                expectedStrokeDifference: strokeDiff
            ))
        }
        
        // Calculate fairness score
        let fairness = calculateFairnessScore(
            pairings: pairings,
            pairingHistory: pairingHistory,
            allTeamAPlayers: teamAPlayers,
            allTeamBPlayers: teamBPlayers,
            playersPerTeam: playersPerTeam
        )
        
        return Suggestion(
            matches: pairings,
            fairnessScore: fairness.score,
            explanation: fairness.reasons
        )
    }
    
    // MARK: - Fairness Scoring
    
    /// Calculate fairness score (0-100, higher is better)
    /// - Parameters:
    ///   - pairings: The proposed pairings
    ///   - pairingHistory: Historical pairing counts
    ///   - allTeamAPlayers: All Team A players
    ///   - allTeamBPlayers: All Team B players
    ///   - playersPerTeam: Number of players per team in each match
    /// - Returns: Tuple with score and explanation
    private static func calculateFairnessScore(
        pairings: [MatchPairing],
        pairingHistory: [[UUID]: Int],
        allTeamAPlayers: [Player],
        allTeamBPlayers: [Player],
        playersPerTeam: Int
    ) -> (score: Double, reasons: [String]) {
        var score: Double = 100
        var reasons: [String] = []
        
        // Check for repeated pairings (within team)
        if playersPerTeam > 1 {
            var repeatedCount = 0
            for pairing in pairings {
                let teamAPairKey = pairing.teamAPlayerIds.sorted()
                if let count = pairingHistory[teamAPairKey], count > 0 {
                    repeatedCount += 1
                }
                
                let teamBPairKey = pairing.teamBPlayerIds.sorted()
                if let count = pairingHistory[teamBPairKey], count > 0 {
                    repeatedCount += 1
                }
            }
            
            if repeatedCount > 0 {
                score -= Double(repeatedCount) * 10
                reasons.append("\(repeatedCount) repeated partnership(s)")
            }
        }
        
        // Check handicap balance across matches
        let strokeDiffs = pairings.map { $0.expectedStrokeDifference }
        if !strokeDiffs.isEmpty {
            let avgStrokeDiff = strokeDiffs.reduce(0, +) / strokeDiffs.count
            let variance = strokeDiffs.map { Double($0) - Double(avgStrokeDiff) }.map { $0 * $0 }.reduce(0, +) / Double(strokeDiffs.count)
            
            if variance > 4.0 {
                score -= min(20, variance * 2)
                reasons.append("Uneven handicap distribution")
            }
        }
        
        // Check player participation balance
        let teamAUsage = Set(pairings.flatMap { $0.teamAPlayerIds })
        let teamBUsage = Set(pairings.flatMap { $0.teamBPlayerIds })
        
        if teamAUsage.count < allTeamAPlayers.count || teamBUsage.count < allTeamBPlayers.count {
            let unusedA = allTeamAPlayers.count - teamAUsage.count
            let unusedB = allTeamBPlayers.count - teamBUsage.count
            if unusedA + unusedB > 0 {
                reasons.append("\(unusedA + unusedB) player(s) not in lineup")
            }
        }
        
        score = max(0, min(100, score))
        
        if reasons.isEmpty {
            if score >= 90 {
                reasons.append("Excellent balance")
            } else if score >= 75 {
                reasons.append("Well-balanced lineup")
            } else if score >= 60 {
                reasons.append("Acceptable balance")
            } else {
                reasons.append("Could be more balanced")
            }
        }
        
        return (score, reasons)
    }
    
    // MARK: - Pairing History
    
    /// Generate pairing history from previous sessions
    /// - Parameters:
    ///   - sessions: All completed or in-progress sessions
    ///   - playersPerTeam: Number of players per team
    /// - Returns: Dictionary mapping sorted player IDs to occurrence count
    static func buildPairingHistory(sessions: [RyderCupSession], playersPerTeam: Int) -> [[UUID]: Int] {
        guard playersPerTeam > 1 else { return [:] }
        
        var history: [[UUID]: Int] = [:]
        
        for session in sessions {
            for match in session.sortedMatches {
                // Track Team A partnerships
                let teamAKey = match.teamAIds.sorted()
                history[teamAKey, default: 0] += 1
                
                // Track Team B partnerships
                let teamBKey = match.teamBIds.sorted()
                history[teamBKey, default: 0] += 1
            }
        }
        
        return history
    }
}
