import SwiftUI
import SwiftData

/// Step 4: Hole Handicap Rankings (Required - most important step)
struct WizardStep4HoleHandicaps: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var state: CourseWizardState
    @Query(sort: \Course.name) private var courses: [Course]
    
    @State private var showingFront9 = true
    @State private var showingCopySheet = false
    @State private var swapHole1: Int?
    @State private var swapHole2: Int?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Hole Handicap Rankings")
                            .font(.title2.bold())
                        Text("*")
                            .foregroundStyle(.red)
                            .font(.title2)
                    }
                    Text("Assign a unique ranking 1-18 to each hole (1 = hardest). This is required for stroke allocation.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                // Input mode selector
                Picker("Input Mode", selection: $state.handicapInputMode) {
                    ForEach(CourseWizardState.HoleHandicapInputMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                
                // Copy from existing tee set
                if hasExistingTeeSets {
                    Button {
                        showingCopySheet = true
                    } label: {
                        Label("Copy from Existing Tee Set", systemImage: "doc.on.doc")
                    }
                    .buttonStyle(.bordered)
                }
                
                // Input mode content
                Group {
                    switch state.handicapInputMode {
                    case .paste:
                        PasteHandicapView(state: state)
                    case .grid:
                        QuickGridView(state: state, showingFront9: $showingFront9)
                    case .rankByHole:
                        RankByHoleView(state: state, showingFront9: $showingFront9)
                    }
                }
                
                // Validation status
                let validation = state.holeHandicapsValidation
                if validation.isValid {
                    InlineValidationBanner(message: "All handicap rankings are valid!", type: .success)
                } else if let error = validation.errorMessage {
                    InlineValidationBanner(message: error, type: .error)
                }
                
                // Quick actions
                HStack(spacing: 12) {
                    Button("Clear All") {
                        state.clearAllHandicaps()
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                    
                    if state.handicapInputMode == .rankByHole && !state.rankAssignmentHistory.isEmpty {
                        Button {
                            state.undoLastRankAssignment()
                        } label: {
                            Label("Undo", systemImage: "arrow.uturn.backward")
                        }
                        .buttonStyle(.bordered)
                    }
                }
                
                Spacer(minLength: 100)
            }
            .padding()
        }
        .sheet(isPresented: $showingCopySheet) {
            CopyHandicapsSheet(state: state, courses: courses)
        }
    }
    
    private var hasExistingTeeSets: Bool {
        courses.contains { course in
            (course.teeSets ?? []).contains { !$0.holeHandicaps.isEmpty }
        }
    }
}

// MARK: - Paste Mode

struct PasteHandicapView: View {
    @Bindable var state: CourseWizardState
    @State private var parseResult: CourseWizardValidator.ParseResult?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Paste or type 18 numbers separated by spaces, commas, or newlines:")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            TextEditor(text: $state.pastedHandicapText)
                .frame(height: 120)
                .font(.body.monospaced())
                .padding(8)
                .background(.gray.opacity(0.1))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(.gray.opacity(0.3), lineWidth: 1)
                )
            
            Button {
                parseAndApply()
            } label: {
                Label("Parse & Apply", systemImage: "text.badge.checkmark")
            }
            .buttonStyle(.borderedProminent)
            
            if let result = parseResult {
                if let warning = result.warning {
                    InlineValidationBanner(message: warning, type: .warning)
                }
                
                if !result.values.isEmpty {
                    Text("Parsed values:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    HStack(spacing: 4) {
                        ForEach(0..<min(9, result.values.count), id: \.self) { i in
                            Text("\(result.values[i])")
                                .font(.caption.monospacedDigit())
                                .frame(width: 24, height: 24)
                                .background(.green.opacity(0.2))
                                .cornerRadius(4)
                        }
                    }
                    if result.values.count > 9 {
                        HStack(spacing: 4) {
                            ForEach(9..<min(18, result.values.count), id: \.self) { i in
                                Text("\(result.values[i])")
                                    .font(.caption.monospacedDigit())
                                    .frame(width: 24, height: 24)
                                    .background(.green.opacity(0.2))
                                    .cornerRadius(4)
                            }
                        }
                    }
                }
            }
            
            // Example formats
            VStack(alignment: .leading, spacing: 4) {
                Text("Accepted formats:")
                    .font(.caption.bold())
                Text("• 7 15 1 11 3 17 5 13 9 8 16 2 12 4 18 6 14 10")
                Text("• 7, 15, 1, 11, 3, 17, ...")
                Text("• H1: 7 H2: 15 H3: 1 ...")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }
    
    private func parseAndApply() {
        parseResult = CourseWizardValidator.parseHandicapList(state.pastedHandicapText)
        if let result = parseResult, !result.values.isEmpty {
            var values = result.values
            while values.count < 18 {
                values.append(0)
            }
            state.holeHandicaps = Array(values.prefix(18))
        }
    }
}

// MARK: - Quick Grid Mode

struct QuickGridView: View {
    @Bindable var state: CourseWizardState
    @Binding var showingFront9: Bool
    
    private var holeRange: Range<Int> {
        showingFront9 ? 0..<9 : 9..<18
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // 9/18 toggle
            Picker("Holes", selection: $showingFront9) {
                Text("Front 9 (1-9)").tag(true)
                Text("Back 9 (10-18)").tag(false)
            }
            .pickerStyle(.segmented)
            
            // Grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 12) {
                ForEach(holeRange, id: \.self) { index in
                    HoleHandicapCell(
                        holeNumber: index + 1,
                        handicap: $state.holeHandicaps[index],
                        allHandicaps: state.holeHandicaps
                    )
                }
            }
            
            // Summary
            HandicapSummaryView(handicaps: state.holeHandicaps)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }
}

struct HoleHandicapCell: View {
    let holeNumber: Int
    @Binding var handicap: Int
    let allHandicaps: [Int]
    
    private var isDuplicate: Bool {
        handicap > 0 && allHandicaps.filter { $0 == handicap }.count > 1
    }
    
    var body: some View {
        VStack(spacing: 4) {
            Text("Hole \(holeNumber)")
                .font(.caption)
                .foregroundStyle(.secondary)
            
            TextField("", value: $handicap, format: .number)
                .keyboardType(.numberPad)
                .font(.title2.bold().monospacedDigit())
                .multilineTextAlignment(.center)
                .frame(height: 44)
                .background(backgroundColor)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(borderColor, lineWidth: isDuplicate ? 2 : 1)
                )
        }
    }
    
    private var backgroundColor: Color {
        if handicap == 0 { return .gray.opacity(0.1) }
        if isDuplicate { return .red.opacity(0.1) }
        if handicap < 1 || handicap > 18 { return .orange.opacity(0.1) }
        return .green.opacity(0.1)
    }
    
    private var borderColor: Color {
        if isDuplicate { return .red }
        if handicap > 0 && (handicap < 1 || handicap > 18) { return .orange }
        return .gray.opacity(0.3)
    }
}

// MARK: - Rank by Hole Mode

struct RankByHoleView: View {
    @Bindable var state: CourseWizardState
    @Binding var showingFront9: Bool
    
    private var holeRange: Range<Int> {
        showingFront9 ? 0..<9 : 9..<18
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Current rank indicator
            HStack {
                Text("Tap hole to assign rank:")
                Spacer()
                Text("\(state.currentRankToAssign)")
                    .font(.title.bold())
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(.green)
                    .cornerRadius(22)
            }
            
            // 9/18 toggle
            Picker("Holes", selection: $showingFront9) {
                Text("Front 9 (1-9)").tag(true)
                Text("Back 9 (10-18)").tag(false)
            }
            .pickerStyle(.segmented)
            
            // Hole grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 12) {
                ForEach(holeRange, id: \.self) { index in
                    HoleTapCell(
                        holeNumber: index + 1,
                        currentHandicap: state.holeHandicaps[index],
                        onTap: {
                            state.assignRankToHole(index)
                        }
                    )
                }
            }
            
            // Summary
            HandicapSummaryView(handicaps: state.holeHandicaps)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }
}

struct HoleTapCell: View {
    let holeNumber: Int
    let currentHandicap: Int
    let onTap: () -> Void
    
    var body: some View {
        Button {
            onTap()
        } label: {
            VStack(spacing: 4) {
                Text("Hole \(holeNumber)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(currentHandicap > 0 ? .green.opacity(0.2) : .gray.opacity(0.1))
                        .frame(height: 50)
                    
                    if currentHandicap > 0 {
                        Text("\(currentHandicap)")
                            .font(.title2.bold().monospacedDigit())
                    } else {
                        Text("Tap")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Summary View

struct HandicapSummaryView: View {
    let handicaps: [Int]
    
    private var assigned: Int {
        handicaps.filter { $0 > 0 }.count
    }
    
    private var missing: [Int] {
        let assigned = Set(handicaps.filter { $0 >= 1 && $0 <= 18 })
        return (1...18).filter { !assigned.contains($0) }.sorted()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Progress:")
                    .font(.headline)
                Text("\(assigned)/18 assigned")
                    .foregroundStyle(assigned == 18 ? .green : .orange)
            }
            
            if !missing.isEmpty && missing.count <= 6 {
                Text("Missing: \(missing.map(String.init).joined(separator: ", "))")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
            
            // Visual overview
            HStack(spacing: 2) {
                ForEach(0..<18, id: \.self) { i in
                    Rectangle()
                        .fill(handicaps[i] > 0 ? .green : .gray.opacity(0.3))
                        .frame(height: 8)
                }
            }
            .cornerRadius(4)
        }
    }
}

// MARK: - Copy Sheet

struct CopyHandicapsSheet: View {
    @Environment(\.dismiss) private var dismiss
    let state: CourseWizardState
    let courses: [Course]
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(courses) { course in
                    if let teeSets = course.teeSets, !teeSets.isEmpty {
                        Section(course.name) {
                            ForEach(teeSets) { teeSet in
                                Button {
                                    state.copyHandicapsFromTeeSet(teeSet)
                                    dismiss()
                                } label: {
                                    VStack(alignment: .leading) {
                                        Text(teeSet.displayName)
                                            .font(.headline)
                                        Text("Rating: \(String(format: "%.1f", teeSet.rating)) / Slope: \(teeSet.slope)")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Copy Handicaps")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

#Preview("Step 4") {
    WizardStep4HoleHandicaps(state: CourseWizardState())
        .modelContainer(for: [Course.self, TeeSet.self], inMemory: true)
}
