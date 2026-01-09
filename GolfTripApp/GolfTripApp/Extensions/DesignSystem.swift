import SwiftUI

// MARK: - Design Tokens

enum DesignTokens {
    // MARK: Spacing
    enum Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
        static let xxxl: CGFloat = 48
    }
    
    // MARK: Corner Radius
    enum CornerRadius {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let full: CGFloat = 9999
    }
    
    // MARK: Animation
    enum Animation {
        static let instant: Double = 0.1
        static let fast: Double = 0.2
        static let normal: Double = 0.3
        static let slow: Double = 0.5
        static let celebration: Double = 1.0
    }
}

// MARK: - Colors

extension Color {
    // Brand Colors
    static let primaryGreen = Color("PrimaryGreen", bundle: nil)
    static let primaryGreenVariant = Color(hex: "#2E7D32")
    static let secondaryGold = Color(hex: "#FFD54F")
    static let secondaryGoldDark = Color(hex: "#B8860B")
    
    // Team Colors
    static let teamUSA = Color(hex: "#1565C0")
    static let teamUSALight = Color(hex: "#42A5F5")
    static let teamEurope = Color(hex: "#C62828")
    static let teamEuropeLight = Color(hex: "#EF5350")
    
    // Semantic Colors
    static let success = Color(hex: "#66BB6A")
    static let warning = Color(hex: "#FFB74D")
    static let error = Color(hex: "#EF5350")
    static let info = Color(hex: "#64B5F6")
    
    // Golf Colors
    static let fairway = Color(hex: "#4CAF50")
    static let bunker = Color(hex: "#D7CCC8")
    static let water = Color(hex: "#29B6F6")
    static let rough = Color(hex: "#8BC34A")
    static let greenColor = Color(hex: "#2E7D32")
    
    // Surface Colors (Dark Mode First)
    static let surfaceBackground = Color(hex: "#121212")
    static let surface = Color(hex: "#1E1E1E")
    static let surfaceVariant = Color(hex: "#2C2C2C")
    static let surfaceElevated = Color(hex: "#333333")
}

// MARK: - Typography

extension Font {
    // Score Fonts (Monospace)
    static let scoreHero = Font.system(size: 72, weight: .bold, design: .monospaced)
    static let scoreLarge = Font.system(size: 48, weight: .bold, design: .monospaced)
    static let scoreMedium = Font.system(size: 32, weight: .semibold, design: .monospaced)
    static let scoreSmall = Font.system(size: 24, weight: .medium, design: .monospaced)
}

// MARK: - Haptics

struct HapticManager {
    static func buttonTap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
    
    static func scoreEntered() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }
    
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
    
    static func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
    }
    
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
    
    static func heavyImpact() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
    }
}

// MARK: - View Modifiers

extension View {
    /// Apply card styling with enhanced depth
    func cardStyle(elevation: Int = 1) -> some View {
        self
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg)
                    .stroke(Color.white.opacity(0.05), lineWidth: 1)
            )
            .shadow(
                color: Color.black.opacity(elevation == 0 ? 0 : 0.15 + Double(elevation) * 0.05),
                radius: CGFloat(elevation * 6),
                y: CGFloat(elevation * 3)
            )
    }
    
    /// Apply hero card styling with gradient
    func heroCardStyle() -> some View {
        self
            .background(
                LinearGradient(
                    colors: [Color.surface, Color.surfaceVariant.opacity(0.9)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.1), Color.white.opacity(0.02)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.25), radius: 12, y: 6)
    }
    
    /// Apply primary button styling with enhanced depth
    func primaryButtonStyle() -> some View {
        self
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                LinearGradient(
                    colors: [Color.accentColor, Color.accentColor.opacity(0.8)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
            .shadow(color: Color.accentColor.opacity(0.3), radius: 8, y: 4)
    }
    
    /// Apply secondary button styling
    func secondaryButtonStyle() -> some View {
        self
            .font(.headline)
            .foregroundColor(.accentColor)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(Color.accentColor.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                    .stroke(Color.accentColor, lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
    }
    
    /// Apply scoring button styling with enhanced feedback
    func scoringButtonStyle(teamColor: Color) -> some View {
        self
            .font(.headline)
            .foregroundColor(.white)
            .frame(height: 72)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [teamColor, teamColor.opacity(0.75)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
            .shadow(color: teamColor.opacity(0.4), radius: 8, y: 4)
    }
    
    /// Apply badge styling
    func badgeStyle(color: Color) -> some View {
        self
            .font(.subheadline.weight(.semibold))
            .foregroundColor(color)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
}

// MARK: - Custom Animations

extension SwiftUI.Animation {
    static let buttonPress = SwiftUI.Animation.spring(response: 0.2, dampingFraction: 0.6)
    static let scoreChange = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.7)
    static let cardAppear = SwiftUI.Animation.easeOut(duration: 0.3)
    static let celebration = SwiftUI.Animation.easeInOut(duration: 1.0)
}

// MARK: - Gradient Backgrounds

extension LinearGradient {
    static let heroCard = LinearGradient(
        colors: [Color.surface, Color.surfaceVariant.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let teamUSAGradient = LinearGradient(
        colors: [Color.teamUSA, Color.teamUSALight.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let teamEuropeGradient = LinearGradient(
        colors: [Color.teamEurope, Color.teamEuropeLight.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let goldGradient = LinearGradient(
        colors: [Color.secondaryGold, Color.secondaryGoldDark],
        startPoint: .top,
        endPoint: .bottom
    )
}

// MARK: - Pulse Animation Modifier

struct PulseAnimation: ViewModifier {
    @State private var isPulsing = false
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.1 : 1.0)
            .opacity(isPulsing ? 0.8 : 1.0)
            .animation(
                .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear { isPulsing = true }
    }
}

extension View {
    func pulsingAnimation() -> some View {
        modifier(PulseAnimation())
    }
}

// MARK: - Button Press Animation

struct ButtonPressModifier: ViewModifier {
    @State private var isPressed = false
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .animation(.buttonPress, value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in isPressed = true }
                    .onEnded { _ in isPressed = false }
            )
    }
}

extension View {
    func pressAnimation() -> some View {
        modifier(ButtonPressModifier())
    }
}

// MARK: - Confetti View

struct ConfettiView: View {
    let teamColor: Color
    @State private var animate = false
    
    var body: some View {
        ZStack {
            ForEach(0..<30, id: \.self) { index in
                ConfettiPiece(
                    color: index % 2 == 0 ? teamColor : .secondaryGold,
                    delay: Double(index) * 0.05
                )
            }
        }
        .onAppear { animate = true }
    }
}

struct ConfettiPiece: View {
    let color: Color
    let delay: Double
    
    @State private var animate = false
    
    var body: some View {
        Circle()
            .fill(color)
            .frame(width: CGFloat.random(in: 4...10), height: CGFloat.random(in: 4...10))
            .offset(
                x: animate ? CGFloat.random(in: -150...150) : 0,
                y: animate ? CGFloat.random(in: -300...300) : 0
            )
            .opacity(animate ? 0 : 1)
            .animation(
                .easeOut(duration: 2.0).delay(delay),
                value: animate
            )
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    animate = true
                }
            }
    }
}

// MARK: - Custom Components

/// Match status badge
struct MatchStatusBadge: View {
    let status: String
    let teamColor: Color?
    let isLive: Bool
    
    init(status: String, teamColor: Color?, isLive: Bool = false) {
        self.status = status
        self.teamColor = teamColor
        self.isLive = isLive
    }
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            if isLive {
                Circle()
                    .fill(Color.success)
                    .frame(width: 6, height: 6)
                    .pulsingAnimation()
            }
            
            Text(status)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(teamColor ?? .primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background((teamColor ?? Color.gray).opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
    }
}

/// Big score display with enhanced visuals
struct BigScoreDisplay: View {
    let teamAScore: Double
    let teamBScore: Double
    let teamAName: String
    let teamBName: String
    let teamAColor: Color
    let teamBColor: Color
    var showCelebration: Bool = false
    
    @State private var animatedTeamAScore: Double = 0
    @State private var animatedTeamBScore: Double = 0
    @State private var showConfetti = false
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ZStack {
                HStack(spacing: DesignTokens.Spacing.xl) {
                    VStack(spacing: DesignTokens.Spacing.xs) {
                        Text(teamAName)
                            .font(.caption.weight(.bold))
                            .foregroundColor(teamAColor.opacity(0.8))
                            .textCase(.uppercase)
                        Text(formatScore(animatedTeamAScore))
                            .font(.scoreHero)
                            .foregroundColor(teamAColor)
                            .contentTransition(.numericText())
                    }
                    
                    VStack {
                        Text("—")
                            .font(.title2)
                            .foregroundColor(.secondary.opacity(0.6))
                    }
                    
                    VStack(spacing: DesignTokens.Spacing.xs) {
                        Text(teamBName)
                            .font(.caption.weight(.bold))
                            .foregroundColor(teamBColor.opacity(0.8))
                            .textCase(.uppercase)
                        Text(formatScore(animatedTeamBScore))
                            .font(.scoreHero)
                            .foregroundColor(teamBColor)
                            .contentTransition(.numericText())
                    }
                }
                
                if showConfetti {
                    ConfettiView(teamColor: teamAScore > teamBScore ? teamAColor : teamBColor)
                }
            }
            
            // Enhanced progress bar with gradient
            GeometryReader { geometry in
                let total = max(teamAScore + teamBScore, 1)
                let teamAWidth = (teamAScore / total) * geometry.size.width
                
                HStack(spacing: 2) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(LinearGradient(colors: [teamAColor, teamAColor.opacity(0.7)], startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(teamAWidth, 4))
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(LinearGradient(colors: [teamBColor.opacity(0.7), teamBColor], startPoint: .leading, endPoint: .trailing))
                }
            }
            .frame(height: 10)
            .clipShape(RoundedRectangle(cornerRadius: 5))
            .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animatedTeamAScore = teamAScore
                animatedTeamBScore = teamBScore
            }
            if showCelebration {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    showConfetti = true
                }
            }
        }
        .onChange(of: teamAScore) { _, newValue in
            withAnimation(.scoreChange) {
                animatedTeamAScore = newValue
            }
        }
        .onChange(of: teamBScore) { _, newValue in
            withAnimation(.scoreChange) {
                animatedTeamBScore = newValue
            }
        }
    }
    
    private func formatScore(_ score: Double) -> String {
        if score == floor(score) {
            return String(format: "%.0f", score)
        }
        return String(format: "%.1f", score)
    }
}

/// Hole indicator dots
struct HoleIndicatorDots: View {
    let holeResults: [HoleResult]
    let currentHole: Int
    let teamAColor: Color
    let teamBColor: Color
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                ForEach(1...18, id: \.self) { hole in
                    holeDot(for: hole)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
        }
    }
    
    @ViewBuilder
    private func holeDot(for hole: Int) -> some View {
        let result = holeResults.first { $0.holeNumber == hole }
        let isCurrentHole = hole == currentHole
        let size: CGFloat = isCurrentHole ? 12 : 8
        
        ZStack {
            if let result = result {
                Circle()
                    .fill(colorFor(result.winner))
                    .frame(width: size, height: size)
            } else {
                Circle()
                    .stroke(Color.secondary, lineWidth: 1)
                    .frame(width: size, height: size)
            }
            
            if isCurrentHole {
                Circle()
                    .stroke(Color.primary, lineWidth: 2)
                    .frame(width: size + 4, height: size + 4)
            }
        }
    }
    
    private func colorFor(_ winner: HoleWinner) -> Color {
        switch winner {
        case .teamA: return teamAColor
        case .teamB: return teamBColor
        case .halved: return .gray
        }
    }
}

/// Empty state view with enhanced styling
struct EmptyStateView: View {
    let icon: String
    let title: String
    let description: String
    let actionTitle: String?
    let action: (() -> Void)?
    
    init(icon: String, title: String, description: String, actionTitle: String? = nil, action: (() -> Void)? = nil) {
        self.icon = icon
        self.title = title
        self.description = description
        self.actionTitle = actionTitle
        self.action = action
    }
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Enhanced icon with background
            ZStack {
                Circle()
                    .fill(Color.surfaceVariant)
                    .frame(width: 100, height: 100)
                
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 2)
                    .frame(width: 100, height: 100)
                
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundColor(.secondary)
            }
            
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(title)
                    .font(.title3.weight(.bold))
                
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            
            if let actionTitle = actionTitle, let action = action {
                Button(action: {
                    HapticManager.buttonTap()
                    action()
                }) {
                    Text(actionTitle)
                        .primaryButtonStyle()
                }
                .pressAnimation()
                .padding(.top, DesignTokens.Spacing.md)
                .padding(.horizontal, DesignTokens.Spacing.xl)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(DesignTokens.Spacing.xl)
    }
}

/// Avatar view
struct AvatarView: View {
    let name: String
    let imageData: Data?
    let size: CGFloat
    let teamColor: Color?
    
    init(name: String, imageData: Data? = nil, size: CGFloat = 32, teamColor: Color? = nil) {
        self.name = name
        self.imageData = imageData
        self.size = size
        self.teamColor = teamColor
    }
    
    var body: some View {
        ZStack {
            if let data = imageData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else {
                Circle()
                    .fill(Color.surfaceVariant)
                    .frame(width: size, height: size)
                
                Text(initials)
                    .font(.system(size: size * 0.4, weight: .semibold))
                    .foregroundColor(.primary)
            }
            
            if let teamColor = teamColor {
                Circle()
                    .stroke(teamColor, lineWidth: 2)
                    .frame(width: size, height: size)
            }
        }
    }
    
    private var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))"
        } else if !parts.isEmpty {
            return String(parts[0].prefix(2))
        }
        return "?"
    }
}

// MARK: - Preview Provider

#Preview("Design System") {
    VStack(spacing: 24) {
        BigScoreDisplay(
            teamAScore: 8.5,
            teamBScore: 5.5,
            teamAName: "USA",
            teamBName: "EUR",
            teamAColor: .teamUSA,
            teamBColor: .teamEurope
        )
        .padding()
        
        MatchStatusBadge(status: "Team A 2 UP", teamColor: .teamUSA)
        
        HStack {
            AvatarView(name: "John Smith", size: 44, teamColor: .teamUSA)
            AvatarView(name: "Chris Brown", size: 44, teamColor: .teamEurope)
        }
        
        Button("Start Scoring") {
            HapticManager.buttonTap()
        }
        .primaryButtonStyle()
        .padding(.horizontal)
    }
    .preferredColorScheme(.dark)
}
