import SwiftUI
import SwiftData

struct CoursesListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Course.name) private var courses: [Course]
    
    @State private var searchText = ""
    @State private var showingAddCourse = false
    @State private var showingCourseWizard = false
    @State private var courseToDelete: Course?
    @State private var showingDeleteAlert = false
    
    var filteredCourses: [Course] {
        if searchText.isEmpty {
            return courses
        }
        return courses.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.location?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
    
    var body: some View {
        NavigationStack {
            Group {
                if courses.isEmpty {
                    ContentUnavailableView {
                        Label("No Courses", systemImage: "flag")
                    } description: {
                        Text("Add courses to plan your golf trip rounds.")
                    } actions: {
                        VStack(spacing: 12) {
                            Button {
                                showingCourseWizard = true
                            } label: {
                                Label("Course Setup Wizard", systemImage: "wand.and.stars")
                            }
                            .buttonStyle(.borderedProminent)
                            
                            Button("Quick Add") {
                                showingAddCourse = true
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                } else {
                    List {
                        ForEach(filteredCourses) { course in
                            NavigationLink {
                                CourseDetailView(course: course)
                            } label: {
                                CourseRowView(course: course)
                            }
                        }
                        .onDelete(perform: confirmDelete)
                    }
                    .searchable(text: $searchText, prompt: "Search courses")
                }
            }
            .navigationTitle("Courses")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            showingCourseWizard = true
                        } label: {
                            Label("Course Setup Wizard", systemImage: "wand.and.stars")
                        }
                        
                        Button {
                            showingAddCourse = true
                        } label: {
                            Label("Quick Add Course", systemImage: "plus")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddCourse) {
                CourseFormView(mode: .add)
            }
            .fullScreenCover(isPresented: $showingCourseWizard) {
                CourseSetupWizardView()
            }
            .alert("Delete Course?", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    if let course = courseToDelete {
                        deleteCourse(course)
                    }
                }
            } message: {
                if let course = courseToDelete {
                    Text("Are you sure you want to delete \(course.name) and all its tee sets?")
                }
            }
        }
    }
    
    private func confirmDelete(at offsets: IndexSet) {
        if let index = offsets.first {
            courseToDelete = filteredCourses[index]
            showingDeleteAlert = true
        }
    }
    
    private func deleteCourse(_ course: Course) {
        modelContext.delete(course)
        try? modelContext.save()
    }
}

struct CourseRowView: View {
    let course: Course
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(course.name)
                .font(.headline)
            
            HStack(spacing: 8) {
                if let location = course.location, !location.isEmpty {
                    Text(location)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                let teeCount = course.teeSets?.count ?? 0
                if teeCount > 0 {
                    Text("• \(teeCount) tee\(teeCount == 1 ? "" : "s")")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    CoursesListView()
        .modelContainer(for: Course.self, inMemory: true)
}
