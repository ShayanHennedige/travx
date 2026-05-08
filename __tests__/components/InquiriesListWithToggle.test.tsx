import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InquiriesListWithToggle } from "@/app/inquiries/InquiriesListWithToggle";

jest.mock("@/components/AdminPinModal", () => ({
  AdminPinModal: () => null,
}));

describe("InquiriesListWithToggle", () => {
  it("switches between individual and group views", async () => {
    render(
      <InquiriesListWithToggle
        individualInquiries={[
          {
            id: "i1",
            inquiry_number: "I-001",
            first_name: "Alice",
            last_name: "Smith",
            client_email: "alice@example.com",
            contact_number: "123",
            country: "Sri Lanka",
            arriving_date: "2026-05-01",
            departure_date: "2026-05-05",
            no_of_nights: 4,
            no_of_pax: 2,
            no_of_children: 0,
            rooms_dbl: 1,
            rooms_sgl: 0,
            rooms_tpl: 0,
            rooms_qtpl: 0,
            status: "new",
            priority: "low",
            created_at: "2026-05-01",
          },
        ]}
        groupInquiries={[
          {
            id: "g1",
            inquiry_number: "G-001",
            head_first_name: "Group",
            head_last_name: "Leader",
            client_email: "group@example.com",
            contact_number: "123",
            country: "Sri Lanka",
            arriving_date: "2026-05-01",
            departure_date: "2026-05-05",
            no_of_nights: 4,
            no_of_adults: 5,
            no_of_children: 0,
            rooms_dbl: 2,
            rooms_sgl: 0,
            rooms_tpl: 0,
            rooms_qtpl: 0,
            status: "new",
            priority: "low",
            created_at: "2026-05-01",
          },
        ]}
      />
    );

    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /group/i }));

    expect(screen.getByText(/Group Leader/)).toBeInTheDocument();
  });
});
