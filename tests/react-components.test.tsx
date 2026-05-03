/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  compileForm,
  defaultFormRuntime,
  FormDesigner,
  FormRunner,
  type FormSource,
} from "../src";

const source: FormSource = {
  content: `version: 1
kind: form
metadata:
  title: "Test"
pages:
  - id: page_1
    title: "Page 1"
    elements:
      - id: name
        type: question
        questionType: short-text
        title: "Nom"
        required: true
`,
};

describe("FormRunner", () => {
  it("focuses the first invalid control and exposes accessible validation state", async () => {
    const result = compileForm(source);
    if (result.status === "invalid") {
      throw new Error("Expected compilable source");
    }

    render(<FormRunner form={result.form} labels={{ submit: "Valider" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    const input = await screen.findByRole("textbox", { name: /nom/i });
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Cette question est obligatoire.")).toHaveAttribute("id", "name-error");
  });

  it("honors disabled mode", () => {
    const result = compileForm(source);
    if (result.status === "invalid") {
      throw new Error("Expected compilable source");
    }

    render(<FormRunner form={result.form} disabled />);

    expect(screen.getByRole("textbox", { name: /nom/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  });
});

describe("FormDesigner", () => {
  it("emits canvas duplicate and delete actions", async () => {
    const onSourceChange = vi.fn();

    render(
      <FormDesigner
        source={source}
        runtime={defaultFormRuntime}
        storage={false}
        onSourceChange={onSourceChange}
      />,
    );

    fireEvent.click(screen.getByTitle("Dupliquer"));
    expect(onSourceChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: "canvas-duplicate" }),
    );

    const duplicatedSource = onSourceChange.mock.calls.at(-1)?.[0].source as FormSource;
    onSourceChange.mockClear();

    render(
      <FormDesigner
        source={duplicatedSource}
        runtime={defaultFormRuntime}
        storage={false}
        onSourceChange={onSourceChange}
      />,
    );

    fireEvent.click(screen.getAllByTitle("Supprimer")[0]);
    expect(onSourceChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: "canvas-delete" }),
    );
  });
});
