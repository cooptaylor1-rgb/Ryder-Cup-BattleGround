import SwiftUI

/// Toggle button for captain mode lock/unlock functionality
struct CaptainModeToggle: View {
    @Binding var isLocked: Bool
    let onToggle: () -> Void
    
    @State private var showUnlockConfirm = false
    
    var body: some View {
        Button(action: handleTap) {
            HStack(spacing: 8) {
                Image(systemName: isLocked ? "lock.fill" : "lock.open.fill")
                    .font(.subheadline.weight(.semibold))
                Text(isLocked ? "Locked" : "Unlocked")
                    .font(.subheadline.weight(.semibold))
            }
            .foregroundColor(isLocked ? .orange : .secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(isLocked ? Color.orange.opacity(0.15) : Color.secondary.opacity(0.1))
            )
            .overlay(
                Capsule()
                    .stroke(isLocked ? Color.orange.opacity(0.3) : Color.clear, lineWidth: 1)
            )
        }
        .alert("Unlock Session?", isPresented: $showUnlockConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Unlock", role: .destructive) {
                isLocked = false
                onToggle()
            }
        } message: {
            Text("Unlocking will allow editing pairings. Only do this if matches haven't started.")
        }
    }
    
    private func handleTap() {
        if isLocked {
            showUnlockConfirm = true
        } else {
            isLocked = true
            onToggle()
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        CaptainModeToggle(isLocked: .constant(true), onToggle: {})
        CaptainModeToggle(isLocked: .constant(false), onToggle: {})
    }
    .padding()
    .background(Color.surfaceBackground)
}
