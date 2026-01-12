import SwiftUI

/// View for managing notification preferences
/// Part of P1.D Local Notifications Feature
struct NotificationSettingsView: View {
    @StateObject private var notificationService = NotificationService.shared
    @Environment(\.modelContext) private var modelContext
    @Query private var trips: [Trip]
    
    @State private var teeTimeReminders = true
    @State private var matchCompleteAlerts = true
    @State private var sessionLockAlerts = true
    @State private var reminderTiming: ReminderTiming = .thirtyMinutes
    @State private var showAuthorizationAlert = false
    
    enum ReminderTiming: String, CaseIterable {
        case tenMinutes = "10 minutes before"
        case thirtyMinutes = "30 minutes before"
        case oneHour = "1 hour before"
        
        var minutes: Int {
            switch self {
            case .tenMinutes: return 10
            case .thirtyMinutes: return 30
            case .oneHour: return 60
            }
        }
    }
    
    private var currentTrip: Trip? { trips.first }
    
    var body: some View {
        List {
            // Authorization Section
            if !notificationService.isAuthorized {
                Section {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "bell.slash.fill")
                            .font(.title2)
                            .foregroundColor(.warning)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Notifications Disabled")
                                .font(.headline)
                            Text("Enable notifications to receive tee time reminders and match updates.")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    
                    Button("Enable Notifications") {
                        Task {
                            let granted = await notificationService.requestAuthorization()
                            if !granted {
                                showAuthorizationAlert = true
                            }
                        }
                    }
                    .foregroundColor(.accentColor)
                }
            }
            
            // Notification Types
            Section {
                Toggle(isOn: $teeTimeReminders) {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Tee Time Reminders")
                            Text("Get reminded before your matches")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } icon: {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.info)
                    }
                }
                .disabled(!notificationService.isAuthorized)
                
                if teeTimeReminders {
                    Picker("Reminder Timing", selection: $reminderTiming) {
                        ForEach(ReminderTiming.allCases, id: \.self) { timing in
                            Text(timing.rawValue).tag(timing)
                        }
                    }
                    .disabled(!notificationService.isAuthorized)
                }
                
                Toggle(isOn: $matchCompleteAlerts) {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Match Complete Alerts")
                            Text("Know when matches finish")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } icon: {
                        Image(systemName: "flag.checkered")
                            .foregroundColor(.success)
                    }
                }
                .disabled(!notificationService.isAuthorized)
                
                Toggle(isOn: $sessionLockAlerts) {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Session Lock Alerts")
                            Text("Know when lineups are locked")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } icon: {
                        Image(systemName: "lock.fill")
                            .foregroundColor(.warning)
                    }
                }
                .disabled(!notificationService.isAuthorized)
            } header: {
                Text("Notification Types")
            }
            
            // Scheduled Notifications
            Section {
                if notificationService.pendingNotifications.isEmpty {
                    HStack {
                        Image(systemName: "bell.badge.slash")
                            .foregroundColor(.secondary)
                        Text("No scheduled notifications")
                            .foregroundColor(.secondary)
                    }
                } else {
                    ForEach(notificationService.pendingNotifications, id: \.identifier) { request in
                        notificationRow(request)
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            let identifier = notificationService.pendingNotifications[index].identifier
                            notificationService.cancelNotification(identifier: identifier)
                        }
                    }
                }
                
                if let trip = currentTrip {
                    Button {
                        Task {
                            await notificationService.scheduleNotificationsForTrip(trip)
                        }
                    } label: {
                        Label("Schedule All Reminders", systemImage: "bell.badge.fill")
                    }
                    .disabled(!notificationService.isAuthorized)
                }
            } header: {
                Text("Scheduled Notifications")
            } footer: {
                Text("Swipe to delete individual notifications")
            }
            
            // Clear All
            if !notificationService.pendingNotifications.isEmpty {
                Section {
                    Button(role: .destructive) {
                        notificationService.cancelAllNotifications()
                    } label: {
                        Label("Clear All Notifications", systemImage: "trash")
                    }
                }
            }
            
            // Test Section (Debug only)
            #if DEBUG
            Section {
                Button {
                    Task {
                        await notificationService.sendInstantNotification(
                            title: "⛳️ Test Notification",
                            body: "This is a test notification from Golf Trip App!"
                        )
                    }
                } label: {
                    Label("Send Test Notification", systemImage: "bell.fill")
                }
                .disabled(!notificationService.isAuthorized)
            } header: {
                Text("Debug")
            }
            #endif
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            notificationService.checkAuthorizationStatus()
            Task {
                await notificationService.refreshPendingNotifications()
            }
        }
        .alert("Notifications Disabled", isPresented: $showAuthorizationAlert) {
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Please enable notifications in Settings to receive tee time reminders.")
        }
    }
    
    @ViewBuilder
    private func notificationRow(_ request: UNNotificationRequest) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: notificationIcon(for: request))
                .foregroundColor(notificationColor(for: request))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(request.content.title)
                    .font(.subheadline.weight(.medium))
                Text(request.content.body)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                
                if let trigger = request.trigger as? UNCalendarNotificationTrigger,
                   let nextDate = trigger.nextTriggerDate() {
                    Text(nextDate, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.info)
                }
            }
        }
    }
    
    private func notificationIcon(for request: UNNotificationRequest) -> String {
        if request.identifier.contains("tee_time") {
            return "clock.fill"
        } else if request.identifier.contains("match_complete") {
            return "flag.checkered"
        } else if request.identifier.contains("session_locked") {
            return "lock.fill"
        }
        return "bell.fill"
    }
    
    private func notificationColor(for request: UNNotificationRequest) -> Color {
        if request.identifier.contains("tee_time") {
            return .info
        } else if request.identifier.contains("match_complete") {
            return .success
        } else if request.identifier.contains("session_locked") {
            return .warning
        }
        return .accentColor
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView()
    }
}
