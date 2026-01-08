import XCTest
@testable import GolfTripAppCore

final class CourseWizardValidatorTests: XCTestCase {
    
    // MARK: - Hole Handicap Validation Tests
    
    func testValidHoleHandicaps() {
        let handicaps = Array(1...18).shuffled()
        let result = CourseWizardValidator.validateHoleHandicaps(handicaps)
        
        XCTAssertTrue(result.isValid)
        XCTAssertTrue(result.missing.isEmpty)
        XCTAssertTrue(result.duplicates.isEmpty)
        XCTAssertTrue(result.outOfRange.isEmpty)
        XCTAssertNil(result.errorMessage)
    }
    
    func testMissingHoleHandicaps() {
        // Missing 7 and 12
        var handicaps = Array(1...18)
        handicaps[6] = 1   // Replace 7 with duplicate 1
        handicaps[11] = 2  // Replace 12 with duplicate 2
        
        let result = CourseWizardValidator.validateHoleHandicaps(handicaps)
        
        XCTAssertFalse(result.isValid)
        XCTAssertEqual(Set(result.missing), Set([7, 12]))
        XCTAssertEqual(Set(result.duplicates), Set([1, 2]))
        XCTAssertNotNil(result.errorMessage)
    }
    
    func testDuplicateHoleHandicaps() {
        // All 1s
        let handicaps = Array(repeating: 1, count: 18)
        let result = CourseWizardValidator.validateHoleHandicaps(handicaps)
        
        XCTAssertFalse(result.isValid)
        XCTAssertEqual(result.duplicates, [1])
        XCTAssertEqual(result.missing.count, 17) // Missing 2-18
    }
    
    func testOutOfRangeHoleHandicaps() {
        var handicaps = Array(1...18)
        handicaps[0] = 0   // Out of range low
        handicaps[17] = 19 // Out of range high
        
        let result = CourseWizardValidator.validateHoleHandicaps(handicaps)
        
        XCTAssertFalse(result.isValid)
        XCTAssertTrue(result.outOfRange.contains(0))
        XCTAssertTrue(result.outOfRange.contains(19))
    }
    
    func testIncorrectCountHoleHandicaps() {
        let handicaps = Array(1...10) // Only 10 values
        let result = CourseWizardValidator.validateHoleHandicaps(handicaps)
        
        XCTAssertFalse(result.isValid)
        XCTAssertFalse(result.missing.isEmpty) // Should have missing values
    }
    
    // MARK: - Hole Pars Validation Tests
    
    func testValidHolePars() {
        let pars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5] // = 72
        let result = CourseWizardValidator.validateHolePars(pars, expectedTotal: 72)
        
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.actualTotal, 72)
        XCTAssertEqual(result.expectedTotal, 72)
        XCTAssertNil(result.errorMessage)
    }
    
    func testIncorrectTotalPars() {
        let pars = Array(repeating: 4, count: 18) // = 72
        let result = CourseWizardValidator.validateHolePars(pars, expectedTotal: 70)
        
        XCTAssertFalse(result.isValid)
        XCTAssertEqual(result.actualTotal, 72)
        XCTAssertEqual(result.expectedTotal, 70)
        XCTAssertNotNil(result.errorMessage)
    }
    
    func testOutOfRangePars() {
        var pars = Array(repeating: 4, count: 18)
        pars[0] = 2  // Invalid - too low
        pars[17] = 7 // Invalid - too high
        
        let result = CourseWizardValidator.validateHolePars(pars, expectedTotal: 73) // Would be 73 with changes
        
        XCTAssertFalse(result.isValid)
        XCTAssertTrue(result.outOfRange.contains(1))  // Hole 1
        XCTAssertTrue(result.outOfRange.contains(18)) // Hole 18
    }
    
    // MARK: - Tee Set Basics Validation Tests
    
    func testValidTeeSetBasics() {
        let result = CourseWizardValidator.validateTeeSetBasics(rating: 72.5, slope: 130, par: 72)
        
        XCTAssertTrue(result.isValid)
        XCTAssertNil(result.ratingError)
        XCTAssertNil(result.slopeError)
        XCTAssertNil(result.parError)
    }
    
    func testInvalidSlope() {
        // Slope too low
        var result = CourseWizardValidator.validateTeeSetBasics(rating: 72.0, slope: 50, par: 72)
        XCTAssertFalse(result.isValid)
        XCTAssertNotNil(result.slopeError)
        
        // Slope too high
        result = CourseWizardValidator.validateTeeSetBasics(rating: 72.0, slope: 160, par: 72)
        XCTAssertFalse(result.isValid)
        XCTAssertNotNil(result.slopeError)
    }
    
    func testInvalidRating() {
        // Rating too low
        var result = CourseWizardValidator.validateTeeSetBasics(rating: 50.0, slope: 113, par: 72)
        XCTAssertFalse(result.isValid)
        XCTAssertNotNil(result.ratingError)
        
        // Rating too high
        result = CourseWizardValidator.validateTeeSetBasics(rating: 90.0, slope: 113, par: 72)
        XCTAssertFalse(result.isValid)
        XCTAssertNotNil(result.ratingError)
    }
    
    // MARK: - Paste List Parsing Tests
    
    func testParseSimpleList() {
        let input = "7 15 1 11 3 17 5 13 9 8 16 2 12 4 18 6 14 10"
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.values.count, 18)
        XCTAssertEqual(result.values, [7, 15, 1, 11, 3, 17, 5, 13, 9, 8, 16, 2, 12, 4, 18, 6, 14, 10])
        XCTAssertNil(result.warning)
    }
    
    func testParseCommaDelimited() {
        let input = "7, 15, 1, 11, 3, 17, 5, 13, 9, 8, 16, 2, 12, 4, 18, 6, 14, 10"
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.values.count, 18)
    }
    
    func testParseNewlineDelimited() {
        let input = """
        7
        15
        1
        11
        3
        17
        5
        13
        9
        8
        16
        2
        12
        4
        18
        6
        14
        10
        """
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.values.count, 18)
    }
    
    func testParseWithHolePrefixes() {
        let input = "H1: 7 H2: 15 H3: 1 H4: 11 H5: 3 H6: 17 H7: 5 H8: 13 H9: 9 H10: 8 H11: 16 H12: 2 H13: 12 H14: 4 H15: 18 H16: 6 H17: 14 H18: 10"
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.values.count, 18)
    }
    
    func testParseMoreThan18Values() {
        let input = "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20"
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertTrue(result.isValid) // Still valid - takes first 18
        XCTAssertEqual(result.values.count, 18)
        XCTAssertNotNil(result.warning)
        XCTAssertTrue(result.warning?.contains("20") ?? false)
    }
    
    func testParseLessThan18Values() {
        let input = "1 2 3 4 5"
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertFalse(result.isValid)
        XCTAssertEqual(result.values.count, 5)
        XCTAssertNotNil(result.warning)
    }
    
    func testParseEmptyString() {
        let result = CourseWizardValidator.parseHandicapList("")
        
        XCTAssertFalse(result.isValid)
        XCTAssertTrue(result.values.isEmpty)
    }
    
    func testParseMixedDelimiters() {
        let input = "7, 15; 1\t11\n3, 17 5, 13, 9; 8\t16, 2, 12\n4, 18, 6, 14, 10"
        let result = CourseWizardValidator.parseHandicapList(input)
        
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.values.count, 18)
    }
    
    // MARK: - Default Generator Tests
    
    func testGenerateTypicalPars72() {
        let pars = CourseWizardValidator.generateTypicalPars(for: 72)
        
        XCTAssertEqual(pars.count, 18)
        XCTAssertEqual(pars.reduce(0, +), 72)
    }
    
    func testGenerateTypicalPars70() {
        let pars = CourseWizardValidator.generateTypicalPars(for: 70)
        
        XCTAssertEqual(pars.count, 18)
        XCTAssertEqual(pars.reduce(0, +), 70)
    }
    
    func testGenerateTypicalPars74() {
        let pars = CourseWizardValidator.generateTypicalPars(for: 74)
        
        XCTAssertEqual(pars.count, 18)
        XCTAssertEqual(pars.reduce(0, +), 74)
    }
    
    func testSequentialHandicaps() {
        let handicaps = CourseWizardValidator.sequentialHandicaps()
        
        XCTAssertEqual(handicaps.count, 18)
        XCTAssertEqual(handicaps, Array(1...18))
    }
}
