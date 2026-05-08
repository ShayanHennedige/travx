import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardContent } from "@/app/dashboard/DashboardContent";

jest.mock("@/lib/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  }),
}));

jest.mock("@/app/dashboard/TourTracker", () => ({
  TourTracker: () => <div data-testid="tour-tracker" />,
}));

jest.mock("@/app/dashboard/LiveStatusTracker", () => ({
  LiveStatusTracker: () => <div data-testid="status-tracker" />,
}));

describe("DashboardContent", () => {
  it("toggles between dashboard and tracker views", async () => {
    render(
      <DashboardContent
        stats={{
          total: 10,
          individual: 6,
          group: 4,
          new: 2,
          in_progress: 3,
          confirmed: 1,
          activeTours: 2,
        }}
        recentInquiries={[]}
        tours={[]}
        drivers={[]}
        statusTrackerItems={[]}
      />
    );

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /tour tracker/i }));

    expect(screen.getByRole("heading", { name: /tour tracker/i })).toBeInTheDocument();
    expect(screen.getByTestId("tour-tracker")).toBeInTheDocument();
  });
});
