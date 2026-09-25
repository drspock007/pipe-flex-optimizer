// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Pure state machine for one request channel (search or solve).
// - Only the latest request id is accepted; older responses are ignored.
// - While a new request runs, a previous result is kept but flagged "refreshing".
// - After an error, no previous result is kept (it would not match the inputs).

export interface ChannelState<T> {
  latestId: number;
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  /** True when data belongs to previous inputs and a new computation is running. */
  refreshing: boolean;
  error: string | null;
}

export type ChannelAction<T> =
  | { type: "request"; id: number }
  | { type: "success"; id: number; data: T }
  | { type: "failure"; id: number; error: string }
  | { type: "reset" };

export const initialChannel = <T,>(): ChannelState<T> =>
  ({ latestId: 0, status: "idle", data: null, refreshing: false, error: null });

export function channelReducer<T>(s: ChannelState<T>, a: ChannelAction<T>): ChannelState<T> {
  switch (a.type) {
    case "request":
      return { latestId: a.id, status: "loading", data: s.data, refreshing: s.data !== null, error: null };
    case "success":
      if (a.id !== s.latestId) return s; // stale response
      return { ...s, status: "ready", data: a.data, refreshing: false, error: null };
    case "failure":
      if (a.id !== s.latestId) return s;
      return { ...s, status: "error", data: null, refreshing: false, error: a.error };
    case "reset":
      // -1 never matches a real request id: any response still in flight is rejected.
      return { ...initialChannel<T>(), latestId: -1 };
  }
}
