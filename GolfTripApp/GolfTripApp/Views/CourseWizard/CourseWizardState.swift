import SwiftUI
import SwiftData
import Observation

/// Observable state manager for the Course Setup Wizard
@Observable
final class CourseWizardState {
    // MARK: - Step Management
    
    enum WizardStep: Int, CaseIterable {
        case basicInfo = 0
        case teeSetBasics = 1
        case holePars = 2
        case holeHandicaps = 3
        case review = 4
        
        var title: String {
            switch self {
            case .basicInfo: return "Course Info"
            case .teeSetBasics: return "Tee Set"
            case .holePars: return "Hole Pars"
            case .holeHandicaps: return "Handicaps"
            case .review: return "Review"
            }
        }
        
        var stepNumber: Int { rawValue + 1 }
        static var totalSteps: Int { Self.allCases.count }
    }
    
    var currentStep: WizardStep = .basicInfo
    
    // MARK: - Step 1: Basic Course Info
    
    var courseName: String = ""
    var courseLocation: String = ""
    var courseNotes: String = ""
    
    var isStep1Valid: Bool {
        !courseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    // MARK: - Step 2: Tee Set Basics
    
    var teeSetName: String = "Blue"
    var courseRating: Double = 72.0
    var slopeRating: Int = 113
    var par: Int = 72
    var totalYardage: Int?
    
    var teeSetBasicsValidation: CourseWizardValidator.TeeSetBasicsValidationResult {
        CourseWizardValidator.validateTeeSetBasics(rating: courseRating, slope: slopeRating, par: par)
    }
    
    var isStep2Valid: Bool {
        !teeSetName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        teeSetBasicsValidation.isValid
    }
    
    // MARK: - Step 3: Hole Pars (Optional)
    
    enum HoleParsOption: String, CaseIterable {
        case skip = "Skip for now"
        case defaults = "Use common defaults"
        case manual = "Enter manually"
    }
    
    var holeParsOption: HoleParsOption = .skip
    var holePars: [Int] = Array(repeating: 4, count: 18)
    
    var holeParsValidation: CourseWizardValidator.HoleParsValidationResult? {
        guard holeParsOption == .manual else { return nil }
        return CourseWizardValidator.validateHolePars(holePars, expectedTotal: par)
    }
    
    var holeParsTotal: Int {
        holePars.reduce(0, +)
    }
    
    var isStep3Valid: Bool {
        switch holeParsOption {
        case .skip, .defaults:
            return true
        case .manual:
            return holeParsValidation?.isValid ?? false
        }
    }
    
    // MARK: - Step 4: Hole Handicaps (Required)
    
    enum HoleHandicapInputMode: String, CaseIterable {
        case paste = "Paste List"
        case grid = "Quick Grid"
        case rankByHole = "Rank by Hole"
    }
    
    var handicapInputMode: HoleHandicapInputMode = .grid
    var holeHandicaps: [Int] = Array(repeating: 0, count: 18)
    var pastedHandicapText: String = ""
    
    // For rank-by-hole mode
    var currentRankToAssign: Int = 1
    var rankAssignmentHistory: [(hole: Int, rank: Int)] = []
    
    var holeHandicapsValidation: CourseWizardValidator.HoleHandicapValidationResult {
        CourseWizardValidator.validateHoleHandicaps(holeHandicaps)
    }
    
    var isStep4Valid: Bool {
        holeHandicapsValidation.isValid
    }
    
    // MARK: - Step 5: Review - all validation done
    
    var canFinish: Bool {
        isStep1Valid && isStep2Valid && isStep4Valid
    }
    
    var isDraft: Bool {
        !canFinish
    }
    
    // MARK: - Navigation
    
    var canGoNext: Bool {
        switch currentStep {
        case .basicInfo: return isStep1Valid
        case .teeSetBasics: return isStep2Valid
        case .holePars: return true // Optional step
        case .holeHandicaps: return isStep4Valid
        case .review: return false
        }
    }
    
    var canGoBack: Bool {
        currentStep.rawValue > 0
    }
    
    func goToNextStep() {
        if let next = WizardStep(rawValue: currentStep.rawValue + 1) {
            currentStep = next
        }
    }
    
    func goToPreviousStep() {
        if let prev = WizardStep(rawValue: currentStep.rawValue - 1) {
            currentStep = prev
        }
    }
    
    func goToStep(_ step: WizardStep) {
        currentStep = step
    }
    
    // MARK: - Actions
    
    func applyQuickFillPar72() {
        par = 72
        courseRating = 72.0
    }
    
    func applyDefaultPars() {
        holePars = CourseWizardValidator.generateTypicalPars(for: par)
        holeParsOption = .defaults
    }
    
    func parsePastedHandicaps() {
        let result = CourseWizardValidator.parseHandicapList(pastedHandicapText)
        if !result.values.isEmpty {
            // Pad with zeros if needed
            var values = result.values
            while values.count < 18 {
                values.append(0)
            }
            holeHandicaps = Array(values.prefix(18))
        }
    }
    
    func assignRankToHole(_ holeIndex: Int) {
        guard holeIndex >= 0 && holeIndex < 18 else { return }
        guard currentRankToAssign >= 1 && currentRankToAssign <= 18 else { return }
        
        // Check if this rank is already assigned
        if let existingIndex = holeHandicaps.firstIndex(of: currentRankToAssign) {
            holeHandicaps[existingIndex] = 0 // Clear existing
        }
        
        rankAssignmentHistory.append((hole: holeIndex, rank: currentRankToAssign))
        holeHandicaps[holeIndex] = currentRankToAssign
        
        // Auto-advance to next unassigned rank
        let assignedRanks = Set(holeHandicaps.filter { $0 > 0 })
        for rank in 1...18 {
            if !assignedRanks.contains(rank) {
                currentRankToAssign = rank
                break
            }
        }
    }
    
    func undoLastRankAssignment() {
        guard let last = rankAssignmentHistory.popLast() else { return }
        holeHandicaps[last.hole] = 0
        currentRankToAssign = last.rank
    }
    
    func swapHoleHandicaps(_ hole1: Int, _ hole2: Int) {
        guard hole1 >= 0 && hole1 < 18 && hole2 >= 0 && hole2 < 18 else { return }
        let temp = holeHandicaps[hole1]
        holeHandicaps[hole1] = holeHandicaps[hole2]
        holeHandicaps[hole2] = temp
    }
    
    func copyHandicapsFromTeeSet(_ teeSet: TeeSet) {
        holeHandicaps = teeSet.holeHandicaps
    }
    
    func clearAllHandicaps() {
        holeHandicaps = Array(repeating: 0, count: 18)
        currentRankToAssign = 1
        rankAssignmentHistory.removeAll()
    }
    
    // MARK: - Save
    
    func createCourse(in context: ModelContext) -> Course {
        let course = Course(
            name: courseName.trimmingCharacters(in: .whitespacesAndNewlines),
            location: courseLocation.isEmpty ? nil : courseLocation
        )
        context.insert(course)
        return course
    }
    
    func createTeeSet(for course: Course, in context: ModelContext) -> TeeSet {
        // Determine hole pars
        let finalHolePars: [Int]?
        switch holeParsOption {
        case .skip:
            finalHolePars = nil
        case .defaults:
            finalHolePars = CourseWizardValidator.generateTypicalPars(for: par)
        case .manual:
            finalHolePars = holePars
        }
        
        let teeSet = TeeSet(
            name: teeSetName.trimmingCharacters(in: .whitespacesAndNewlines),
            rating: courseRating,
            slope: slopeRating,
            par: par,
            holeHandicaps: holeHandicaps,
            holePars: finalHolePars,
            totalYardage: totalYardage
        )
        teeSet.course = course
        context.insert(teeSet)
        return teeSet
    }
    
    func reset() {
        currentStep = .basicInfo
        courseName = ""
        courseLocation = ""
        courseNotes = ""
        teeSetName = "Blue"
        courseRating = 72.0
        slopeRating = 113
        par = 72
        totalYardage = nil
        holeParsOption = .skip
        holePars = Array(repeating: 4, count: 18)
        handicapInputMode = .grid
        holeHandicaps = Array(repeating: 0, count: 18)
        pastedHandicapText = ""
        currentRankToAssign = 1
        rankAssignmentHistory.removeAll()
    }
}

/// Common tee set name options
extension CourseWizardState {
    static let commonTeeSetNames = ["Blue", "White", "Gold", "Red", "Black", "Green", "Silver"]
    static let commonPars = [70, 71, 72, 73, 74]
}
