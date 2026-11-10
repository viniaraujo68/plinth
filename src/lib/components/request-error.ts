import type { RequestErrorKind } from "../http.js";

export interface RequestErrorCopy {
  title: string;
  message: string;
}

export type RequestErrorLabels = Partial<Record<RequestErrorKind, Partial<RequestErrorCopy>>>;

export const DEFAULT_REQUEST_ERROR_COPY: Record<RequestErrorKind, RequestErrorCopy> = {
  offline: {
    title: "Connection problem",
    message: "The request never reached the server. Check your connection and try again.",
  },
  unauthorized: {
    title: "Sign-in required",
    message: "Your session may have expired. Sign in again to continue.",
  },
  forbidden: {
    title: "Access denied",
    message: "You do not have permission to see this.",
  },
  "not-found": {
    title: "Not found",
    message: "What you asked for does not exist, or has moved.",
  },
  server: {
    title: "Server error",
    message: "The server ran into a problem. Try again in a moment.",
  },
  unknown: {
    title: "Something went wrong",
    message: "The application ran into an unexpected problem.",
  },
};

export const REQUEST_ERROR_ICONS: Record<RequestErrorKind, string[]> = {
  offline: [
    "M12 20h.01",
    "M8.5 16.4a5 5 0 0 1 7 0",
    "M5 12.9a10 10 0 0 1 5.2-2.7",
    "M16.9 11.3a10 10 0 0 1 2.2 1.6",
    "M2 8.8a15 15 0 0 1 4.2-2.6",
    "M10.7 5a15 15 0 0 1 11.3 3.8",
    "m2 2 20 20",
  ],
  unauthorized: [
    "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2",
    "M7 11V7a5 5 0 0 1 10 0v4",
  ],
  forbidden: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20", "m4.9 4.9 14.2 14.2"],
  "not-found": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16", "m21 21-4.3-4.3", "M8.5 11h5"],
  server: [
    "M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2",
    "M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2",
    "M6 6h.01",
    "M6 18h.01",
    "m13 6-4 6h6l-4 6",
  ],
  unknown: [
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
    "M12 9v4",
    "M12 17h.01",
  ],
};
