// swift-tools-version:5.9
import PackageDescription

// Note: This Package.swift is provided for reference and syntax verification.
// The primary way to build this app is via the Xcode project (GolfTripApp.xcodeproj).
// When building via SPM, asset catalogs are not included, so the app should be
// built using Xcode for full functionality.

let package = Package(
    name: "GolfTripApp",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "GolfTripAppCore",
            targets: ["GolfTripAppCore"]
        )
    ],
    targets: [
        .target(
            name: "GolfTripAppCore",
            dependencies: [],
            path: "GolfTripApp",
            exclude: ["Resources/Assets.xcassets"],
            sources: [
                "GolfTripApp.swift",
                "Models",
                "Services",
                "Views",
                "Extensions"
            ]
        ),
        .testTarget(
            name: "GolfTripAppTests",
            dependencies: ["GolfTripAppCore"],
            path: "Tests"
        )
    ]
)
