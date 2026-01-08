import SwiftUI

/// Step 3: Hole Pars (Optional but recommended)
struct WizardStep3HolePars: View {
    @Bindable var state: CourseWizardState
    @State private var showingFront9 = true
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Hole Pars")
                        .font(.title2.bold())
                    Text("Optional: Enter the par for each hole. This helps with scoring calculations.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                // Option selector
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(CourseWizardState.HoleParsOption.allCases, id: \.self) { option in
                        Button {
                            state.holeParsOption = option
                            if option == .defaults {
                                state.applyDefaultPars()
                            }
                        } label: {
                            HStack {
                                Image(systemName: state.holeParsOption == option ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(state.holeParsOption == option ? .green : .secondary)
                                
                                VStack(alignment: .leading) {
                                    Text(option.rawValue)
                                        .font(.headline)
                                    Text(optionDescription(option))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                
                                Spacer()
                            }
                            .padding()
                            .background(state.holeParsOption == option ? .green.opacity(0.1) : .gray.opacity(0.05))
                            .cornerRadius(12)
                        }
                        .foregroundStyle(.primary)
                    }
                }
                
                // Manual entry grid
                if state.holeParsOption == .manual {
                    VStack(alignment: .leading, spacing: 16) {
                        // Quick actions
                        HStack(spacing: 12) {
                            Button("All 4s") {
                                state.holePars = Array(repeating: 4, count: 18)
                            }
                            .buttonStyle(.bordered)
                            
                            Button("Default \(state.par)") {
                                state.holePars = CourseWizardValidator.generateTypicalPars(for: state.par)
                            }
                            .buttonStyle(.bordered)
                        }
                        
                        // 9-hole toggle
                        Picker("Holes", selection: $showingFront9) {
                            Text("Front 9").tag(true)
                            Text("Back 9").tag(false)
                        }
                        .pickerStyle(.segmented)
                        
                        // Par grid
                        HoleParGridView(
                            pars: $state.holePars,
                            showingFront9: showingFront9,
                            expectedPar: state.par
                        )
                        
                        // Total display
                        HStack {
                            Text("Total:")
                                .font(.headline)
                            Text("\(state.holeParsTotal)")
                                .font(.title2.bold())
                                .foregroundStyle(state.holeParsTotal == state.par ? .green : .red)
                            Text("/ \(state.par)")
                                .foregroundStyle(.secondary)
                        }
                        
                        // Validation
                        if let validation = state.holeParsValidation, !validation.isValid {
                            if let error = validation.errorMessage {
                                InlineValidationBanner(message: error, type: .warning)
                            }
                        }
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                    .cornerRadius(12)
                }
                
                // Preview for defaults option
                if state.holeParsOption == .defaults {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Generated Pars:")
                            .font(.headline)
                        
                        let pars = CourseWizardValidator.generateTypicalPars(for: state.par)
                        HStack(spacing: 4) {
                            ForEach(0..<9, id: \.self) { i in
                                Text("\(pars[i])")
                                    .font(.caption.monospacedDigit())
                                    .frame(width: 24, height: 24)
                                    .background(parColor(pars[i]).opacity(0.3))
                                    .cornerRadius(4)
                            }
                        }
                        HStack(spacing: 4) {
                            ForEach(9..<18, id: \.self) { i in
                                Text("\(pars[i])")
                                    .font(.caption.monospacedDigit())
                                    .frame(width: 24, height: 24)
                                    .background(parColor(pars[i]).opacity(0.3))
                                    .cornerRadius(4)
                            }
                        }
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                    .cornerRadius(12)
                }
                
                Spacer(minLength: 100)
            }
            .padding()
        }
    }
    
    private func optionDescription(_ option: CourseWizardState.HoleParsOption) -> String {
        switch option {
        case .skip:
            return "Default to par 4 for all holes (can edit later)"
        case .defaults:
            return "Auto-generate typical par distribution for par \(state.par)"
        case .manual:
            return "Enter exact par for each hole"
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

/// Grid view for entering hole pars
struct HoleParGridView: View {
    @Binding var pars: [Int]
    let showingFront9: Bool
    let expectedPar: Int
    
    private var holeRange: Range<Int> {
        showingFront9 ? 0..<9 : 9..<18
    }
    
    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 12) {
            ForEach(holeRange, id: \.self) { index in
                VStack(spacing: 4) {
                    Text("Hole \(index + 1)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    HStack(spacing: 4) {
                        Button {
                            if pars[index] > 3 {
                                pars[index] -= 1
                            }
                        } label: {
                            Image(systemName: "minus")
                                .frame(width: 32, height: 32)
                                .background(.gray.opacity(0.2))
                                .cornerRadius(6)
                        }
                        
                        Text("\(pars[index])")
                            .font(.title3.bold().monospacedDigit())
                            .frame(width: 32)
                            .foregroundStyle(parTextColor(pars[index]))
                        
                        Button {
                            if pars[index] < 6 {
                                pars[index] += 1
                            }
                        } label: {
                            Image(systemName: "plus")
                                .frame(width: 32, height: 32)
                                .background(.gray.opacity(0.2))
                                .cornerRadius(6)
                        }
                    }
                }
                .padding(8)
                .background(.ultraThinMaterial)
                .cornerRadius(8)
            }
        }
    }
    
    private func parTextColor(_ par: Int) -> Color {
        switch par {
        case 3: return .blue
        case 4: return .primary
        case 5: return .orange
        default: return .red
        }
    }
}

#Preview("Step 3") {
    WizardStep3HolePars(state: CourseWizardState())
}
