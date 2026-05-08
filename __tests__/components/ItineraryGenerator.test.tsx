import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItineraryGenerator } from "@/components/itinerary/ItineraryGenerator";

jest.mock("@/components/itinerary/ItineraryDisplay", () => ({
  ItineraryDisplay: () => <div data-testid="itinerary-display" />,
}));

describe("ItineraryGenerator", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("generates an itinerary and renders the display", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        itinerary: {
          id: "it-1",
          created_at: "2026-05-08T00:00:00Z",
          content: {
            title: "Trip",
            summary: "",
            days: [],
            practical_notes: [],
            total_driving_hours: "0",
          },
        },
      }),
    });

    render(<ItineraryGenerator inquiryId="inq-1" existingItinerary={null} />);

    await userEvent.click(screen.getByRole("button", { name: /generate itinerary/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/itinerary/generate",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(await screen.findByTestId("itinerary-display")).toBeInTheDocument();
  });

  it("edits an existing itinerary", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        itinerary: {
          id: "it-1",
          created_at: "2026-05-08T00:00:00Z",
          content: {
            title: "Trip",
            summary: "",
            days: [],
            practical_notes: [],
            total_driving_hours: "0",
          },
        },
      }),
    });

    render(
      <ItineraryGenerator
        inquiryId="inq-1"
        existingItinerary={{
          id: "it-1",
          created_at: "2026-05-08T00:00:00Z",
          content: {
            title: "Trip",
            summary: "",
            days: [],
            practical_notes: [],
            total_driving_hours: "0",
          },
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /edit itinerary/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/add a beach day in mirissa/i),
      "Add a beach day"
    );
    await userEvent.click(screen.getByRole("button", { name: /apply changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/itinerary/edit",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
