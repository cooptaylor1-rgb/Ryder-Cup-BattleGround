import SwiftUI
import SwiftData

/// View displaying the audit log for a trip
struct AuditLogView: View {
    @Environment(\.dismiss) private var dismiss
    
    let trip: Trip
    
    @State private var filterCritical = false
    @State private var searchText = ""
    
    private var filteredEntries: [AuditLogEntry] {
        var entries = filterCritical ? trip.criticalAuditLog : trip.sortedAuditLog
        
        if !searchText.isEmpty {
            entries = entries.filter { entry in
                entry.summary.localizedCaseInsensitiveContains(searchText) ||
                entry.actorName.localizedCaseInsensitiveContains(searchText) ||
                entry.actionType.displayName.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return entries
    }
    
    private var groupedEntries: [(String, [AuditLogEntry])] {
        let grouped = Dictionary(grouping: filteredEntries) { entry in
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE, MMM d"
            return formatter.string(from: entry.timestamp)
        }
        
        return grouped.sorted { entry1, entry2 in
            guard let date1 = filteredEntries.first(where: { 
                let formatter = DateFormatter()
                formatter.dateFormat = "EEEE, MMM d"
                return formatter.string(from: $0.timestamp) == entry1.key
            })?.timestamp,
            let date2 = filteredEntries.first(where: {
                let formatter = DateFormatter()
                formatter.dateFormat = "EEEE, MMM d"
                return formatter.string(from: $0.timestamp) == entry2.key
            })?.timestamp else {
                return false
            }
            return date1 > date2
        }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter bar
                filterBar
                
                if filteredEntries.isEmpty {
                    emptyState
                } else {
                    logList
                }
            }
            .background(Color.surfaceBackground)
            .navigationTitle("Activity Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .searchable(text: $searchText, prompt: "Search activity")
        }
    }
    
    // MARK: - Filter Bar
    
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                FilterChip(
                    title: "All",
                    isSelected: !filterCritical,
                    action: { filterCritical = false }
                )
                
                FilterChip(
                    title: "Critical Only",
                    isSelected: filterCritical,
                    action: { filterCritical = true }
                )
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
        .background(Color.surfaceVariant)
    }
    
    // MARK: - Log List
    
    private var logList: some View {
        List {
            ForEach(groupedEntries, id: \.0) { date, entries in
                Section(header: Text(date)) {
                    ForEach(entries, id: \.id) { entry in
                        AuditLogEntryRow(entry: entry)
                            .listRowBackground(Color.surface)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    // MARK: - Empty State
    
    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("No Activity")
                .font(.headline)
            
            Text(filterCritical ? "No critical actions recorded" : "Actions will appear here as you use the app")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(DesignTokens.Spacing.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(isSelected ? .semibold : .regular))
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isSelected ? Color.accentColor : Color.surfaceElevated)
                .clipShape(Capsule())
        }
    }
}

// MARK: - Audit Log Entry Row

struct AuditLogEntryRow: View {
    let entry: AuditLogEntry
    
    var body: some View {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(iconBackgroundColor.opacity(0.2))
                    .frame(width: 36, height: 36)
                
                Image(systemName: entry.actionType.iconName)
                    .font(.subheadline)
                    .foregroundColor(iconBackgroundColor)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(entry.actionType.displayName)
                        .font(.subheadline.weight(.semibold))
                    
                    if entry.actionType.isCritical {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.caption2)
                            .foregroundColor(.warning)
                    }
                    
                    Spacer()
                    
                    Text(entry.relativeTime)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Text(entry.summary)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text("by \(entry.actorName)")
                    .font(.caption)
                    .foregroundColor(.secondary.opacity(0.7))
            }
        }
        .padding(.vertical, 4)
    }
    
    private var iconBackgroundColor: Color {
        switch entry.actionType {
        case .sessionLocked, .sessionUnlocked:
            return .warning
        case .matchFinalized:
            return .success
        case .scoreEdited, .scoreUndone:
            return .info
        case .pairingEdited, .pairingDeleted:
            return .error
        case .lineupPublished:
            return .accentColor
        default:
            return .secondary
        }
    }
}

// MARK: - Preview

#Preview {
    AuditLogView(trip: Trip(name: "Sample Trip", startDate: Date(), endDate: Date()))
}
