import Testing
@testable import GolfTripApp

/// Tests for LineupBuilder auto-fill algorithm and fairness scoring
struct LineupBuilderTests {
    
    // MARK: - Auto-Fill Algorithm Tests
    
    @Test("Generates singles lineup")
    func generateSinglesLineup() {
        let session = RyderCupSession(
            name: "Singles",
            sessionType: .singles,
            scheduledDate: Date()
        )
        
        let teamA = [
            Player(name: "A1", handicapIndex: 5.0),
            Player(name: "A2", handicapIndex: 10.0),
            Player(name: "A3", handicapIndex: 15.0),
            Player(name: "A4", handicapIndex: 20.0)
        ]
        
        let teamB = [
            Player(name: "B1", handicapIndex: 6.0),
            Player(name: "B2", handicapIndex: 11.0),
            Player(name: "B3", handicapIndex: 16.0),
            Player(name: "B4", handicapIndex: 21.0)
        ]
        
        let suggestion = LineupBuilder.generateLineup(
            session: session,
            teamAPlayers: teamA,
            teamBPlayers: teamB
        )
        
        #expect(suggestion.matches.count == 4)
        #expect(suggestion.fairnessScore >= 0 && suggestion.fairnessScore <= 100)
        
        // Verify each match has 1 player per team
        for match in suggestion.matches {
            #expect(match.teamAPlayerIds.count == 1)
            #expect(match.teamBPlayerIds.count == 1)
        }
    }
    
    @Test("Generates fourball lineup")
    func generateFourballLineup() {
        let session = RyderCupSession(
            name: "Fourball",
            sessionType: .fourball,
            scheduledDate: Date()
        )
        
        let teamA = [
            Player(name: "A1", handicapIndex: 5.0),
            Player(name: "A2", handicapIndex: 10.0),
            Player(name: "A3", handicapIndex: 15.0),
            Player(name: "A4", handicapIndex: 20.0)
        ]
        
        let teamB = [
            Player(name: "B1", handicapIndex: 6.0),
            Player(name: "B2", handicapIndex: 11.0),
            Player(name: "B3", handicapIndex: 16.0),
            Player(name: "B4", handicapIndex: 21.0)
        ]
        
        let suggestion = LineupBuilder.generateLineup(
            session: session,
            teamAPlayers: teamA,
            teamBPlayers: teamB
        )
        
        #expect(suggestion.matches.count == 2)
        
        // Verify each match has 2 players per team
        for match in suggestion.matches {
            #expect(match.teamAPlayerIds.count == 2)
            #expect(match.teamBPlayerIds.count == 2)
        }
    }
    
    @Test("Respects locked pairings")
    func respectsLockedPairings() {
        let session = RyderCupSession(
            name: "Singles",
            sessionType: .singles,
            scheduledDate: Date()
        )
        
        let teamA = [
            Player(name: "A1", handicapIndex: 5.0),
            Player(name: "A2", handicapIndex: 10.0)
        ]
        
        let teamB = [
            Player(name: "B1", handicapIndex: 6.0),
            Player(name: "B2", handicapIndex: 11.0)
        ]
        
        // Lock first pairing
        let lockedPairing = LineupBuilder.MatchPairing(
            teamAPlayerIds: [teamA[0].id],
            teamBPlayerIds: [teamB[0].id],
            expectedStrokeDifference: 1
        )
        
        let suggestion = LineupBuilder.generateLineup(
            session: session,
            teamAPlayers: teamA,
            teamBPlayers: teamB,
            lockedPairings: [lockedPairing]
        )
        
        #expect(suggestion.matches.count == 2)
        #expect(suggestion.matches[0].teamAPlayerIds == lockedPairing.teamAPlayerIds)
        #expect(suggestion.matches[0].teamBPlayerIds == lockedPairing.teamBPlayerIds)
    }
    
    // MARK: - Fairness Scoring Tests
    
    @Test("High fairness score for balanced lineup")
    func highFairnessForBalanced() {
        let session = RyderCupSession(
            name: "Singles",
            sessionType: .singles,
            scheduledDate: Date()
        )
        
        // Well-matched teams
        let teamA = [
            Player(name: "A1", handicapIndex: 10.0),
            Player(name: "A2", handicapIndex: 12.0)
        ]
        
        let teamB = [
            Player(name: "B1", handicapIndex: 10.5),
            Player(name: "B2", handicapIndex: 12.5)
        ]
        
        let suggestion = LineupBuilder.generateLineup(
            session: session,
            teamAPlayers: teamA,
            teamBPlayers: teamB
        )
        
        #expect(suggestion.fairnessScore >= 80.0)
    }
    
    @Test("Lower fairness score for repeated pairings")
    func lowerFairnessForRepeated() {
        let session = RyderCupSession(
            name: "Fourball",
            sessionType: .fourball,
            scheduledDate: Date()
        )
        
        let teamA = [
            Player(name: "A1", handicapIndex: 10.0),
            Player(name: "A2", handicapIndex: 12.0)
        ]
        
        let teamB = [
            Player(name: "B1", handicapIndex: 10.5),
            Player(name: "B2", handicapIndex: 12.5)
        ]
        
        // Build pairing history showing these players paired before
        var history: [[UUID]: Int] = [:]
        history[[teamA[0].id, teamA[1].id].sorted()] = 2  // Paired twice before
        
        let suggestion = LineupBuilder.generateLineup(
            session: session,
            teamAPlayers: teamA,
            teamBPlayers: teamB,
            pairingHistory: history
        )
        
        // Should have lower score due to repeated pairing
        #expect(suggestion.fairnessScore < 90.0)
        #expect(suggestion.explanation.contains { $0.contains("repeated") })
    }
    
    // MARK: - Pairing History Tests
    
    @Test("Builds pairing history from sessions")
    func buildsPairingHistory() {
        let player1 = Player(name: "P1", handicapIndex: 10.0)
        let player2 = Player(name: "P2", handicapIndex: 12.0)
        let player3 = Player(name: "P3", handicapIndex: 14.0)
        let player4 = Player(name: "P4", handicapIndex: 16.0)
        
        let session = RyderCupSession(
            name: "Fourball",
            sessionType: .fourball,
            scheduledDate: Date()
        )
        
        // Create match with player1 and player2 paired
        let match = Match()
        match.setTeamAPlayers([player1, player2])
        match.setTeamBPlayers([player3, player4])
        match.session = session
        
        let history = LineupBuilder.buildPairingHistory(
            sessions: [session],
            playersPerTeam: 2
        )
        
        let teamAPairKey = [player1.id, player2.id].sorted()
        let teamBPairKey = [player3.id, player4.id].sorted()
        
        #expect(history[teamAPairKey] == 1)
        #expect(history[teamBPairKey] == 1)
    }
    
    @Test("Does not track pairing history for singles")
    func noHistoryForSingles() {
        let session = RyderCupSession(
            name: "Singles",
            sessionType: .singles,
            scheduledDate: Date()
        )
        
        let history = LineupBuilder.buildPairingHistory(
            sessions: [session],
            playersPerTeam: 1
        )
        
        #expect(history.isEmpty)
    }
    
    // MARK: - Edge Cases
    
    @Test("Handles uneven player counts")
    func handlesUnevenPlayers() {
        let session = RyderCupSession(
            name: "Singles",
            sessionType: .singles,
            scheduledDate: Date()
        )
        
        let teamA = [
            Player(name: "A1", handicapIndex: 10.0),
            Player(name: "A2", handicapIndex: 12.0),
            Player(name: "A3", handicapIndex: 14.0)
        ]
        
        let teamB = [
            Player(name: "B1", handicapIndex: 11.0),
            Player(name: "B2", handicapIndex: 13.0)
        ]
        
        let suggestion = LineupBuilder.generateLineup(
            session: session,
            teamAPlayers: teamA,
            teamBPlayers: teamB
        )
        
        // Should generate only 2 matches (limited by Team B)
        #expect(suggestion.matches.count == 2)
    }
}
