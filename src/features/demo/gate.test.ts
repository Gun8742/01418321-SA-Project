import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DemoGate } from "./gate";
it("does not render demo children unless the feature flag is explicitly enabled", () => {
  const result = renderToStaticMarkup(
    createElement(DemoGate, {
      enabled: false,
      children: createElement("p", null, "SYNTHETIC_SECRET_SCREEN"),
    }),
  );
  expect(result).toContain("โหมดสาธิตปิดอยู่");
  expect(result).not.toContain("SYNTHETIC_SECRET_SCREEN");
});
