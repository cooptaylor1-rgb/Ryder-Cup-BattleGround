import SwiftUI
import SwiftData

enum ScheduleItemFormMode {
    case add
    case edit(ScheduleItem)
}

struct ScheduleItemFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Query(sort: \Course.name) private var courses: [Course]
    
    let day: ScheduleDay
    let mode: ScheduleItemFormMode
    
    @State private var type: ScheduleItemType = .teeTime
    @State private var title: String = ""
    @State private var startTime: Date = Date()
    @State private var selectedCourse: Course?
    @State private var selectedTeeSet: TeeSet?
    @State private var notes: String = ""
    
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var showingCourseWizard = false
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Type") {
                    Picker("Item Type", selection: $type) {
                        ForEach(ScheduleItemType.allCases, id: \.self) { itemType in
                            Label(itemType.displayName, systemImage: itemType.iconName)
                                .tag(itemType)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                
                Section("Details") {
                    TextField("Title (optional)", text: $title)
                    
                    DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                }
                
                if type == .teeTime {
                    Section("Course") {
                        if courses.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("No courses available.")
                                    .foregroundStyle(.secondary)
                                
                                Button {
                                    showingCourseWizard = true
                                } label: {
                                    Label("Create New Course", systemImage: "wand.and.stars")
                                }
                                .buttonStyle(.borderedProminent)
                            }
                        } else {
                            Picker("Course", selection: $selectedCourse) {
                                Text("Select a course").tag(nil as Course?)
                                ForEach(courses) { course in
                                    Text(course.name).tag(course as Course?)
                                }
                            }
                            
                            if let course = selectedCourse, !course.sortedTeeSets.isEmpty {
                                Picker("Tee Set", selection: $selectedTeeSet) {
                                    Text("Select tees").tag(nil as TeeSet?)
                                    ForEach(course.sortedTeeSets) { teeSet in
                                        Text(teeSet.displayName).tag(teeSet as TeeSet?)
                                    }
                                }
                            }
                            
                            Button {
                                showingCourseWizard = true
                            } label: {
                                Label("Create New Course", systemImage: "plus.circle")
                            }
                        }
                    }
                }
                
                Section("Notes") {
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(mode.isAdd ? "Add Item" : "Edit Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                    }
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .onChange(of: selectedCourse) { _, newValue in
                // Reset tee set when course changes
                if let course = newValue {
                    selectedTeeSet = course.sortedTeeSets.first
                } else {
                    selectedTeeSet = nil
                }
            }
            .onAppear {
                // Set default time to day's date + morning time
                var components = Calendar.current.dateComponents([.year, .month, .day], from: day.date)
                components.hour = 8
                components.minute = 0
                if let defaultTime = Calendar.current.date(from: components) {
                    startTime = defaultTime
                }
                
                if case .edit(let item) = mode {
                    type = item.type
                    title = item.title ?? ""
                    if let time = item.startTime {
                        startTime = time
                    }
                    selectedTeeSet = item.teeSet
                    selectedCourse = item.teeSet?.course
                    notes = item.notes ?? ""
                }
            }
            .fullScreenCover(isPresented: $showingCourseWizard) {
                CourseSetupWizardView { course, teeSet in
                    // Auto-select the newly created course and tee set
                    selectedCourse = course
                    selectedTeeSet = teeSet
                }
            }
        }
    }
    
    private func save() {
        switch mode {
        case .add:
            let item = ScheduleItem(
                type: type,
                title: title.isEmpty ? nil : title,
                startTime: startTime,
                notes: notes.isEmpty ? nil : notes
            )
            item.scheduleDay = day
            
            if type == .teeTime {
                item.teeSet = selectedTeeSet
            }
            
            modelContext.insert(item)
            
        case .edit(let item):
            item.type = type
            item.title = title.isEmpty ? nil : title
            item.startTime = startTime
            item.notes = notes.isEmpty ? nil : notes
            item.updatedAt = Date()
            
            if type == .teeTime {
                item.teeSet = selectedTeeSet
            } else {
                item.teeSet = nil
            }
        }
        
        do {
            try modelContext.save()
            dismiss()
        } catch {
            errorMessage = "Failed to save: \(error.localizedDescription)"
            showingError = true
        }
    }
}

extension ScheduleItemFormMode {
    var isAdd: Bool {
        if case .add = self { return true }
        return false
    }
}

#Preview {
    let day = ScheduleDay(date: Date())
    return ScheduleItemFormView(day: day, mode: .add)
        .modelContainer(for: [ScheduleDay.self, ScheduleItem.self, Course.self, TeeSet.self], inMemory: true)
}
