import SwiftUI

struct GradeSelectionView: View {
    @ObservedObject var progress = PlayerProgress.shared
    @Environment(\.dismiss) var dismiss
    @State private var selectedGrade: GradeLevel?
    @State private var animateCards = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                AnimatedStormBackground()
                
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text("SELECT YOUR GRADE")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                            .foregroundStyle(StormColors.heroGradient)
                        
                        Text("Difficulty scales to your level")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.top, 20)
                    
                    // Grade Cards
                    VStack(spacing: 16) {
                        ForEach(Array(GradeLevel.allCases.enumerated()), id: \.element.id) { index, grade in
                            GradeCard(
                                grade: grade,
                                isSelected: progress.selectedGrade == grade,
                                delay: Double(index) * 0.1
                            )
                            .onTapGesture {
                                SoundManager.shared.playButtonTap()
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                                    progress.selectedGrade = grade
                                    selectedGrade = grade
                                }
                            }
                            .offset(x: animateCards ? 0 : -300)
                            .animation(
                                .spring(response: 0.6, dampingFraction: 0.7).delay(Double(index) * 0.1),
                                value: animateCards
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer()
                    
                    // Continue Button
                    if selectedGrade != nil {
                        NavigationLink(destination: GameBrowserView(category: nil)) {
                            HStack {
                                Text("LET'S GO")
                                    .font(.title3.bold())
                                Image(systemName: "arrow.right")
                                    .font(.title3.bold())
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 18)
                            .background(StormColors.heroGradient)
                            .cornerRadius(20)
                            .neonGlow(StormColors.neonBlue, radius: 10)
                        }
                        .padding(.horizontal, 20)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    
                    Spacer().frame(height: 30)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(StormColors.neonBlue)
                }
            }
            .onAppear {
                withAnimation { animateCards = true }
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct GradeCard: View {
    let grade: GradeLevel
    let isSelected: Bool
    let delay: Double
    
    @ViewBuilder
    private var gradeBackground: some View {
        if isSelected {
            StormColors.gradeGradient(grade).opacity(0.15)
        } else {
            Color.clear
        }
    }
    
    var body: some View {
        HStack(spacing: 16) {
            // Grade badge
            Text(grade.emoji)
                .font(.system(size: 36))
                .frame(width: 60, height: 60)
                .background(
                    StormColors.gradeGradient(grade).opacity(0.3)
                )
                .cornerRadius(16)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(grade.displayName)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                
                Text(grade.subtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                
                Text("\(GameCatalog.games(for: grade).count) games available")
                    .font(.caption)
                    .foregroundColor(StormColors.gradeColor(grade))
            }
            
            Spacer()
            
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title)
                    .foregroundColor(StormColors.neonGreen)
                    .transition(.scale.combined(with: .opacity))
            } else {
                Image(systemName: "circle")
                    .font(.title)
                    .foregroundColor(.white.opacity(0.3))
            }
        }
        .padding(16)
        .background(gradeBackground)
        .glassCard()
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    isSelected ? StormColors.gradeColor(grade) : Color.clear,
                    lineWidth: 2
                )
        )
    }
}

#Preview {
    GradeSelectionView()
}
