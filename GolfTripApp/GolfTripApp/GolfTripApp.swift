import SwiftUI
import SwiftData

@main
struct GolfTripApp: App {
    let container: ModelContainer
    
    init() {
        do {
            let schema = Schema([
                Player.self,
                Course.self,
                TeeSet.self,
                Trip.self,
                ScheduleDay.self,
                ScheduleItem.self,
                Team.self,
                TeamMember.self,
                Group.self,
                GroupPlayer.self,
                Format.self,
                Scorecard.self,
                HoleScore.self,
                TeamScore.self,
                // Ryder Cup models
                RyderCupSession.self,
                Match.self,
                HoleResult.self,
                BanterPost.self,
                TripPhoto.self,
                // Captain's Toolkit models
                AuditLogEntry.self
            ])
            
            let modelConfiguration = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: false
            )
            
            container = try ModelContainer(
                for: schema,
                configurations: [modelConfiguration]
            )
            
            // Seed initial data if needed
            SeedDataService.seedIfNeeded(context: container.mainContext)
            
        } catch {
            fatalError("Could not initialize ModelContainer: \(error)")
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(container)
    }
}
