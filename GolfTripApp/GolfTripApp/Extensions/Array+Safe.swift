import Foundation

// MARK: - Array Safe Subscript

extension Array {
    /// Safe array subscript that returns nil for out-of-bounds indices
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}
