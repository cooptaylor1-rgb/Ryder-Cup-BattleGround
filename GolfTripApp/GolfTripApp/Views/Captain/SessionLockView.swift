import SwiftUI
import SwiftData

/// View for managing session lock state with confirmation
struct SessionLockView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    let session: RyderCupSession
    let trip: Trip
    
    @State private var unlockReason: String = ""
    @State private var showUnlockConfirm = false
    @State private var isHolding = false
    @State private var holdProgress: CGFloat = 0
    
    private let holdDuration: Double = 1.5
    
    var body: some View {
        NavigationStack {
            VStack(spacing: DesignTokens.Spacing.xl) {
                // Status Header
                statusHeader
                
                // Current State Info
                stateInfo
                
                Spacer()
                
                // Action Area
                if session.isLocked {
                    unlockSection
                } else {
                    lockSection
                }
                
                Spacer()
            }
            .padding(DesignTokens.Spacing.lg)
            .background(Color.surfaceBackground)
            .navigationTitle("Session Lock")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Unlock Session?", isPresented: $showUnlockConfirm) {
                TextField("Reason (optional)", text: $unlockReason)
                Button("Cancel", role: .cancel) {
                    unlockReason = ""
                }
                Button("Unlock", role: .destructive) {
                    performUnlock()
                }
            } message: {
                Text("Unlocking allows editing of pairings. This action will be logged.")
            }
        }
    }
    
    // MARK: - Status Header
    
    private var statusHeader: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(session.isLocked ? Color.warning.opacity(0.2) : Color.success.opacity(0.2))
                    .frame(width: 80, height: 80)
                
                Image(systemName: session.isLocked ? "lock.fill" : "lock.open.fill")
                    .font(.system(size: 36))
                    .foregroundColor(session.isLocked ? .warning : .success)
            }
            
            Text(session.displayTitle)
                .font(.title2.weight(.bold))
            
            Text(session.isLocked ? "Session is Locked" : "Session is Unlocked")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.top, DesignTokens.Spacing.xl)
    }
    
    // MARK: - State Info
    
    private var stateInfo: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            if session.isLocked {
                infoRow(
                    icon: "shield.checkered",
                    title: "Protected",
                    subtitle: "Pairings cannot be changed while locked",
                    color: .warning
                )
                
                if CaptainModeService.shared.shouldAutoLock(session: session) {
                    infoRow(
                        icon: "play.circle.fill",
                        title: "Live Scoring Active",
                        subtitle: "One or more matches are in progress",
                        color: .success
                    )
                }
            } else {
                infoRow(
                    icon: "pencil.circle",
                    title: "Editable",
                    subtitle: "Pairings can be modified",
                    color: .success
                )
                
                if CaptainModeService.shared.shouldAutoLock(session: session) {
                    infoRow(
                        icon: "exclamationmark.triangle.fill",
                        title: "Scoring Started",
                        subtitle: "Consider locking to prevent accidental changes",
                        color: .warning
                    )
                }
            }
            
            // Match status summary
            let matches = session.sortedMatches
            let inProgress = matches.filter { $0.status == .inProgress }.count
            let completed = matches.filter { $0.status == .final }.count
            let scheduled = matches.filter { $0.status == .scheduled }.count
            
            Divider()
                .padding(.vertical, DesignTokens.Spacing.sm)
            
            HStack(spacing: DesignTokens.Spacing.xl) {
                matchStatPill(count: scheduled, label: "Scheduled", color: .secondary)
                matchStatPill(count: inProgress, label: "Live", color: .success)
                matchStatPill(count: completed, label: "Final", color: .info)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(DesignTokens.Spacing.lg)
        .background(Color.surfaceVariant)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
    }
    
    private func infoRow(icon: String, title: String, subtitle: String, color: Color) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
    }
    
    private func matchStatPill(count: Int, label: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(count)")
                .font(.title3.weight(.bold))
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Lock Section
    
    private var lockSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text("Lock this session to prevent accidental changes to pairings during play.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button {
                performLock()
            } label: {
                HStack {
                    Image(systemName: "lock.fill")
                    Text("Lock Session")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.lg)
                .background(Color.warning)
                .foregroundColor(.black)
                .font(.headline)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
            }
            .pressAnimation()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
    
    // MARK: - Unlock Section
    
    private var unlockSection: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text("Hold the button below to unlock. Changes will be logged.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            // Hold-to-unlock button
            ZStack {
                // Background track
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                    .fill(Color.surfaceVariant)
                    .frame(height: 56)
                
                // Progress fill
                GeometryReader { geometry in
                    RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                        .fill(Color.error.opacity(0.3))
                        .frame(width: geometry.size.width * holdProgress)
                }
                .frame(height: 56)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
                
                // Label
                HStack {
                    Image(systemName: "lock.open.fill")
                    Text(isHolding ? "Keep Holding..." : "Hold to Unlock")
                }
                .font(.headline)
                .foregroundColor(isHolding ? .error : .primary)
            }
            .frame(height: 56)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isHolding {
                            startHold()
                        }
                    }
                    .onEnded { _ in
                        cancelHold()
                    }
            )
            
            Text("Or tap below to unlock with confirmation")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Button {
                showUnlockConfirm = true
            } label: {
                Text("Unlock with Reason")
                    .font(.subheadline)
                    .foregroundColor(.error)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
    
    // MARK: - Actions
    
    private func startHold() {
        isHolding = true
        HapticManager.buttonTap()
        
        withAnimation(.linear(duration: holdDuration)) {
            holdProgress = 1.0
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + holdDuration) {
            if isHolding {
                performUnlock()
            }
        }
    }
    
    private func cancelHold() {
        isHolding = false
        withAnimation(.easeOut(duration: 0.2)) {
            holdProgress = 0
        }
    }
    
    private func performLock() {
        HapticManager.success()
        let actorName = trip.captainName ?? "Captain"
        _ = CaptainModeService.shared.lockSession(session, actorName: actorName, context: modelContext)
        
        try? modelContext.save()
        dismiss()
    }
    
    private func performUnlock() {
        HapticManager.warning()
        isHolding = false
        holdProgress = 0
        
        let actorName = trip.captainName ?? "Captain"
        let reason = unlockReason.isEmpty ? nil : unlockReason
        _ = CaptainModeService.shared.unlockSession(session, actorName: actorName, reason: reason, context: modelContext)
        
        try? modelContext.save()
        unlockReason = ""
        dismiss()
    }
}

// MARK: - Lock Badge Component

struct SessionLockBadge: View {
    let isLocked: Bool
    let hasLiveScoring: Bool
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: isLocked ? "lock.fill" : (hasLiveScoring ? "exclamationmark.triangle.fill" : "lock.open"))
                .font(.caption2)
            
            if isLocked {
                Text("Locked")
                    .font(.caption2.weight(.semibold))
            } else if hasLiveScoring {
                Text("Unlocked")
                    .font(.caption2.weight(.semibold))
            }
        }
        .foregroundColor(isLocked ? .warning : (hasLiveScoring ? .error : .secondary))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            (isLocked ? Color.warning : (hasLiveScoring ? Color.error : Color.secondary))
                .opacity(0.15)
        )
        .clipShape(Capsule())
    }
}

// MARK: - Validation Sheet

struct SessionValidationView: View {
    let validation: SessionValidationResult
    let onDismiss: () -> Void
    let onProceed: (() -> Void)?
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    // Status header
                    HStack {
                        Image(systemName: validation.canStart ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(validation.canStart ? .success : .error)
                        
                        VStack(alignment: .leading) {
                            Text(validation.canStart ? "Ready to Start" : "Cannot Start")
                                .font(.headline)
                            Text(validation.canStart ? "All checks passed" : "Fix the issues below")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(DesignTokens.Spacing.lg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.surfaceVariant)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
                    
                    // Errors
                    if !validation.errors.isEmpty {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Label("Issues", systemImage: "exclamationmark.triangle.fill")
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.error)
                            
                            ForEach(validation.errors) { error in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Image(systemName: error.isBlocking ? "xmark.circle.fill" : "exclamationmark.circle")
                                            .foregroundColor(error.isBlocking ? .error : .warning)
                                        Text(error.message)
                                            .font(.subheadline)
                                    }
                                    
                                    Text("Fix: \(error.fix)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                        .padding(.leading, 28)
                                }
                                .padding(DesignTokens.Spacing.sm)
                                .background(Color.error.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
                            }
                        }
                    }
                    
                    // Warnings
                    if !validation.warnings.isEmpty {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Label("Warnings", systemImage: "exclamationmark.triangle")
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.warning)
                            
                            ForEach(validation.warnings) { warning in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle")
                                            .foregroundColor(.warning)
                                        Text(warning.message)
                                            .font(.subheadline)
                                    }
                                    
                                    Text(warning.suggestion)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                        .padding(.leading, 28)
                                }
                                .padding(DesignTokens.Spacing.sm)
                                .background(Color.warning.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
                            }
                        }
                    }
                    
                    // Success state
                    if validation.errors.isEmpty && validation.warnings.isEmpty {
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.success)
                            Text("All validations passed!")
                                .font(.subheadline)
                        }
                        .padding(DesignTokens.Spacing.lg)
                        .frame(maxWidth: .infinity)
                        .background(Color.success.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(Color.surfaceBackground)
            .navigationTitle("Session Validation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { onDismiss() }
                }
                
                if validation.canStart, let proceed = onProceed {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Start") {
                            proceed()
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    SessionLockBadge(isLocked: true, hasLiveScoring: false)
}
