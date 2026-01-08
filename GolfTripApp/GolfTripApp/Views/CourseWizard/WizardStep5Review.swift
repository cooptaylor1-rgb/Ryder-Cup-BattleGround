import SwiftUI

/// Step 5: Review and Save
struct WizardStep5Review: View {
    @Bindable var state: CourseWizardState
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Review & Save")
                        .font(.title2.bold())
                    Text("Review your course setup before saving.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                // Course Summary Card
                ReviewSummaryCard(title: "Course", icon: "flag.fill", isComplete: state.isStep1Valid) {
                    LabeledContent("Name", value: state.courseName.isEmpty ? "—" : state.courseName)
                    if !state.courseLocation.isEmpty {
                        LabeledContent("Location", value: state.courseLocation)
                    }
                    if !state.courseNotes.isEmpty {
                        LabeledContent("Notes", value: state.courseNotes)
                    }
                } onEdit: {
                    state.goToStep(.basicInfo)
                }
                
                // Tee Set Summary Card
                ReviewSummaryCard(title: "Tee Set", icon: "rectangle.portrait.fill", isComplete: state.isStep2Valid) {
                    LabeledContent("Name", value: state.teeSetName)
                    LabeledContent("Course Rating", value: String(format: "%.1f", state.courseRating))
                    LabeledContent("Slope Rating", value: "\(state.slopeRating)")
                    LabeledContent("Par", value: "\(state.par)")
                    if let yardage = state.totalYardage {
                        LabeledContent("Yardage", value: "\(yardage)")
                    }
                } onEdit: {
                    state.goToStep(.teeSetBasics)
                }
                
                // Hole Pars Summary Card
                ReviewSummaryCard(
                    title: "Hole Pars",
                    icon: "number.circle.fill",
                    isComplete: true,
                    isOptional: true
                ) {
                    switch state.holeParsOption {
                    case .skip:
                        Text("Skipped (will use default par 4)")
                            .foregroundStyle(.secondary)
                    case .defaults:
                        Text("Using standard distribution for par \(state.par)")
                            .foregroundStyle(.secondary)
                        HoleParsPreview(pars: CourseWizardValidator.generateTypicalPars(for: state.par))
                    case .manual:
                        Text("Custom pars entered (Total: \(state.holeParsTotal))")
                            .foregroundStyle(state.holeParsTotal == state.par ? .green : .orange)
                        HoleParsPreview(pars: state.holePars)
                    }
                } onEdit: {
                    state.goToStep(.holePars)
                }
                
                // Hole Handicaps Summary Card
                ReviewSummaryCard(
                    title: "Hole Handicaps",
                    icon: "list.number",
                    isComplete: state.isStep4Valid
                ) {
                    if state.isStep4Valid {
                        Text("All 18 rankings assigned ✓")
                            .foregroundStyle(.green)
                    } else {
                        if let error = state.holeHandicapsValidation.errorMessage {
                            Text(error)
                                .foregroundStyle(.red)
                        }
                    }
                    HoleHandicapsPreview(handicaps: state.holeHandicaps)
                } onEdit: {
                    state.goToStep(.holeHandicaps)
                }
                
                // Overall Status
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: state.canFinish ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .foregroundStyle(state.canFinish ? .green : .orange)
                        Text(state.canFinish ? "Ready to Save" : "Incomplete Setup")
                            .font(.headline)
                    }
                    
                    if !state.canFinish {
                        Text("Complete all required fields (marked with *) to save the course.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        
                        if !state.isStep1Valid {
                            Label("Course name is required", systemImage: "xmark.circle")
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                        if !state.isStep4Valid {
                            Label("Hole handicap rankings incomplete", systemImage: "xmark.circle")
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(state.canFinish ? .green.opacity(0.1) : .orange.opacity(0.1))
                .cornerRadius(12)
                
                Spacer(minLength: 100)
            }
            .padding()
        }
    }
}

// MARK: - Review Summary Card

struct ReviewSummaryCard<Content: View>: View {
    let title: String
    let icon: String
    let isComplete: Bool
    var isOptional: Bool = false
    @ViewBuilder let content: () -> Content
    let onEdit: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(isComplete ? .green : .orange)
                
                Text(title)
                    .font(.headline)
                
                if isOptional {
                    Text("(Optional)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                Button("Edit") {
                    onEdit()
                }
                .font(.caption)
                .buttonStyle(.bordered)
            }
            
            content()
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isComplete ? .green.opacity(0.3) : .orange.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Previews

struct HoleParsPreview: View {
    let pars: [Int]
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 2) {
                Text("Front:")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(width: 36, alignment: .leading)
                ForEach(0..<9, id: \.self) { i in
                    Text("\(pars[i])")
                        .font(.caption2.monospacedDigit())
                        .frame(width: 18, height: 18)
                        .background(parColor(pars[i]).opacity(0.3))
                        .cornerRadius(3)
                }
                Text("= \(pars[0..<9].reduce(0, +))")
                    .font(.caption2.bold())
            }
            HStack(spacing: 2) {
                Text("Back:")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(width: 36, alignment: .leading)
                ForEach(9..<18, id: \.self) { i in
                    Text("\(pars[i])")
                        .font(.caption2.monospacedDigit())
                        .frame(width: 18, height: 18)
                        .background(parColor(pars[i]).opacity(0.3))
                        .cornerRadius(3)
                }
                Text("= \(pars[9..<18].reduce(0, +))")
                    .font(.caption2.bold())
            }
        }
    }
    
    private func parColor(_ par: Int) -> Color {
        switch par {
        case 3: return .blue
        case 4: return .green
        case 5: return .orange
        default: return .gray
        }
    }
}

struct HoleHandicapsPreview: View {
    let handicaps: [Int]
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 2) {
                Text("1-9:")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(width: 30, alignment: .leading)
                ForEach(0..<9, id: \.self) { i in
                    Text(handicaps[i] > 0 ? "\(handicaps[i])" : "—")
                        .font(.caption2.monospacedDigit())
                        .frame(width: 18, height: 18)
                        .background(handicaps[i] > 0 ? .green.opacity(0.2) : .gray.opacity(0.1))
                        .cornerRadius(3)
                }
            }
            HStack(spacing: 2) {
                Text("10-18:")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(width: 30, alignment: .leading)
                ForEach(9..<18, id: \.self) { i in
                    Text(handicaps[i] > 0 ? "\(handicaps[i])" : "—")
                        .font(.caption2.monospacedDigit())
                        .frame(width: 18, height: 18)
                        .background(handicaps[i] > 0 ? .green.opacity(0.2) : .gray.opacity(0.1))
                        .cornerRadius(3)
                }
            }
        }
    }
}

#Preview("Step 5") {
    let state = CourseWizardState()
    state.courseName = "Pebble Beach Golf Links"
    state.courseLocation = "Monterey, CA"
    state.teeSetName = "Blue"
    state.courseRating = 74.5
    state.slopeRating = 145
    state.par = 72
    state.holeHandicaps = [7, 15, 1, 11, 3, 17, 5, 13, 9, 8, 16, 2, 12, 4, 18, 6, 14, 10]
    
    return WizardStep5Review(state: state)
}
