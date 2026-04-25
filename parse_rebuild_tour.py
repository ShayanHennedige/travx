import re

with open("src/app/drivers/TourAssignmentSection.tsx", "r") as f:
    content = f.read()

# Add TourGuide interfaces
content = content.replace("interface Driver {", """interface TourGuide {
  id: string;
  name: string;
  language: string;
  contact_number: string;
}

interface Driver {""")

content = content.replace("vouchers_completed?: boolean; // Indicates if vouchers are completed for this tour", """vouchers_completed?: boolean; // Indicates if vouchers are completed for this tour
  tour_guide_id?: string | null;
  tour_guide_status?: "new" | "in_progress" | "completed" | null;
  tour_guides?: TourGuide | null;""")

content = content.replace("drivers: Driver[];", """drivers: Driver[];
  tourGuides: TourGuide[];""")

content = content.replace("drivers }: TourAssignmentSectionProps", "drivers, tourGuides }: TourAssignmentSectionProps")

content = content.replace("const [selectedDriver, setSelectedDriver] = useState<string>(\"\");", """const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedTourGuide, setSelectedTourGuide] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"driver" | "guide" | null>(null);""")

content = content.replace("const noDriver = !tour.driver_id;", "const noStaff = !tour.driver_id && !tour.tour_guide_id;")
content = content.replace("return noDriver && notEnded && notCancelled;", "return noStaff && notEnded && notCancelled;")

# hasDriver -> hasStaff in Upcoming and Ongoing
content = content.replace("const hasDriver = !!tour.driver_id;", "const hasStaff = !!tour.driver_id || !!tour.tour_guide_id;")
content = content.replace("return hasDriver && isFuture && notCancelled;", "return hasStaff && isFuture && notCancelled;")
content = content.replace("return hasDriver && hasStarted && notEnded && notCancelled;", "return hasStaff && hasStarted && notEnded && notCancelled;")

with open("src/app/drivers/TourAssignmentSection.tsx", "w") as f:
    f.write(content)
