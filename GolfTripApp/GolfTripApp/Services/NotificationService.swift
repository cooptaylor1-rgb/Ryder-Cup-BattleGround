import UserNotifications
import Foundation

/// Service for managing local notifications
struct NotificationService {
    
    // MARK: - Authorization
    
    /// Request notification authorization from user
    /// - Returns: True if authorized, false if denied
    static func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }
    
    /// Check current authorization status
    /// - Returns: True if authorized
    static func isAuthorized() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        return settings.authorizationStatus == .authorized
    }
    
    // MARK: - Tee Time Notifications
    
    /// Schedule notifications for a session's tee times
    /// - Parameter session: The session to schedule notifications for
    static func scheduleTeeTimeNotifications(for session: RyderCupSession) async {
        guard await isAuthorized() else {
            print("Notifications not authorized")
            return
        }
        
        // Use optional binding to safely get date
        guard let startTime = session.scheduledDate else {
            print("Session has no scheduled date")
            return
        }
        
        let center = UNUserNotificationCenter.current()
        
        // 45 minutes before
        await scheduleNotification(
            id: "tee-45-\(session.id.uuidString)",
            title: "⛳️ Tee Time Soon",
            body: "\(session.name) starts in 45 minutes",
            date: startTime.addingTimeInterval(-45 * 60),
            sessionId: session.id.uuidString
        )
        
        // 10 minutes before
        await scheduleNotification(
            id: "tee-10-\(session.id.uuidString)",
            title: "⏰ Almost Tee Time!",
            body: "\(session.name) starts in 10 minutes. Get to the first tee!",
            date: startTime.addingTimeInterval(-10 * 60),
            sessionId: session.id.uuidString
        )
    }
    
    /// Schedule a single notification
    /// - Parameters:
    ///   - id: Unique identifier for the notification
    ///   - title: Notification title
    ///   - body: Notification body text
    ///   - date: When to deliver the notification
    ///   - sessionId: Optional session ID for deep linking
    private static func scheduleNotification(
        id: String,
        title: String,
        body: String,
        date: Date,
        sessionId: String? = nil
    ) async {
        // Don't schedule notifications in the past
        guard date > Date() else {
            print("Skipping notification for past date: \(date)")
            return
        }
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1
        
        // Add session ID to userInfo for deep linking
        if let sessionId = sessionId {
            content.userInfo = ["sessionId": sessionId, "type": "teeTime"]
        }
        
        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: date
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        
        do {
            try await UNUserNotificationCenter.current().add(request)
            print("Scheduled notification: \(id) for \(date)")
        } catch {
            print("Error scheduling notification \(id): \(error)")
        }
    }
    
    // MARK: - Notification Management
    
    /// Cancel specific notification
    /// - Parameter id: Notification identifier
    static func cancelNotification(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
    
    /// Cancel all notifications for a session
    /// - Parameter session: The session whose notifications should be cancelled
    static func cancelSessionNotifications(for session: RyderCupSession) {
        let identifiers = [
            "tee-45-\(session.id.uuidString)",
            "tee-10-\(session.id.uuidString)"
        ]
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
    }
    
    /// Cancel all pending notifications
    static func cancelAllNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
    
    /// Get count of pending notifications
    /// - Returns: Number of pending notifications
    static func getPendingCount() async -> Int {
        let center = UNUserNotificationCenter.current()
        let requests = await center.pendingNotificationRequests()
        return requests.count
    }
    
    /// Get all pending notification requests (for debugging)
    /// - Returns: Array of pending notifications
    static func getPendingNotifications() async -> [UNNotificationRequest] {
        return await UNUserNotificationCenter.current().pendingNotificationRequests()
    }
    
    // MARK: - Badge Management
    
    /// Clear app badge count (iOS 17+)
    @available(iOS 17.0, *)
    static func clearBadge() {
        Task {
            do {
                try await UNUserNotificationCenter.current().setBadgeCount(0)
            } catch {
                print("Error clearing badge: \(error)")
            }
        }
    }
}
