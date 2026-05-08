import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateVouchersButton } from "@/app/itineraries/[id]/GenerateVouchersButton";

const hotels = [
  {
    hotel_name: "Hotel One",
    check_in_date: "2026-05-10",
    check_out_date: "2026-05-11",
    no_of_nights: 1,
    location: "Colombo",
  },
  {
    hotel_name: "Hotel One",
    check_in_date: "2026-05-11",
    check_out_date: "2026-05-12",
    no_of_nights: 1,
    location: "Colombo",
  },
];

describe("GenerateVouchersButton", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    (window.alert as jest.Mock).mockRestore();
  });

  it("groups continuous hotel stays and posts grouped payload", async () => {
    const fetchMock = global.fetch as jest.Mock;
    render(
      <GenerateVouchersButton
        itineraryId="it-1"
        inquiryId="inq-1"
        groupInquiryId={null}
        guestName="Alex Guest"
        nationality="US"
        paxAdults={2}
        paxChildren={0}
        hotels={hotels}
        existingVouchersCount={0}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /vouchers/i }));
    expect(screen.getByText(/1 hotel voucher/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /generate 1 voucher/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.hotels).toHaveLength(1);
    expect(payload.hotels[0].no_of_nights).toBe(2);
  });
});
