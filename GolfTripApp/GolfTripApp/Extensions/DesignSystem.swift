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
        static let hero: CGFloat = 64
    }
    
    // MARK: Corner Radius
    enum CornerRadius {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
        static let full: CGFloat = 9999
    }
    
    // MARK: Animation
    enum Animation {
        static let instant: Double = 0.1
        static let fast: Double = 0.2
        static let normal: Double = 0.3
        static let slow: Double = 0.5
        static let celebration: Double = 1.0
        static let dramatic: Double = 1.5
    }
    
    // MARK: Button Sizes
    enum ButtonSize {
        static let small: CGFloat = 44
        static let medium: CGFloat = 56
        static let large: CGFloat = 72
        static let hero: CGFloat = 88
        static let massive: CGFloat = 96  // Augusta-level prominence
    }
}

// MARK: - Colors

extension Color {
    // Augusta National Inspired Palette
    static let augustaGreen = Color(hex: "#004225")  // The iconic Masters green
    static let azaleaPink = Color(hex: "#E91E63")    // Azalea pink accents
    static let magnoliaWhite = Color(hex: "#FDFBF7") // Elegant cream
    static let patrons = Color(hex: "#2E7D32")       // Club green variant
    static let sundayRed = Color(hex: "#C62828")     // Championship red
    
    // Brand Colors
    static let primaryGreen = Color(hex: "#004225")  // Augusta green
    static let primaryGreenVariant = Color(hex: "#2E7D32")
    static let secondaryGold = Color(hex: "#FFD54F")
    static let secondaryGoldDark = Color(hex: "#B8860B")
    static let gold = Color(hex: "#FFD700")
    static let platinum = Color(hex: "#E5E4E2")
    static let bronze = Color(hex: "#CD7F32")
    static let silver = Color(hex: "#C0C0C0")
    
    // Team Colors - Enhanced with gradients support
    static let teamUSA = Color(hex: "#1565C0")
    static let teamUSALight = Color(hex: "#42A5F5")
    static let teamUSADark = Color(hex: "#0D47A1")
    static let teamEurope = Color(hex: "#C62828")
    static let teamEuropeLight = Color(hex: "#EF5350")
    static let teamEuropeDark = Color(hex: "#B71C1C")
    
    // Semantic Colors
    static let success = Color(hex: "#66BB6A")
    static let successLight = Color(hex: "#81C784")
    static let warning = Color(hex: "#FFB74D")
    static let warningLight = Color(hex: "#FFCC80")
    static let error = Color(hex: "#EF5350")
    static let info = Color(hex: "#64B5F6")
    static let infoLight = Color(hex: "#90CAF9")
    
    // Golf Colors
    static let fairway = Color(hex: "#4CAF50")
    static let bunker = Color(hex: "#D7CCC8")
    static let water = Color(hex: "#29B6F6")
    static let rough = Color(hex: "#8BC34A")
    static let greenColor = Color(hex: "#2E7D32")
    
    // Surface Colors (Dark Mode First) - Enhanced
    static let surfaceBackground = Color(hex: "#0A0A0A")
    static let surface = Color(hex: "#141414")
    static let surfaceVariant = Color(hex: "#1E1E1E")
    static let surfaceElevated = Color(hex: "#282828")
    static let surfaceHighlight = Color(hex: "#333333")
    
    // Glass morphism
    static let glassBackground = Color.white.opacity(0.05)
    static let glassBorder = Color.white.opacity(0.1)
    
    // Premium accents
    static let premiumGlow = Color(hex: "#FFD700").opacity(0.3)
    static let championGold = Color(hex: "#D4AF37")
}

// MARK: - Typography

extension Font {
    // Score Fonts (Monospace) - Augusta Premium
    static let scoreMassive = Font.system(size: 96, weight: .black, design: .rounded)
    static let scoreHero = Font.system(size: 80, weight: .black, design: .rounded)
    static let scoreLarge = Font.system(size: 56, weight: .bold, design: .rounded)
    static let scoreMedium = Font.system(size: 40, weight: .bold, design: .rounded)
    static let scoreSmall = Font.system(size: 28, weight: .semibold, design: .rounded)
    
    // Display Fonts - Premium Typography
    static let displayHero = Font.system(size: 64, weight: .black, design: .rounded)
    static let displayLarge = Font.system(size: 48, weight: .black, design: .rounded)
    static let displayMedium = Font.system(size: 36, weight: .bold, design: .rounded)
    static let displaySmall = Font.system(size: 28, weight: .bold, design: .rounded)
    
    // Countdown Fonts
    static let countdown = Font.system(size: 64, weight: .black, design: .monospaced)
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
    
    static func victory() {
        // Triple haptic for celebrations
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            generator.notificationOccurred(.success)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            generator.notificationOccurred(.success)
        }
    }
    
    static func countdown() {
        let generator = UIImpactFeedbackGenerator(style: .rigid)
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
                color: Color.black.opacity(elevation == 0 ? 0 : 0.2 + Double(elevation) * 0.08),
                radius: CGFloat(elevation * 8),
                y: CGFloat(elevation * 4)
            )
    }
    
    /// Apply hero card styling with premium gradient
    func heroCardStyle() -> some View {
        self
            .background(
                ZStack {
                    LinearGradient(
                        colors: [Color.surface, Color.surfaceVariant.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    
                    // Subtle noise texture effect
                    Color.white.opacity(0.02)
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xxl))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xxl)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.15), Color.white.opacity(0.02)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.35), radius: 20, y: 10)
    }
    
    /// Glass morphism effect
    func glassStyle() -> some View {
        self
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl)
                    .stroke(Color.glassBorder, lineWidth: 1)
            )
    }
    
    /// Apply primary button styling with glow
    func primaryButtonStyle() -> some View {
        self
            .font(.headline.weight(.bold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: DesignTokens.ButtonSize.medium)
            .background(
                ZStack {
                    LinearGradient(
                        colors: [Color.accentColor, Color.accentColor.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    
                    // Inner highlight
                    LinearGradient(
                        colors: [Color.white.opacity(0.2), Color.clear],
                        startPoint: .top,
                        endPoint: .center
                    )
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
            .shadow(color: Color.accentColor.opacity(0.4), radius: 12, y: 6)
    }
    
    /// Apply secondary button styling
    func secondaryButtonStyle() -> some View {
        self
            .font(.headline.weight(.semibold))
            .foregroundColor(.accentColor)
            .frame(maxWidth: .infinity)
            .frame(height: DesignTokens.ButtonSize.medium)
            .background(Color.accentColor.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md)
                    .stroke(Color.accentColor.opacity(0.5), lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.md))
    }
    
    /// Apply hero scoring button styling with glow effect
    func heroScoringButtonStyle(teamColor: Color) -> some View {
        self
            .font(.title2.weight(.bold))
            .foregroundColor(.white)
            .frame(height: DesignTokens.ButtonSize.massive)
            .frame(maxWidth: .infinity)
            .background(
                ZStack {
                    // Base gradient
                    LinearGradient(
                        colors: [teamColor, teamColor.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    
                    // Inner glow
                    LinearGradient(
                        colors: [Color.white.opacity(0.3), Color.clear],
                        startPoint: .top,
                        endPoint: .center
                    )
                    
                    // Shimmer effect
                    LinearGradient(
                        colors: [Color.clear, Color.white.opacity(0.1), Color.clear],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.3), Color.white.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: teamColor.opacity(0.6), radius: 20, y: 10)
    }
    
    /// Apply scoring button styling with enhanced feedback
    func scoringButtonStyle(teamColor: Color) -> some View {
        self
            .font(.headline.weight(.bold))
            .foregroundColor(.white)
            .frame(height: DesignTokens.ButtonSize.large)
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
    
    /// Glow effect modifier
    func glow(color: Color, radius: CGFloat = 10) -> some View {
        self
            .shadow(color: color.opacity(0.6), radius: radius / 2)
            .shadow(color: color.opacity(0.4), radius: radius)
            .shadow(color: color.opacity(0.2), radius: radius * 1.5)
    }
}

// MARK: - Custom Animations

extension SwiftUI.Animation {
    static let buttonPress = SwiftUI.Animation.spring(response: 0.2, dampingFraction: 0.6)
    static let scoreChange = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.7)
    static let cardAppear = SwiftUI.Animation.easeOut(duration: 0.3)
    static let celebration = SwiftUI.Animation.easeInOut(duration: 1.0)
    static let bounce = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.5, blendDuration: 0.2)
    static let smooth = SwiftUI.Animation.easeInOut(duration: 0.4)
    static let snappy = SwiftUI.Animation.spring(response: 0.25, dampingFraction: 0.8)
}

// MARK: - Gradient Backgrounds

extension LinearGradient {
    static let heroCard = LinearGradient(
        colors: [Color.surface, Color.surfaceVariant.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let teamUSAGradient = LinearGradient(
        colors: [Color.teamUSALight, Color.teamUSA, Color.teamUSADark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let teamEuropeGradient = LinearGradient(
        colors: [Color.teamEuropeLight, Color.teamEurope, Color.teamEuropeDark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let goldGradient = LinearGradient(
        colors: [Color.gold, Color.secondaryGold, Color.secondaryGoldDark],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let premiumGradient = LinearGradient(
        colors: [Color.surfaceHighlight, Color.surface, Color.surfaceBackground],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let victoryGradient = LinearGradient(
        colors: [Color.gold.opacity(0.3), Color.clear, Color.gold.opacity(0.2)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
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
            ForEach(0..<50, id: \.self) { index in
                ConfettiPiece(
                    color: index % 3 == 0 ? teamColor : (index % 3 == 1 ? .gold : .white),
                    delay: Double(index) * 0.03,
                    index: index
                )
            }
        }
        .onAppear { animate = true }
    }
}

struct ConfettiPiece: View {
    let color: Color
    let delay: Double
    let index: Int
    
    @State private var animate = false
    
    private var randomX: CGFloat {
        CGFloat.random(in: -200...200)
    }
    
    private var randomY: CGFloat {
        CGFloat.random(in: -400...400)
    }
    
    private var randomRotation: Double {
        Double.random(in: 0...720)
    }
    
    private var randomSize: CGFloat {
        CGFloat.random(in: 6...14)
    }
    
    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(color)
            .frame(width: randomSize, height: randomSize * 0.6)
            .offset(
                x: animate ? randomX : 0,
                y: animate ? randomY : -100
            )
            .rotationEffect(.degrees(animate ? randomRotation : 0))
            .opacity(animate ? 0 : 1)
            .animation(
                .easeOut(duration: 2.5).delay(delay),
                value: animate
            )
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                    animate = true
                }
            }
    }
}

// MARK: - Shimmer Effect

struct ShimmerEffect: ViewModifier {
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            Color.clear,
                            Color.white.opacity(0.3),
                            Color.clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + phase * geometry.size.width * 2)
                    .animation(
                        .linear(duration: 1.5).repeatForever(autoreverses: false),
                        value: phase
                    )
                }
            )
            .clipped()
            .onAppear { phase = 1 }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerEffect())
    }
}

// MARK: - Trophy Animation

struct TrophyAnimation: View {
    let teamColor: Color
    let teamName: String
    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0
    @State private var rotation: Double = -10
    @State private var showGlow = false
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ZStack {
                // Glow effect
                if showGlow {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [teamColor.opacity(0.6), Color.clear],
                                center: .center,
                                startRadius: 0,
                                endRadius: 100
                            )
                        )
                        .frame(width: 200, height: 200)
                        .blur(radius: 30)
                }
                
                // Trophy
                Image(systemName: "trophy.fill")
                    .font(.system(size: 100))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.gold, .secondaryGold, .secondaryGoldDark],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .gold.opacity(0.5), radius: 20)
            }
            .scaleEffect(scale)
            .rotationEffect(.degrees(rotation))
            
            Text("\(teamName) WINS!")
                .font(.displayMedium)
                .foregroundColor(teamColor)
                .opacity(opacity)
            
            Text("🎉 CHAMPIONS 🎉")
                .font(.title3.weight(.bold))
                .foregroundColor(.gold)
                .opacity(opacity)
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.5)) {
                scale = 1.0
                rotation = 0
            }
            withAnimation(.easeIn(duration: 0.5).delay(0.3)) {
                opacity = 1
            }
            withAnimation(.easeIn(duration: 0.3).delay(0.5)) {
                showGlow = true
            }
            HapticManager.victory()
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
    var large: Bool = false
    
    @State private var animatedTeamAScore: Double = 0
    @State private var animatedTeamBScore: Double = 0
    @State private var showConfetti = false
    @State private var glowPulse = false
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ZStack {
                // Background glow for winning team
                if showCelebration {
                    let winningColor = teamAScore > teamBScore ? teamAColor : teamBColor
                    Circle()
                        .fill(winningColor.opacity(glowPulse ? 0.3 : 0.1))
                        .frame(width: 300, height: 300)
                        .blur(radius: 60)
                        .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: glowPulse)
                }
                
                HStack(spacing: large ? DesignTokens.Spacing.xxl : DesignTokens.Spacing.xl) {
                    // Team A
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Text(teamAName)
                            .font(.caption.weight(.black))
                            .foregroundColor(teamAColor.opacity(0.9))
                            .textCase(.uppercase)
                            .tracking(1)
                        
                        Text(formatScore(animatedTeamAScore))
                            .font(large ? .scoreHero : .scoreLarge)
                            .foregroundColor(teamAColor)
                            .contentTransition(.numericText())
                            .glow(color: teamAColor, radius: teamAScore > teamBScore ? 15 : 0)
                    }
                    
                    VStack(spacing: DesignTokens.Spacing.xs) {
                        Text("—")
                            .font(.title)
                            .foregroundColor(.secondary.opacity(0.4))
                    }
                    
                    // Team B
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Text(teamBName)
                            .font(.caption.weight(.black))
                            .foregroundColor(teamBColor.opacity(0.9))
                            .textCase(.uppercase)
                            .tracking(1)
                        
                        Text(formatScore(animatedTeamBScore))
                            .font(large ? .scoreHero : .scoreLarge)
                            .foregroundColor(teamBColor)
                            .contentTransition(.numericText())
                            .glow(color: teamBColor, radius: teamBScore > teamAScore ? 15 : 0)
                    }
                }
                
                if showConfetti {
                    ConfettiView(teamColor: teamAScore > teamBScore ? teamAColor : teamBColor)
                }
            }
            
            // Enhanced progress bar
            GeometryReader { geometry in
                let total = max(teamAScore + teamBScore, 1)
                let teamAWidth = (teamAScore / total) * geometry.size.width
                
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.surfaceVariant)
                        .frame(height: 12)
                    
                    // Team A progress
                    HStack(spacing: 2) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(
                                LinearGradient(
                                    colors: [teamAColor, teamAColor.opacity(0.7)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: max(teamAWidth - 1, 4), height: 12)
                        
                        Spacer(minLength: 0)
                        
                        RoundedRectangle(cornerRadius: 6)
                            .fill(
                                LinearGradient(
                                    colors: [teamBColor.opacity(0.7), teamBColor],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(height: 12)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
            }
            .frame(height: 12)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.0)) {
                animatedTeamAScore = teamAScore
                animatedTeamBScore = teamBScore
            }
            if showCelebration {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    showConfetti = true
                    glowPulse = true
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

// MARK: - Magic Number Display

struct MagicNumberDisplay: View {
    let teamName: String
    let pointsNeeded: Double
    let teamColor: Color
    
    @State private var pulse = false
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text("MAGIC NUMBER")
                .font(.caption2.weight(.black))
                .foregroundColor(.secondary)
                .tracking(2)
            
            Text(String(format: "%.1f", pointsNeeded))
                .font(.scoreLarge)
                .foregroundColor(teamColor)
                .scaleEffect(pulse ? 1.05 : 1.0)
                .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: pulse)
            
            Text("\(teamName) needs to win")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(DesignTokens.Spacing.lg)
        .glassStyle()
        .onAppear { pulse = true }
    }
}

// MARK: - Countdown Timer

struct CountdownTimer: View {
    let targetDate: Date
    let title: String
    
    @State private var timeRemaining: (hours: Int, minutes: Int, seconds: Int) = (0, 0, 0)
    @State private var timer: Timer?
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary)
            
            HStack(spacing: DesignTokens.Spacing.md) {
                timeUnit(value: timeRemaining.hours, label: "HR")
                Text(":")
                    .font(.title2.weight(.bold))
                    .foregroundColor(.secondary)
                timeUnit(value: timeRemaining.minutes, label: "MIN")
                Text(":")
                    .font(.title2.weight(.bold))
                    .foregroundColor(.secondary)
                timeUnit(value: timeRemaining.seconds, label: "SEC")
            }
        }
        .onAppear { startTimer() }
        .onDisappear { timer?.invalidate() }
    }
    
    @ViewBuilder
    private func timeUnit(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text(String(format: "%02d", value))
                .font(.countdown)
                .foregroundColor(.primary)
                .contentTransition(.numericText())
            
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundColor(.secondary)
        }
    }
    
    private func startTimer() {
        updateTime()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            updateTime()
        }
    }
    
    private func updateTime() {
        let diff = max(0, targetDate.timeIntervalSince(Date()))
        let hours = Int(diff) / 3600
        let minutes = (Int(diff) % 3600) / 60
        let seconds = Int(diff) % 60
        
        withAnimation(.snappy) {
            timeRemaining = (hours, minutes, seconds)
        }
    }
}

// MARK: - Match Commentary

struct MatchCommentary: View {
    let commentary: String
    let teamColor: Color?
    
    @State private var opacity: Double = 0
    @State private var offset: CGFloat = 20
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            if let color = teamColor {
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
            }
            
            Text(commentary)
                .font(.subheadline.weight(.medium))
                .foregroundColor(.primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(Color.surfaceVariant.opacity(0.8))
        .clipShape(Capsule())
        .opacity(opacity)
        .offset(y: offset)
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                opacity = 1
                offset = 0
            }
        }
    }
}

// MARK: - Shareable Score Card

struct ShareableScoreCard: View {
    let teamAName: String
    let teamBName: String
    let teamAScore: Double
    let teamBScore: Double
    let tripName: String
    let sessionName: String?
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            // Header
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(tripName.uppercased())
                    .font(.caption.weight(.black))
                    .foregroundColor(.gold)
                    .tracking(2)
                
                if let session = sessionName {
                    Text(session)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Score
            HStack(spacing: DesignTokens.Spacing.xxl) {
                VStack {
                    Text(teamAName)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.teamUSA)
                    Text(String(format: "%.1f", teamAScore))
                        .font(.scoreLarge)
                        .foregroundColor(.teamUSA)
                }
                
                Text("vs")
                    .font(.headline)
                    .foregroundColor(.secondary)
                
                VStack {
                    Text(teamBName)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.teamEurope)
                    Text(String(format: "%.1f", teamBScore))
                        .font(.scoreLarge)
                        .foregroundColor(.teamEurope)
                }
            }
            
            // Footer
            HStack {
                Image(systemName: "trophy.fill")
                    .foregroundColor(.gold)
                Text("Ryder Cup")
                    .font(.caption.weight(.bold))
            }
            .foregroundColor(.secondary)
        }
        .padding(DesignTokens.Spacing.xxl)
        .background(
            LinearGradient(
                colors: [Color.surface, Color.surfaceBackground],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl)
                .stroke(LinearGradient.goldGradient, lineWidth: 2)
        )
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
    
    @State private var iconScale: CGFloat = 0.8
    @State private var iconOpacity: Double = 0
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            // Enhanced icon with animated background
            ZStack {
                // Outer ring
                Circle()
                    .stroke(Color.secondary.opacity(0.1), lineWidth: 2)
                    .frame(width: 120, height: 120)
                
                // Inner gradient circle
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.surfaceVariant, Color.surfaceBackground],
                            center: .center,
                            startRadius: 0,
                            endRadius: 60
                        )
                    )
                    .frame(width: 100, height: 100)
                
                Image(systemName: icon)
                    .font(.system(size: 44))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.secondary, Color.secondary.opacity(0.6)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
            .scaleEffect(iconScale)
            .opacity(iconOpacity)
            
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(title)
                    .font(.title2.weight(.bold))
                
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, DesignTokens.Spacing.xxl)
            
            if let actionTitle = actionTitle, let action = action {
                Button(action: {
                    HapticManager.buttonTap()
                    action()
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text(actionTitle)
                    }
                    .primaryButtonStyle()
                }
                .pressAnimation()
                .padding(.top, DesignTokens.Spacing.md)
                .padding(.horizontal, DesignTokens.Spacing.xxl)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(DesignTokens.Spacing.xl)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.1)) {
                iconScale = 1.0
                iconOpacity = 1
            }
        }
    }
}

/// Avatar view with enhanced styling
struct AvatarView: View {
    let name: String
    let imageData: Data?
    let size: CGFloat
    let teamColor: Color?
    var showGlow: Bool = false
    
    init(name: String, imageData: Data? = nil, size: CGFloat = 32, teamColor: Color? = nil, showGlow: Bool = false) {
        self.name = name
        self.imageData = imageData
        self.size = size
        self.teamColor = teamColor
        self.showGlow = showGlow
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
                // Gradient background based on name
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.surfaceElevated, Color.surfaceVariant],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: size, height: size)
                
                Text(initials)
                    .font(.system(size: size * 0.4, weight: .bold, design: .rounded))
                    .foregroundColor(.primary.opacity(0.8))
            }
            
            if let teamColor = teamColor {
                Circle()
                    .stroke(teamColor, lineWidth: size > 40 ? 3 : 2)
                    .frame(width: size, height: size)
                
                if showGlow {
                    Circle()
                        .stroke(teamColor.opacity(0.4), lineWidth: 4)
                        .frame(width: size + 6, height: size + 6)
                        .blur(radius: 4)
                }
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

// MARK: - Player Tag

struct PlayerTag: View {
    let text: String
    let color: Color
    let icon: String?
    
    init(_ text: String, color: Color = .secondary, icon: String? = nil) {
        self.text = text
        self.color = color
        self.icon = icon
    }
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.caption2)
            }
            Text(text)
                .font(.caption2.weight(.semibold))
        }
        .foregroundColor(color)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xxs)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Status Indicator

struct LiveStatusIndicator: View {
    let text: String
    let color: Color
    
    @State private var pulse = false
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
                .scaleEffect(pulse ? 1.2 : 1.0)
                .opacity(pulse ? 0.7 : 1.0)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulse)
            
            Text(text)
                .font(.caption.weight(.semibold))
                .foregroundColor(color)
        }
        .onAppear { pulse = true }
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

// MARK: - Fireworks Animation

struct FireworksView: View {
    let colors: [Color]
    @State private var particles: [FireworkParticle] = []
    @State private var isAnimating = false
    
    init(colors: [Color] = [.gold, .teamUSA, .teamEurope, .white, .azaleaPink]) {
        self.colors = colors
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(particles) { particle in
                    Circle()
                        .fill(particle.color)
                        .frame(width: particle.size, height: particle.size)
                        .position(particle.position)
                        .opacity(particle.opacity)
                        .blur(radius: particle.blur)
                }
            }
            .onAppear {
                startFireworks(in: geometry.size)
            }
        }
    }
    
    private func startFireworks(in size: CGSize) {
        // Create multiple bursts
        for burstIndex in 0..<5 {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(burstIndex) * 0.3) {
                createBurst(at: CGPoint(
                    x: CGFloat.random(in: size.width * 0.2...size.width * 0.8),
                    y: CGFloat.random(in: size.height * 0.2...size.height * 0.6)
                ))
            }
        }
    }
    
    private func createBurst(at center: CGPoint) {
        let particleCount = 20
        var newParticles: [FireworkParticle] = []
        
        for i in 0..<particleCount {
            let angle = (Double(i) / Double(particleCount)) * 2 * .pi
            let speed = CGFloat.random(in: 80...150)
            let color = colors.randomElement() ?? .gold
            
            let particle = FireworkParticle(
                id: UUID(),
                position: center,
                velocity: CGPoint(x: cos(angle) * speed, y: sin(angle) * speed),
                color: color,
                size: CGFloat.random(in: 4...10),
                opacity: 1.0,
                blur: 0
            )
            newParticles.append(particle)
        }
        
        particles.append(contentsOf: newParticles)
        
        // Animate particles
        withAnimation(.easeOut(duration: 1.5)) {
            for i in particles.indices {
                particles[i].position.x += particles[i].velocity.x
                particles[i].position.y += particles[i].velocity.y + 50 // gravity
                particles[i].opacity = 0
                particles[i].blur = 2
            }
        }
        
        // Clean up
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            particles.removeAll { $0.opacity < 0.1 }
        }
    }
}

struct FireworkParticle: Identifiable {
    let id: UUID
    var position: CGPoint
    var velocity: CGPoint
    var color: Color
    var size: CGFloat
    var opacity: Double
    var blur: CGFloat
}

// MARK: - Champion Crown Badge

struct ChampionCrown: View {
    let rank: Int
    let size: CGFloat
    
    var body: some View {
        ZStack {
            if rank == 1 {
                // Gold crown
                Image(systemName: "crown.fill")
                    .font(.system(size: size))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.gold, .secondaryGold, .secondaryGoldDark],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .gold.opacity(0.5), radius: 4)
            } else if rank == 2 {
                // Silver
                Image(systemName: "crown.fill")
                    .font(.system(size: size * 0.9))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.platinum, .silver, .gray],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .gray.opacity(0.3), radius: 2)
            } else if rank == 3 {
                // Bronze
                Image(systemName: "crown.fill")
                    .font(.system(size: size * 0.85))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.bronze, .bronze.opacity(0.7), .brown],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .brown.opacity(0.3), radius: 2)
            }
        }
    }
}

// MARK: - Performance Badge

struct PerformanceBadge: View {
    enum BadgeType {
        case hotStreak
        case clutch
        case ironMan
        case rookie
        case veteran
        case captain
        
        var icon: String {
            switch self {
            case .hotStreak: return "flame.fill"
            case .clutch: return "star.fill"
            case .ironMan: return "figure.golf"
            case .rookie: return "sparkles"
            case .veteran: return "medal.fill"
            case .captain: return "crown.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .hotStreak: return .orange
            case .clutch: return .gold
            case .ironMan: return .teamUSA
            case .rookie: return .azaleaPink
            case .veteran: return .augustaGreen
            case .captain: return .secondaryGold
            }
        }
        
        var label: String {
            switch self {
            case .hotStreak: return "Hot Streak"
            case .clutch: return "Clutch"
            case .ironMan: return "Iron Man"
            case .rookie: return "Rookie"
            case .veteran: return "Veteran"
            case .captain: return "Captain"
            }
        }
    }
    
    let type: BadgeType
    var showLabel: Bool = false
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: type.icon)
                .font(.caption2)
                .foregroundColor(type.color)
            
            if showLabel {
                Text(type.label)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(type.color)
            }
        }
        .padding(.horizontal, showLabel ? DesignTokens.Spacing.sm : DesignTokens.Spacing.xs)
        .padding(.vertical, DesignTokens.Spacing.xxs)
        .background(type.color.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Premium Momentum Graph

struct MomentumGraph: View {
    let results: [MatchResult]
    let teamAColor: Color
    let teamBColor: Color
    
    @State private var animationProgress: CGFloat = 0
    
    enum MatchResult {
        case teamAWin
        case teamBWin
        case halved
    }
    
    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            let stepWidth = width / CGFloat(max(results.count - 1, 1))
            
            ZStack {
                // Background grid
                ForEach(0..<5) { i in
                    Rectangle()
                        .fill(Color.secondary.opacity(0.1))
                        .frame(height: 1)
                        .offset(y: CGFloat(i) * height / 4 - height / 2)
                }
                
                // Center line
                Rectangle()
                    .fill(Color.secondary.opacity(0.3))
                    .frame(height: 2)
                
                // Momentum line
                Path { path in
                    var cumulativeScore: CGFloat = 0
                    let maxScore: CGFloat = 5
                    
                    for (index, result) in results.enumerated() {
                        switch result {
                        case .teamAWin: cumulativeScore += 1
                        case .teamBWin: cumulativeScore -= 1
                        case .halved: break
                        }
                        
                        let x = CGFloat(index) * stepWidth
                        let normalizedScore = cumulativeScore / maxScore
                        let y = height / 2 - normalizedScore * (height / 2 - 10)
                        
                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: height / 2))
                            path.addLine(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .trim(from: 0, to: animationProgress)
                .stroke(
                    LinearGradient(
                        colors: [teamAColor, .primary, teamBColor],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round)
                )
                
                // Result dots
                ForEach(Array(results.enumerated()), id: \.offset) { index, result in
                    let x = CGFloat(index) * stepWidth
                    let cumulativeScore = results.prefix(index + 1).reduce(0) { acc, r in
                        switch r {
                        case .teamAWin: return acc + 1
                        case .teamBWin: return acc - 1
                        case .halved: return acc
                        }
                    }
                    let normalizedScore = CGFloat(cumulativeScore) / 5
                    let y = height / 2 - normalizedScore * (height / 2 - 10)
                    
                    Circle()
                        .fill(dotColor(for: result))
                        .frame(width: 10, height: 10)
                        .position(x: x, y: y)
                        .opacity(Double(animationProgress) > Double(index) / Double(results.count) ? 1 : 0)
                }
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.5)) {
                animationProgress = 1
            }
        }
    }
    
    private func dotColor(for result: MatchResult) -> Color {
        switch result {
        case .teamAWin: return teamAColor
        case .teamBWin: return teamBColor
        case .halved: return .secondary
        }
    }
}

// MARK: - Branded Share Card

struct BrandedShareCard: View {
    let tripName: String
    let teamAName: String
    let teamBName: String
    let teamAScore: Double
    let teamBScore: Double
    let sessionInfo: String?
    let date: Date
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with Augusta-style branding
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(LinearGradient.goldGradient)
                
                Text(tripName.uppercased())
                    .font(.headline.weight(.black))
                    .foregroundColor(.gold)
                    .tracking(3)
                
                if let session = sessionInfo {
                    Text(session)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, DesignTokens.Spacing.xl)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [Color.augustaGreen.opacity(0.9), Color.augustaGreen],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            
            // Score section
            VStack(spacing: DesignTokens.Spacing.lg) {
                HStack(spacing: DesignTokens.Spacing.xxxl) {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Text(teamAName)
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(.teamUSA)
                        
                        Text(formatScore(teamAScore))
                            .font(.scoreLarge)
                            .foregroundColor(.teamUSA)
                    }
                    
                    VStack {
                        Text("VS")
                            .font(.caption.weight(.black))
                            .foregroundColor(.secondary)
                    }
                    
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Text(teamBName)
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(.teamEurope)
                        
                        Text(formatScore(teamBScore))
                            .font(.scoreLarge)
                            .foregroundColor(.teamEurope)
                    }
                }
                
                // Date
                Text(date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(DesignTokens.Spacing.xxl)
            .background(Color.surface)
            
            // Footer
            HStack {
                Image(systemName: "flag.fill")
                    .foregroundColor(.augustaGreen)
                Text("Ryder Cup Companion")
                    .font(.caption2.weight(.bold))
            }
            .foregroundColor(.secondary)
            .padding(.vertical, DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity)
            .background(Color.surfaceVariant)
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl)
                .stroke(
                    LinearGradient(
                        colors: [.gold.opacity(0.5), .gold.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 2
                )
        )
        .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
    }
    
    private func formatScore(_ score: Double) -> String {
        if score == floor(score) {
            return String(format: "%.0f", score)
        }
        return String(format: "%.1f", score)
    }
}

// MARK: - Digit Flip Animation

struct DigitFlipView: View {
    let value: Int
    @State private var animatedValue: Int = 0
    
    var body: some View {
        Text("\(animatedValue)")
            .font(.countdown)
            .foregroundColor(.primary)
            .contentTransition(.numericText())
            .onChange(of: value) { _, newValue in
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    animatedValue = newValue
                }
                HapticManager.countdown()
            }
            .onAppear {
                animatedValue = value
            }
    }
}

// MARK: - Skeleton Loading

struct SkeletonView: View {
    @State private var isAnimating = false
    
    var body: some View {
        Rectangle()
            .fill(Color.surfaceVariant)
            .overlay(
                GeometryReader { geometry in
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.clear,
                                    Color.white.opacity(0.1),
                                    Color.clear
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .offset(x: isAnimating ? geometry.size.width : -geometry.size.width)
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.sm))
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
    }
}
