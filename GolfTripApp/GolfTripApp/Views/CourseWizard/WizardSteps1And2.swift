import SwiftUI

/// Step 1: Basic Course Information
struct WizardStep1BasicInfo: View {
    @Bindable var state: CourseWizardState
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Course Information")
                        .font(.title2.bold())
                    Text("Enter the basic details about the golf course.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                // Course Name (Required)
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Course Name")
                            .font(.headline)
                        Text("*")
                            .foregroundStyle(.red)
                    }
                    
                    TextField("e.g., Pebble Beach Golf Links", text: $state.courseName)
                        .textFieldStyle(.roundedBorder)
                        .font(.body)
                        .autocorrectionDisabled()
                    
                    if !state.courseName.isEmpty && state.courseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        InlineValidationBanner(message: "Course name cannot be empty", type: .error)
                    }
                }
                
                // Location (Optional)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Location")
                        .font(.headline)
                    
                    TextField("e.g., Monterey, CA", text: $state.courseLocation)
                        .textFieldStyle(.roundedBorder)
                        .font(.body)
                        .textContentType(.addressCity)
                }
                
                // Notes (Optional)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Notes")
                        .font(.headline)
                    
                    TextField("Any additional notes about the course...", text: $state.courseNotes, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...6)
                }
                
                Spacer(minLength: 100)
            }
            .padding()
        }
    }
}

/// Step 2: Tee Set Basic Information
struct WizardStep2TeeSetBasics: View {
    @Bindable var state: CourseWizardState
    @State private var ratingText: String = "72.0"
    @State private var yardageText: String = ""
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Tee Set Details")
                        .font(.title2.bold())
                    Text("Configure the first tee set for \(state.courseName.isEmpty ? "this course" : state.courseName).")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                // Tee Set Name
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Tee Set Name")
                            .font(.headline)
                        Text("*")
                            .foregroundStyle(.red)
                    }
                    
                    // Quick selection chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(CourseWizardState.commonTeeSetNames, id: \.self) { name in
                                Button {
                                    state.teeSetName = name
                                } label: {
                                    Text(name)
                                        .font(.subheadline)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(state.teeSetName == name ? .green : .gray.opacity(0.2))
                                        .foregroundStyle(state.teeSetName == name ? .white : .primary)
                                        .cornerRadius(16)
                                }
                            }
                        }
                    }
                    
                    TextField("Custom name...", text: $state.teeSetName)
                        .textFieldStyle(.roundedBorder)
                }
                
                // Quick Fill Button
                Button {
                    state.applyQuickFillPar72()
                    ratingText = "72.0"
                } label: {
                    Label("Quick Fill: Typical Par 72", systemImage: "wand.and.stars")
                }
                .buttonStyle(.bordered)
                .tint(.green)
                
                // Course Rating
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Course Rating")
                            .font(.headline)
                        Text("*")
                            .foregroundStyle(.red)
                    }
                    
                    HStack {
                        TextField("72.0", text: $ratingText)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.decimalPad)
                            .frame(width: 100)
                            .onChange(of: ratingText) { _, newValue in
                                if let value = Double(newValue) {
                                    state.courseRating = value
                                }
                            }
                        
                        Text("(typically 60-80)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    
                    if let error = state.teeSetBasicsValidation.ratingError {
                        InlineValidationBanner(message: error, type: .warning)
                    }
                }
                
                // Slope Rating
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Slope Rating")
                            .font(.headline)
                        Text("*")
                            .foregroundStyle(.red)
                    }
                    
                    HStack {
                        Stepper(value: $state.slopeRating, in: 55...155, step: 1) {
                            Text("\(state.slopeRating)")
                                .font(.title3.monospacedDigit())
                                .frame(width: 50)
                        }
                        
                        Text("(55-155, standard is 113)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    
                    if let error = state.teeSetBasicsValidation.slopeError {
                        InlineValidationBanner(message: error, type: .error)
                    }
                }
                
                // Par
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Par")
                            .font(.headline)
                        Text("*")
                            .foregroundStyle(.red)
                    }
                    
                    // Quick selection
                    HStack(spacing: 8) {
                        ForEach(CourseWizardState.commonPars, id: \.self) { parValue in
                            Button {
                                state.par = parValue
                            } label: {
                                Text("\(parValue)")
                                    .font(.headline)
                                    .frame(width: 44, height: 44)
                                    .background(state.par == parValue ? .green : .gray.opacity(0.2))
                                    .foregroundStyle(state.par == parValue ? .white : .primary)
                                    .cornerRadius(8)
                            }
                        }
                    }
                }
                
                // Total Yardage (Optional)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Total Yardage")
                        .font(.headline)
                    
                    TextField("e.g., 6800", text: $yardageText)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.numberPad)
                        .frame(width: 120)
                        .onChange(of: yardageText) { _, newValue in
                            state.totalYardage = Int(newValue)
                        }
                }
                
                Spacer(minLength: 100)
            }
            .padding()
        }
        .onAppear {
            ratingText = String(format: "%.1f", state.courseRating)
            if let yardage = state.totalYardage {
                yardageText = "\(yardage)"
            }
        }
    }
}

#Preview("Step 1") {
    WizardStep1BasicInfo(state: CourseWizardState())
}

#Preview("Step 2") {
    WizardStep2TeeSetBasics(state: CourseWizardState())
}
