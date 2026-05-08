import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItinerariesList } from "@/app/itineraries/ItinerariesList";

jest.mock("@/components/AdminPinModal", () => ({
  AdminPinModal: () => null,
}));

describe("ItinerariesList", () => {
  it("filters itineraries by search query", async () => {
    render(
      <ItinerariesList
        itineraries={[
          {
            id: "it-1",
            content: {
              title: "Beach Tour",
              summary: "",
              days: [{ day: 1 }],
              total_driving_hours: "0",
            },
            created_at: "2026-05-01",
            updated_at: "2026-05-02",
            inquiry_id: "inq-1",
            group_inquiry_id: null,
            status: "new",
            type: "individual",
            inquiry: {
              id: "inq-1",
              inquiry_number: "I-001",
              first_name: "Alice",
              last_name: "Smith",
              client_email: "alice@example.com",
              arriving_date: "2026-05-01",
              departure_date: "2026-05-05",
              no_of_nights: 4,
              total_pax: 2,
            },
          },
        ]}
      />
    );

    expect(screen.getByText(/Beach Tour/)).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/search by client, inquiry #, or title/i),
      "mountain"
    );

    expect(screen.queryByText(/Beach Tour/)).not.toBeInTheDocument();
  });
});
