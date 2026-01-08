import SwiftUI
import SwiftData

/// Main container view for the Course Setup Wizard
struct CourseSetupWizardView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @State private var wizardState = CourseWizardState()
    @State private var showingDiscardAlert = false
    @State private var showingSaveDraftAlert = false
    
    // Optional callback when course is created (for returning to schedule item)
    var onCourseCreated: ((Course, TeeSet) -> Void)?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress indicator
                WizardProgressIndicator(
                    currentStep: wizardState.currentStep.stepNumber,
                    totalSteps: CourseWizardState.WizardStep.totalSteps,
                    stepTitles: CourseWizardState.WizardStep.allCases.map { $0.title }
                )
                .padding()
                .background(.ultraThinMaterial)
                
                // Step content
                TabView(selection: $wizardState.currentStep) {
                    WizardStep1BasicInfo(state: wizardState)
                        .tag(CourseWizardState.WizardStep.basicInfo)
                    
                    WizardStep2TeeSetBasics(state: wizardState)
                        .tag(CourseWizardState.WizardStep.teeSetBasics)
                    
                    WizardStep3HolePars(state: wizardState)
                        .tag(CourseWizardState.WizardStep.holePars)
                    
                    WizardStep4HoleHandicaps(state: wizardState)
                        .tag(CourseWizardState.WizardStep.holeHandicaps)
                    
                    WizardStep5Review(state: wizardState)
                        .tag(CourseWizardState.WizardStep.review)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: wizardState.currentStep)
                
                // Navigation buttons
                WizardNavigationBar(
                    state: wizardState,
                    onSave: saveAndFinish,
                    onSaveAndAddAnother: saveAndAddAnotherTeeSet,
                    onSaveDraft: { showingSaveDraftAlert = true }
                )
            }
            .navigationTitle("Course Setup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if wizardState.courseName.isEmpty && wizardState.teeSetName == "Blue" {
                            dismiss()
                        } else {
                            showingDiscardAlert = true
                        }
                    }
                }
            }
            .alert("Discard Changes?", isPresented: $showingDiscardAlert) {
                Button("Discard", role: .destructive) { dismiss() }
                Button("Save Draft") { saveDraft() }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("You have unsaved changes. Would you like to save as a draft?")
            }
            .alert("Save Draft?", isPresented: $showingSaveDraftAlert) {
                Button("Save Draft") { saveDraft() }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("The course will be saved with incomplete data. You can finish it later.")
            }
        }
        .interactiveDismissDisabled(!wizardState.courseName.isEmpty)
    }
    
    private func saveAndFinish() {
        let course = wizardState.createCourse(in: modelContext)
        let teeSet = wizardState.createTeeSet(for: course, in: modelContext)
        
        do {
            try modelContext.save()
            onCourseCreated?(course, teeSet)
            dismiss()
        } catch {
            print("Error saving course: \(error)")
        }
    }
    
    private func saveAndAddAnotherTeeSet() {
        let course = wizardState.createCourse(in: modelContext)
        let _ = wizardState.createTeeSet(for: course, in: modelContext)
        
        do {
            try modelContext.save()
            // Reset tee set fields but keep course
            wizardState.teeSetName = "White"
            wizardState.courseRating = 70.0
            wizardState.slopeRating = 120
            wizardState.holeParsOption = .skip
            wizardState.holeHandicaps = Array(repeating: 0, count: 18)
            wizardState.currentStep = .teeSetBasics
        } catch {
            print("Error saving course: \(error)")
        }
    }
    
    private func saveDraft() {
        // For draft, save with placeholder handicaps if invalid
        if !wizardState.holeHandicapsValidation.isValid {
            wizardState.holeHandicaps = Array(1...18)
        }
        
        let course = wizardState.createCourse(in: modelContext)
        let _ = wizardState.createTeeSet(for: course, in: modelContext)
        
        do {
            try modelContext.save()
            dismiss()
        } catch {
            print("Error saving draft: \(error)")
        }
    }
}

// MARK: - Progress Indicator

struct WizardProgressIndicator: View {
    let currentStep: Int
    let totalSteps: Int
    let stepTitles: [String]
    
    var body: some View {
        VStack(spacing: 8) {
            // Step circles
            HStack(spacing: 0) {
                ForEach(1...totalSteps, id: \.self) { step in
                    HStack(spacing: 0) {
                        // Circle
                        ZStack {
                            Circle()
                                .fill(step <= currentStep ? Color.green : Color.gray.opacity(0.3))
                                .frame(width: 32, height: 32)
                            
                            if step < currentStep {
                                Image(systemName: "checkmark")
                                    .font(.caption.bold())
                                    .foregroundStyle(.white)
                            } else {
                                Text("\(step)")
                                    .font(.caption.bold())
                                    .foregroundStyle(step == currentStep ? .white : .secondary)
                            }
                        }
                        
                        // Connector line
                        if step < totalSteps {
                            Rectangle()
                                .fill(step < currentStep ? Color.green : Color.gray.opacity(0.3))
                                .frame(height: 2)
                        }
                    }
                }
            }
            
            // Current step title
            Text(stepTitles[currentStep - 1])
                .font(.subheadline.bold())
                .foregroundStyle(.primary)
        }
    }
}

// MARK: - Navigation Bar

struct WizardNavigationBar: View {
    let state: CourseWizardState
    let onSave: () -> Void
    let onSaveAndAddAnother: () -> Void
    let onSaveDraft: () -> Void
    
    var body: some View {
        HStack(spacing: 16) {
            // Back button
            if state.canGoBack {
                Button {
                    state.goToPreviousStep()
                } label: {
                    HStack {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                }
                .buttonStyle(.bordered)
            }
            
            Spacer()
            
            // Save Draft (always available after step 1)
            if state.currentStep.rawValue > 0 {
                Button("Save Draft") {
                    onSaveDraft()
                }
                .buttonStyle(.bordered)
                .tint(.orange)
            }
            
            // Next or Finish button
            if state.currentStep == .review {
                Menu {
                    Button {
                        onSave()
                    } label: {
                        Label("Save Course", systemImage: "checkmark.circle")
                    }
                    .disabled(!state.canFinish)
                    
                    Button {
                        onSaveAndAddAnother()
                    } label: {
                        Label("Save & Add Tee Set", systemImage: "plus.circle")
                    }
                    .disabled(!state.canFinish)
                } label: {
                    HStack {
                        Text("Save")
                        Image(systemName: "chevron.down")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!state.canFinish)
            } else {
                Button {
                    state.goToNextStep()
                } label: {
                    HStack {
                        Text("Next")
                        Image(systemName: "chevron.right")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!state.canGoNext)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
    }
}

// MARK: - Inline Validation Banner

struct InlineValidationBanner: View {
    let message: String
    let type: BannerType
    
    enum BannerType {
        case error
        case warning
        case success
        
        var color: Color {
            switch self {
            case .error: return .red
            case .warning: return .orange
            case .success: return .green
            }
        }
        
        var icon: String {
            switch self {
            case .error: return "xmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .success: return "checkmark.circle.fill"
            }
        }
    }
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: type.icon)
            Text(message)
                .font(.caption)
        }
        .foregroundStyle(type.color)
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(type.color.opacity(0.1))
        .cornerRadius(8)
    }
}

#Preview {
    CourseSetupWizardView()
        .modelContainer(for: [Course.self, TeeSet.self], inMemory: true)
}
