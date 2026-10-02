import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LiveWorkspace from "./LiveWorkspace";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn<() => Promise<void>>(),
  userId: "first-user",
  query: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useAction: () => mocks.prepare,
  useMutation: () => vi.fn(),
  useQuery: (_query: unknown, args: unknown) => {
    mocks.query(args);
    return args === "skip" ? undefined : [];
  },
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ userId: mocks.userId }),
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === "signed-in" ? children : null,
  UserButton: () => null,
}));
vi.mock("./AppHeader", () => ({ default: () => null }));
vi.mock("./Workspace", () => ({ default: () => <main>Garage bereit</main> }));

beforeEach(() => {
  mocks.prepare.mockReset();
  mocks.query.mockClear();
  mocks.userId = "first-user";
});
afterEach(cleanup);

describe("garage account preparation", () => {
  it("waits for ownership verification before showing the garage", async () => {
    let finish: () => void = () => {
      throw new Error("Preparation was not started");
    };
    mocks.prepare.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<LiveWorkspace />);
    expect(screen.queryByText("Garage bereit")).toBeNull();
    expect(mocks.query.mock.calls.every(([args]) => args === "skip")).toBe(
      true,
    );
    finish();
    await screen.findByText("Garage bereit");
  });

  it("offers a retry after a failed check instead of showing an empty garage", async () => {
    mocks.prepare
      .mockRejectedValueOnce(new Error("Clerk unavailable"))
      .mockResolvedValueOnce();
    render(<LiveWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Erneut versuchen" }),
    );
    await screen.findByText("Garage bereit");
    expect(mocks.prepare).toHaveBeenCalledTimes(2);
  });

  it("checks the next account even if the previous account was ready", async () => {
    mocks.prepare
      .mockResolvedValueOnce()
      .mockImplementationOnce(() => new Promise<void>(() => {}));
    const view = render(<LiveWorkspace />);
    await screen.findByText("Garage bereit");
    mocks.userId = "second-user";
    view.rerender(<LiveWorkspace />);
    expect(screen.queryByText("Garage bereit")).toBeNull();
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
  });
});
