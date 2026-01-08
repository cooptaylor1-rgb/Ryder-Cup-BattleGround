import Foundation

/// Validation service for Course Setup Wizard
/// Contains pure functions for validating wizard input
struct CourseWizardValidator {
    
    // MARK: - Validation Results
    
    struct HoleHandicapValidationResult {
        let isValid: Bool
        let missing: [Int]
        let duplicates: [Int]
        let outOfRange: [Int]
        
        var errorMessage: String? {
            guard !isValid else { return nil }
            var messages: [String] = []
            if !missing.isEmpty {
                messages.append("Missing: \(missing.sorted().map(String.init).joined(separator: ", "))")
            }
            if !duplicates.isEmpty {
                messages.append("Duplicates: \(duplicates.sorted().map(String.init).joined(separator: ", "))")
            }
            if !outOfRange.isEmpty {
                messages.append("Out of range: \(outOfRange.sorted().map(String.init).joined(separator: ", "))")
            }
            return messages.joined(separator: ". ")
        }
        
        static var valid: HoleHandicapValidationResult {
            HoleHandicapValidationResult(isValid: true, missing: [], duplicates: [], outOfRange: [])
        }
    }
    
    struct HoleParsValidationResult {
        let isValid: Bool
        let actualTotal: Int
        let expectedTotal: Int
        let outOfRange: [Int]
        
        var errorMessage: String? {
            guard !isValid else { return nil }
            var messages: [String] = []
            if actualTotal != expectedTotal {
                messages.append("Total par is \(actualTotal), expected \(expectedTotal)")
            }
            if !outOfRange.isEmpty {
                messages.append("Invalid pars at holes: \(outOfRange.map(String.init).joined(separator: ", "))")
            }
            return messages.joined(separator: ". ")
        }
        
        static func valid(total: Int) -> HoleParsValidationResult {
            HoleParsValidationResult(isValid: true, actualTotal: total, expectedTotal: total, outOfRange: [])
        }
    }
    
    struct TeeSetBasicsValidationResult {
        let isValid: Bool
        let ratingError: String?
        let slopeError: String?
        let parError: String?
        
        var errorMessage: String? {
            guard !isValid else { return nil }
            return [ratingError, slopeError, parError].compactMap { $0 }.joined(separator: ". ")
        }
        
        static var valid: TeeSetBasicsValidationResult {
            TeeSetBasicsValidationResult(isValid: true, ratingError: nil, slopeError: nil, parError: nil)
        }
    }
    
    struct ParseResult {
        let values: [Int]
        let isValid: Bool
        let warning: String?
        
        static var empty: ParseResult {
            ParseResult(values: [], isValid: false, warning: "No valid numbers found")
        }
    }
    
    // MARK: - Validation Methods
    
    /// Validate hole handicaps (must be unique 1-18)
    /// - Parameter handicaps: Array of 18 handicap rankings
    /// - Returns: Validation result with missing/duplicate/out-of-range details
    static func validateHoleHandicaps(_ handicaps: [Int]) -> HoleHandicapValidationResult {
        guard handicaps.count == 18 else {
            let missing = Set(1...18).subtracting(Set(handicaps)).sorted()
            return HoleHandicapValidationResult(
                isValid: false,
                missing: missing,
                duplicates: [],
                outOfRange: []
            )
        }
        
        var seen: [Int: Int] = [:] // value -> count
        var outOfRange: [Int] = []
        
        for value in handicaps {
            if value < 1 || value > 18 {
                outOfRange.append(value)
            } else {
                seen[value, default: 0] += 1
            }
        }
        
        let missing = (1...18).filter { seen[$0] == nil }
        let duplicates = seen.filter { $0.value > 1 }.keys.sorted()
        
        let isValid = missing.isEmpty && duplicates.isEmpty && outOfRange.isEmpty
        
        return HoleHandicapValidationResult(
            isValid: isValid,
            missing: missing,
            duplicates: duplicates,
            outOfRange: outOfRange
        )
    }
    
    /// Validate hole pars
    /// - Parameters:
    ///   - pars: Array of 18 hole pars
    ///   - expectedTotal: Expected total par (e.g., 72)
    /// - Returns: Validation result
    static func validateHolePars(_ pars: [Int], expectedTotal: Int) -> HoleParsValidationResult {
        guard pars.count == 18 else {
            return HoleParsValidationResult(
                isValid: false,
                actualTotal: pars.reduce(0, +),
                expectedTotal: expectedTotal,
                outOfRange: []
            )
        }
        
        var outOfRange: [Int] = []
        for (index, par) in pars.enumerated() {
            if par < 3 || par > 6 {
                outOfRange.append(index + 1) // 1-indexed hole number
            }
        }
        
        let actualTotal = pars.reduce(0, +)
        let isValid = actualTotal == expectedTotal && outOfRange.isEmpty
        
        return HoleParsValidationResult(
            isValid: isValid,
            actualTotal: actualTotal,
            expectedTotal: expectedTotal,
            outOfRange: outOfRange
        )
    }
    
    /// Validate tee set basic information
    /// - Parameters:
    ///   - rating: Course rating (typically 60-80)
    ///   - slope: Slope rating (55-155)
    ///   - par: Course par (typically 70-74)
    /// - Returns: Validation result
    static func validateTeeSetBasics(rating: Double, slope: Int, par: Int) -> TeeSetBasicsValidationResult {
        var ratingError: String?
        var slopeError: String?
        var parError: String?
        
        // Rating validation (soft bounds)
        if rating < 55 || rating > 85 {
            ratingError = "Rating should be between 55 and 85"
        }
        
        // Slope validation (hard bounds per USGA)
        if slope < 55 || slope > 155 {
            slopeError = "Slope must be between 55 and 155"
        }
        
        // Par validation
        if par < 60 || par > 80 {
            parError = "Par should be between 60 and 80"
        }
        
        let isValid = ratingError == nil && slopeError == nil && parError == nil
        
        return TeeSetBasicsValidationResult(
            isValid: isValid,
            ratingError: ratingError,
            slopeError: slopeError,
            parError: parError
        )
    }
    
    // MARK: - Paste List Parsing
    
    /// Parse a pasted string of numbers into an array of integers
    /// Accepts delimiters: spaces, commas, semicolons, newlines, tabs
    /// Handles formats like "H1: 7 H2: 13 ..." or "7, 13, 1, ..."
    /// - Parameter input: Raw string input
    /// - Returns: Parse result with values and warnings
    static func parseHandicapList(_ input: String) -> ParseResult {
        guard !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return .empty
        }
        
        // Normalize delimiters - replace all delimiters with spaces
        var normalized = input
        let delimiters: [Character] = [",", ";", "\n", "\r", "\t"]
        for delimiter in delimiters {
            normalized = normalized.replacingOccurrences(of: String(delimiter), with: " ")
        }
        
        // Extract all integers from the string
        let components = normalized.components(separatedBy: .whitespaces)
        var numbers: [Int] = []
        
        for component in components {
            let trimmed = component.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { continue }
            
            // Try to extract a number - handle formats like "H1:", "1:", "7"
            if let extracted = extractNumber(from: trimmed) {
                numbers.append(extracted)
            }
        }
        
        guard !numbers.isEmpty else {
            return .empty
        }
        
        var warning: String?
        if numbers.count > 18 {
            warning = "Found \(numbers.count) values, using first 18"
            numbers = Array(numbers.prefix(18))
        } else if numbers.count < 18 {
            warning = "Found only \(numbers.count) values, need 18"
        }
        
        return ParseResult(values: numbers, isValid: numbers.count == 18, warning: warning)
    }
    
    /// Extract a number from a string component (handles "H1:", "1:", "7", etc.)
    private static func extractNumber(from string: String) -> Int? {
        // Remove common prefixes like "H", "Hole", "#"
        var cleaned = string
            .replacingOccurrences(of: "Hole", with: "", options: .caseInsensitive)
            .replacingOccurrences(of: "H", with: "", options: .caseInsensitive)
            .replacingOccurrences(of: "#", with: "")
            .replacingOccurrences(of: ":", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Try to parse as integer
        if let number = Int(cleaned) {
            return number
        }
        
        // Try extracting just digits
        let digits = cleaned.filter { $0.isNumber }
        if !digits.isEmpty, let number = Int(digits) {
            return number
        }
        
        return nil
    }
    
    // MARK: - Default Generators
    
    /// Generate typical par distribution for a given total par
    /// - Parameter totalPar: Total par (e.g., 72)
    /// - Returns: Array of 18 hole pars
    static func generateTypicalPars(for totalPar: Int) -> [Int] {
        // Standard distribution for par 72: 10 par 4s, 4 par 3s, 4 par 5s
        // Adjust for different totals
        
        let basePar = 72
        let difference = totalPar - basePar
        
        // Start with typical par 72 layout
        var pars = [4, 4, 3, 5, 4, 4, 3, 4, 5,  // Front 9: 36
                    4, 4, 3, 5, 4, 4, 3, 4, 5]  // Back 9: 36
        
        // Adjust if needed (simple algorithm)
        if difference > 0 {
            // Add strokes - convert some 4s to 5s
            var remaining = difference
            for i in 0..<18 where remaining > 0 && pars[i] == 4 {
                pars[i] = 5
                remaining -= 1
            }
        } else if difference < 0 {
            // Remove strokes - convert some 4s to 3s
            var remaining = abs(difference)
            for i in 0..<18 where remaining > 0 && pars[i] == 4 {
                pars[i] = 3
                remaining -= 1
            }
        }
        
        return pars
    }
    
    /// Generate a sequential 1-18 hole handicap ranking
    static func sequentialHandicaps() -> [Int] {
        return Array(1...18)
    }
}
