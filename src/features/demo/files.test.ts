import { expect, it } from "vitest";
import { validateDemoFile, MAX_FILE_SIZE } from "./files";
it("accepts a PDF with matching bytes, MIME and extension", async () => {
  expect(
    await validateDemoFile(
      new File(["%PDF-1.7\n"], "sample.pdf", { type: "application/pdf" }),
    ),
  ).toBeNull();
});
it("rejects a forged PDF", async () => {
  expect(
    await validateDemoFile(
      new File(["<html>"], "fake.pdf", { type: "application/pdf" }),
    ),
  ).toBeTruthy();
});
it("rejects empty and oversize files", async () => {
  expect(
    await validateDemoFile(
      new File([], "empty.pdf", { type: "application/pdf" }),
    ),
  ).toBeTruthy();
  expect(
    await validateDemoFile(
      new File([new Uint8Array(MAX_FILE_SIZE + 1)], "big.pdf", {
        type: "application/pdf",
      }),
    ),
  ).toContain("5 MiB");
});
