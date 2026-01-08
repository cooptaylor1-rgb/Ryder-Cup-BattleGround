import Foundation
import SwiftData

/// Service for seeding initial data
struct SeedDataService {
    
    /// Check if seed data is needed and seed if empty
    static func seedIfNeeded(context: ModelContext) {
        let descriptor = FetchDescriptor<Player>()
        let count = (try? context.fetchCount(descriptor)) ?? 0
        
        if count == 0 {
            seedSampleData(context: context)
        }
    }
    
    /// Seed sample data for immediate app usability
    static func seedSampleData(context: ModelContext) {
        // Create sample players
        let players = createSamplePlayers(context: context)
        
        // Create sample courses
        let courses = createSampleCourses(context: context)
        
        // Create sample trip
        createSampleTrip(context: context, players: players, courses: courses)
        
        do {
            try context.save()
        } catch {
            print("Error seeding data: \(error)")
        }
    }
    
    private static func createSamplePlayers(context: ModelContext) -> [Player] {
        let playersData: [(name: String, handicap: Double, tee: String?)] = [
            ("John Smith", 12.5, "Blue"),
            ("Mike Johnson", 8.2, "Blue"),
            ("David Williams", 18.4, "White"),
            ("Chris Brown", 5.1, "Blue"),
            ("Tom Davis", 15.7, "White"),
            ("Steve Wilson", 22.3, "White"),
            ("James Miller", 10.0, "Blue"),
            ("Robert Taylor", 14.8, "White")
        ]
        
        var players: [Player] = []
        
        for data in playersData {
            let player = Player(
                name: data.name,
                handicapIndex: data.handicap,
                teePreference: data.tee
            )
            context.insert(player)
            players.append(player)
        }
        
        return players
    }
    
    private static func createSampleCourses(context: ModelContext) -> [Course] {
        var courses: [Course] = []
        
        // Course 1: Pebble Beach style
        let course1 = Course(name: "Ocean Cliffs Golf Club", location: "Monterey, CA")
        context.insert(course1)
        
        let teeSet1Blue = TeeSet(
            name: "Blue",
            color: "Blue",
            rating: 74.5,
            slope: 145,
            par: 72,
            holeHandicaps: [7, 15, 1, 11, 3, 17, 5, 13, 9, 8, 16, 2, 12, 4, 18, 6, 14, 10],
            holePars: [4, 4, 4, 4, 3, 5, 4, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5],
            totalYardage: 6828
        )
        teeSet1Blue.course = course1
        context.insert(teeSet1Blue)
        
        let teeSet1White = TeeSet(
            name: "White",
            color: "White",
            rating: 71.2,
            slope: 132,
            par: 72,
            holeHandicaps: [7, 15, 1, 11, 3, 17, 5, 13, 9, 8, 16, 2, 12, 4, 18, 6, 14, 10],
            holePars: [4, 4, 4, 4, 3, 5, 4, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5],
            totalYardage: 6215
        )
        teeSet1White.course = course1
        context.insert(teeSet1White)
        
        courses.append(course1)
        
        // Course 2: Augusta style
        let course2 = Course(name: "Magnolia National", location: "Augusta, GA")
        context.insert(course2)
        
        let teeSet2Blue = TeeSet(
            name: "Tournament",
            color: "Blue",
            rating: 76.2,
            slope: 148,
            par: 72,
            holeHandicaps: [1, 9, 3, 11, 5, 13, 7, 15, 17, 2, 10, 4, 12, 6, 14, 8, 16, 18],
            holePars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
            totalYardage: 7475
        )
        teeSet2Blue.course = course2
        context.insert(teeSet2Blue)
        
        let teeSet2White = TeeSet(
            name: "Member",
            color: "White",
            rating: 72.8,
            slope: 138,
            par: 72,
            holeHandicaps: [1, 9, 3, 11, 5, 13, 7, 15, 17, 2, 10, 4, 12, 6, 14, 8, 16, 18],
            holePars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
            totalYardage: 6890
        )
        teeSet2White.course = course2
        context.insert(teeSet2White)
        
        courses.append(course2)
        
        // Course 3: Local style
        let course3 = Course(name: "Pine Valley Links", location: "Pine Valley, NJ")
        context.insert(course3)
        
        let teeSet3Blue = TeeSet(
            name: "Championship",
            color: "Blue",
            rating: 73.8,
            slope: 140,
            par: 70,
            holeHandicaps: [5, 11, 1, 15, 3, 17, 7, 9, 13, 6, 12, 2, 16, 4, 18, 8, 10, 14],
            holePars: [4, 4, 5, 3, 4, 3, 4, 4, 5, 4, 4, 5, 3, 4, 3, 4, 4, 4],
            totalYardage: 6765
        )
        teeSet3Blue.course = course3
        context.insert(teeSet3Blue)
        
        courses.append(course3)
        
        return courses
    }
    
    private static func createSampleTrip(context: ModelContext, players: [Player], courses: [Course]) {
        // Create a trip starting in a few days
        let startDate = Calendar.current.date(byAdding: .day, value: 3, to: Date())!
        let endDate = Calendar.current.date(byAdding: .day, value: 6, to: startDate)!
        
        let trip = Trip(
            name: "Buddies Golf Trip 2026",
            startDate: startDate,
            endDate: endDate,
            location: "Monterey Peninsula, CA",
            notes: "Annual golf trip with the crew. Bring your A game!"
        )
        context.insert(trip)
        
        // Create schedule days
        var currentDate = startDate
        var days: [ScheduleDay] = []
        
        while currentDate <= endDate {
            let day = ScheduleDay(date: currentDate)
            day.trip = trip
            context.insert(day)
            days.append(day)
            
            currentDate = Calendar.current.date(byAdding: .day, value: 1, to: currentDate)!
        }
        
        // Add tee times for days
        if days.count >= 4, courses.count >= 2 {
            // Day 1: Arrival dinner
            let dinnerItem = ScheduleItem(type: .event, title: "Welcome Dinner")
            var dinnerComponents = Calendar.current.dateComponents([.year, .month, .day], from: days[0].date)
            dinnerComponents.hour = 19
            dinnerComponents.minute = 0
            dinnerItem.startTime = Calendar.current.date(from: dinnerComponents)
            dinnerItem.scheduleDay = days[0]
            dinnerItem.notes = "Meet at the clubhouse restaurant"
            context.insert(dinnerItem)
            
            // Day 2: First round
            if let course1 = courses.first, let teeSet1 = course1.sortedTeeSets.first {
                let round1 = ScheduleItem(type: .teeTime, title: "Round 1")
                var round1Components = Calendar.current.dateComponents([.year, .month, .day], from: days[1].date)
                round1Components.hour = 8
                round1Components.minute = 30
                round1.startTime = Calendar.current.date(from: round1Components)
                round1.scheduleDay = days[1]
                round1.teeSet = teeSet1
                context.insert(round1)
                
                // Create groups
                let group1 = Group(name: "Group 1")
                group1.scheduleItem = round1
                context.insert(group1)
                
                for (index, player) in players.prefix(4).enumerated() {
                    let gp = GroupPlayer(position: index)
                    gp.group = group1
                    gp.player = player
                    context.insert(gp)
                }
                
                if players.count > 4 {
                    let group2 = Group(name: "Group 2")
                    group2.scheduleItem = round1
                    context.insert(group2)
                    
                    for (index, player) in players.dropFirst(4).prefix(4).enumerated() {
                        let gp = GroupPlayer(position: index)
                        gp.group = group2
                        gp.player = player
                        context.insert(gp)
                    }
                }
            }
            
            // Day 3: Second round
            if courses.count >= 2, let course2 = courses[safe: 1], let teeSet2 = course2.sortedTeeSets.first {
                let round2 = ScheduleItem(type: .teeTime, title: "Round 2")
                var round2Components = Calendar.current.dateComponents([.year, .month, .day], from: days[2].date)
                round2Components.hour = 9
                round2Components.minute = 0
                round2.startTime = Calendar.current.date(from: round2Components)
                round2.scheduleDay = days[2]
                round2.teeSet = teeSet2
                context.insert(round2)
            }
            
            // Day 4: Final round and awards dinner
            if let course1 = courses.first, let teeSet1 = course1.sortedTeeSets.first {
                let round3 = ScheduleItem(type: .teeTime, title: "Final Round")
                var round3Components = Calendar.current.dateComponents([.year, .month, .day], from: days[3].date)
                round3Components.hour = 8
                round3Components.minute = 0
                round3.startTime = Calendar.current.date(from: round3Components)
                round3.scheduleDay = days[3]
                round3.teeSet = teeSet1
                context.insert(round3)
            }
            
            let awardsDinner = ScheduleItem(type: .event, title: "Awards Dinner")
            var awardsComponents = Calendar.current.dateComponents([.year, .month, .day], from: days[3].date)
            awardsComponents.hour = 19
            awardsComponents.minute = 30
            awardsDinner.startTime = Calendar.current.date(from: awardsComponents)
            awardsDinner.scheduleDay = days[3]
            awardsDinner.notes = "Trophy presentation and prizes"
            context.insert(awardsDinner)
        }
        
        // Create teams for Ryder Cup style competition
        let teamA = Team(name: "Team USA", colorHex: "#1E88E5", mode: .ryderCup)
        teamA.trip = trip
        context.insert(teamA)
        
        for (index, player) in players.prefix(4).enumerated() {
            let member = TeamMember(isCaptain: index == 0, sortOrder: index)
            member.team = teamA
            member.player = player
            context.insert(member)
        }
        
        let teamB = Team(name: "Team Europe", colorHex: "#E53935", mode: .ryderCup)
        teamB.trip = trip
        context.insert(teamB)
        
        for (index, player) in players.dropFirst(4).prefix(4).enumerated() {
            let member = TeamMember(isCaptain: index == 0, sortOrder: index)
            member.team = teamB
            member.player = player
            context.insert(member)
        }
    }
}
