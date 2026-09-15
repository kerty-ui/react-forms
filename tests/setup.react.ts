import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL does not auto-clean when tests run without globals enabled.
afterEach(() => {
    cleanup();
});
