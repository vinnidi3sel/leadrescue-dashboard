import React from "react";
import { render, screen, within } from "@testing-library/react";
import App from "./App";

function makeCall(overrides = {}) {
  return {
    id: 101,
    created_at: "2026-07-20T15:30:00.000Z",
    caller_name: "Dana Whitfield",
    image_url: null,
    report_json: {
      lead: { name: "Dana Whitfield", phone: "(555) 010-2000" },
      priority: { tier: "Standard", reason: "Routine maintenance" },
      callback: { time: "9–11 AM", period: "Morning", days: ["Mon"], note: "mornings only" },
      recap: "Dana called about <q>a leaking water heater</q>.",
      tone_read: "Calm.",
      dispatch_note: "Routine visit.",
      problem: { title: "Water Heater Leak", detail: "Slow drip", quote: "a leaking water heater" },
    },
    ...overrides,
  };
}

function mockFetchResolving(body) {
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(body) });
}

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe("App data loading", () => {
  it("requests calls for the client id from the query string (default demo-client)", async () => {
    mockFetchResolving([makeCall()]);
    render(<App />);
    await screen.findAllByText("Dana Whitfield");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain("client_id=eq.demo-client");
  });

  it("renders fetched calls and selects the first one", async () => {
    const first = makeCall();
    const second = makeCall({
      id: 102,
      caller_name: "Omar Bennett",
      report_json: { ...makeCall().report_json, lead: { name: "Omar Bennett" } },
    });
    mockFetchResolving([first, second]);
    render(<App />);

    // Both calls appear in the log (log renders twice: sidebar + mobile).
    expect((await screen.findAllByText("Omar Bennett")).length).toBeGreaterThan(0);
    // The first call is selected, so its problem title shows in the report card
    // (the title also appears in the log rows, hence the scoped query).
    const card = document.querySelector(".lr-card");
    expect(within(card).getByText("Water Heater Leak")).toBeInTheDocument();
    // The log items carry the active state for the first call only.
    const activeItems = document.querySelectorAll(".lr-log-item.active");
    expect(activeItems.length).toBeGreaterThan(0);
    activeItems.forEach(el => expect(el.textContent).toContain("Dana Whitfield"));
  });

  it("falls back to sample data when the API returns an empty list", async () => {
    mockFetchResolving([]);
    render(<App />);
    expect((await screen.findAllByText("Margaret Reyes")).length).toBeGreaterThan(0);
  });

  it("falls back to sample data when the API returns an error object instead of an array", async () => {
    mockFetchResolving({ message: "JWT expired" });
    render(<App />);
    expect((await screen.findAllByText("Margaret Reyes")).length).toBeGreaterThan(0);
  });

  it("falls back to sample data when the fetch itself fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    render(<App />);
    expect((await screen.findAllByText("Margaret Reyes")).length).toBeGreaterThan(0);
  });
});

describe("Report resilience to malformed report_json", () => {
  it("renders without crashing when report_json is an empty object", async () => {
    mockFetchResolving([makeCall({ caller_name: "Empty Payload", report_json: {} })]);
    render(<App />);
    await screen.findAllByText("Empty Payload");
    // Missing lead name and problem title both fall back to "Unknown".
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    // Missing callback window falls back to "Anytime".
    expect(screen.getByText("Anytime")).toBeInTheDocument();
  });

  it("renders without crashing when report_json is missing entirely", async () => {
    mockFetchResolving([makeCall({ caller_name: "No Payload", report_json: null })]);
    render(<App />);
    await screen.findAllByText("No Payload");
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });

  it("renders an unknown priority tier using the Standard styling without crashing", async () => {
    const call = makeCall();
    call.report_json.priority = { tier: "Catastrophic", reason: "??" };
    mockFetchResolving([call]);
    render(<App />);
    await screen.findAllByText("Dana Whitfield");
    // The four known tiers still render in the priority box.
    expect(screen.getByText("EMERGENCY")).toBeInTheDocument();
    expect(screen.getByText("QUOTE")).toBeInTheDocument();
  });
});
