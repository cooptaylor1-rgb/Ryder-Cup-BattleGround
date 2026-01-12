import Foundation
import UserNotifications

/// Service for managing local notifications (tee time reminders, match updates)
/// P1.D Local Notifications Feature
@MainActor
final class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()
    
    @Published var isAuthorized = false
    @Published var pendingNotifications: [UNNotificationRequest] = []
    
    // Notification categories
    static let teeTimeCategory = "TEE_TIME"
    static let matchStartCategory = "MATCH_START"
    static let matchCompleteCategory = "MATCH_COMPLETE"
    static let sessionLockedCategory = "SESSION_LOCKED"
    
    private let notificationCenter = UNUserNotificationCenter.current()
    
    private override init() {
        super.init()
        checkAuthorizationStatus()
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async -> Bool {
        do {
            let options: UNAuthorizationOptions = [.alert, .badge, .sound]
            let granted = try await notificationCenter.requestAuthorization(options: options)
            await MainActor.run {
                self.isAuthorized = granted
            }
            
            if granted {
                setupNotificationCategories()
            }
            
            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }
    
    func checkAuthorizationStatus() {
        notificationCenter.getNotificationSettings { settings in
            Task { @MainActor in
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }
    
    // MARK: - Notification Categories
    
    private func setupNotificationCategories() {
        // Tee Time Actions
        let viewLineup = UNNotificationAction(
            identifier: "VIEW_LINEUP",
            title: "View Lineup",
            options: [.foreground]
        )
        
        let snooze = UNNotificationAction(
            identifier: "SNOOZE",
            title: "Remind in 15 min",
            options: []
        )
        
        let teeTimeCategory = UNNotificationCategory(
            identifier: Self.teeTimeCategory,
            actions: [viewLineup, snooze],
            intentIdentifiers: [],
            options: []
        )
        
        // Match Start Actions
        let startScoring = UNNotificationAction(
            identifier: "START_SCORING",
            title: "Start Scoring",
            options: [.foreground]
        )
        
        let matchStartCategory = UNNotificationCategory(
            identifier: Self.matchStartCategory,
            actions: [startScoring],
            intentIdentifiers: [],
            options: []
        )
        
        // Match Complete Actions
        let viewResults = UNNotificationAction(
            identifier: "VIEW_RESULTS",
            title: "View Results",
            options: [.foreground]
        )
        
        let shareResults = UNNotificationAction(
            identifier: "SHARE_RESULTS",
            title: "Share",
            options: [.foreground]
        )
        
        let matchCompleteCategory = UNNotificationCategory(
            identifier: Self.matchCompleteCategory,
            actions: [viewResults, shareResults],
            intentIdentifiers: [],
            options: []
        )
        
        notificationCenter.setNotificationCategories([
            teeTimeCategory,
            matchStartCategory,
            matchCompleteCategory
        ])
    }
    
    // MARK: - Schedule Notifications
    
    /// Schedule a tee time reminder
    func scheduleTeeTimeReminder(
        for session: RyderCupSession,
        at date: Date,
        minutesBefore: Int = 30
    ) async {
        guard isAuthorized else { return }
        
        let triggerDate = date.addingTimeInterval(-TimeInterval(minutesBefore * 60))
        
        // Don't schedule if it's in the past
        guard triggerDate > Date() else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "⛳️ Tee Time Reminder"
        content.body = "\(session.displayTitle) starts in \(minutesBefore) minutes!"
        content.sound = .default
        content.categoryIdentifier = Self.teeTimeCategory
        content.userInfo = [
            "sessionId": session.id.uuidString,
            "type": "tee_time"
        ]
        
        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: triggerDate
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        let identifier = "tee_time_\(session.id.uuidString)_\(minutesBefore)"
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )
        
        do {
            try await notificationCenter.add(request)
            await refreshPendingNotifications()
        } catch {
            print("Failed to schedule tee time notification: \(error)")
        }
    }
    
    /// Schedule multiple tee time reminders (30 min, 10 min before)
    func scheduleAllTeeTimeReminders(for session: RyderCupSession) async {
        let date = session.scheduledDate
        
        // 30 minutes before
        await scheduleTeeTimeReminder(for: session, at: date, minutesBefore: 30)
        
        // 10 minutes before
        await scheduleTeeTimeReminder(for: session, at: date, minutesBefore: 10)
    }
    
    /// Schedule notifications for all upcoming sessions in a trip
    func scheduleNotificationsForTrip(_ trip: Trip) async {
        // Cancel existing notifications first
        await cancelTripNotifications(for: trip)
        
        for session in trip.sortedSessions where !session.isComplete {
            await scheduleAllTeeTimeReminders(for: session)
        }
    }
    
    // MARK: - Cancel Notifications
    
    /// Cancel a specific notification
    func cancelNotification(identifier: String) {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])
        Task {
            await refreshPendingNotifications()
        }
    }
    
    /// Cancel all notifications for a session
    func cancelSessionNotifications(for session: RyderCupSession) {
        let identifiers = [
            "tee_time_\(session.id.uuidString)_30",
            "tee_time_\(session.id.uuidString)_10"
        ]
        notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiers)
        Task {
            await refreshPendingNotifications()
        }
    }
    
    /// Cancel all notifications for a trip
    func cancelTripNotifications(for trip: Trip) async {
        var identifiers: [String] = []
        
        for session in trip.sortedSessions {
            identifiers.append("tee_time_\(session.id.uuidString)_30")
            identifiers.append("tee_time_\(session.id.uuidString)_10")
        }
        
        notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiers)
        await refreshPendingNotifications()
    }
    
    /// Cancel all notifications
    func cancelAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
        Task { @MainActor in
            self.pendingNotifications = []
        }
    }
    
    // MARK: - Query Notifications
    
    /// Refresh the list of pending notifications
    func refreshPendingNotifications() async {
        let requests = await notificationCenter.pendingNotificationRequests()
        await MainActor.run {
            self.pendingNotifications = requests
        }
    }
    
    /// Check if notifications are scheduled for a session
    func hasNotificationsScheduled(for session: RyderCupSession) -> Bool {
        pendingNotifications.contains { request in
            request.identifier.contains(session.id.uuidString)
        }
    }
    
    // MARK: - Instant Notifications
    
    /// Send an immediate notification (for testing or urgent alerts)
    func sendInstantNotification(title: String, body: String) async {
        guard isAuthorized else { return }
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )
        
        try? await notificationCenter.add(request)
    }
    
    /// Send match completion notification
    func sendMatchCompleteNotification(for match: Match, session: RyderCupSession) async {
        guard isAuthorized else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "🏁 Match Complete"
        content.body = "\(session.displayTitle): \(match.statusString)"
        content.sound = .default
        content.categoryIdentifier = Self.matchCompleteCategory
        content.userInfo = [
            "matchId": match.id.uuidString,
            "sessionId": session.id.uuidString,
            "type": "match_complete"
        ]
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "match_complete_\(match.id.uuidString)",
            content: content,
            trigger: trigger
        )
        
        try? await notificationCenter.add(request)
    }
    
    /// Send session locked notification
    func sendSessionLockedNotification(for session: RyderCupSession) async {
        guard isAuthorized else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "🔒 Session Locked"
        content.body = "\(session.displayTitle) lineup is now locked and scoring has begun."
        content.sound = .default
        content.categoryIdentifier = Self.sessionLockedCategory
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "session_locked_\(session.id.uuidString)",
            content: content,
            trigger: trigger
        )
        
        try? await notificationCenter.add(request)
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // Show notification even when app is in foreground
        [.banner, .sound, .badge]
    }
    
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        
        switch response.actionIdentifier {
        case "VIEW_LINEUP":
            // Handle view lineup action - would navigate to lineup view
            print("User tapped View Lineup")
            
        case "START_SCORING":
            // Handle start scoring action
            print("User tapped Start Scoring")
            
        case "VIEW_RESULTS":
            // Handle view results action
            print("User tapped View Results")
            
        case "SHARE_RESULTS":
            // Handle share results action
            print("User tapped Share Results")
            
        case "SNOOZE":
            // Reschedule notification for 15 minutes later
            if let sessionIdString = userInfo["sessionId"] as? String {
                print("Snoozing notification for session: \(sessionIdString)")
                // Would reschedule notification here
            }
            
        default:
            // Default tap - open app
            break
        }
    }
}
