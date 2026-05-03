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

const choiceSource: FormSource = {
  content: `version: 1
kind: form
metadata:
  title: "Test"
pages:
  - id: page_1
    title: "Page 1"
    elements:
      - id: colors
        type: question
        questionType: multiple-choice
        title: "Couleurs"
        required: false
        options:
          - Rouge
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
  it("shows the inspector before the searchable palette", () => {
    render(
      <FormDesigner
        source={source}
        runtime={defaultFormRuntime}
        storage={false}
      />,
    );

    const inspector = screen.getByRole("heading", { name: "Inspector" });
    const palette = screen.getByRole("heading", { name: "Palette" });
    expect(inspector.compareDocumentPosition(palette) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(screen.getByRole("searchbox", { name: "Recherche" }), {
      target: { value: "oui" },
    });

    expect(screen.getByRole("button", { name: /Oui \/ non/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Texte court/i })).not.toBeInTheDocument();
  });

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

  it("edits selected question blocks with save and cancel in commit mode", () => {
    const onSourceChange = vi.fn();

    render(
      <FormDesigner
        source={source}
        runtime={defaultFormRuntime}
        storage={false}
        options={{ canvasEditMode: "commit" }}
        onSourceChange={onSourceChange}
      />,
    );

    const questionBlock = screen.getByText("Nom").closest(".qf-element-block");
    if (!questionBlock) {
      throw new Error("Expected question block");
    }
    fireEvent.click(questionBlock);
    fireEvent.change(screen.getByLabelText("Titre de la question"), {
      target: { value: "Nom complet" },
    });
    expect(onSourceChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSourceChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: "inspector-edit" }),
    );
    expect((onSourceChange.mock.calls.at(-1)?.[0].source as FormSource).content).toContain("Nom complet");

    fireEvent.change(screen.getByLabelText("Titre de la question"), {
      target: { value: "Valeur annulee" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByLabelText("Titre de la question")).toHaveValue("Nom");
  });

  it("keeps the selected question while using the inspector and clears it outside", () => {
    render(
      <FormDesigner
        source={source}
        runtime={defaultFormRuntime}
        storage={false}
      />,
    );

    const questionBlock = screen.getByText("Nom").closest(".qf-element-block");
    if (!questionBlock) {
      throw new Error("Expected question block");
    }
    fireEvent.click(questionBlock);
    expect(screen.getByLabelText("Titre de la question")).toBeInTheDocument();

    const inspector = screen.getByRole("heading", { name: "Inspector" }).closest("[data-qf-inspector='true']");
    if (!inspector) {
      throw new Error("Expected inspector");
    }
    fireEvent.pointerDown(inspector);
    expect(screen.getByLabelText("Titre de la question")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText("Titre de la question")).not.toBeInTheDocument();
  });

  it("edits the question type and choice labels from the inspector", () => {
    const onSourceChange = vi.fn();

    render(
      <FormDesigner
        source={choiceSource}
        runtime={defaultFormRuntime}
        storage={false}
        onSourceChange={onSourceChange}
      />,
    );

    const questionBlock = screen.getByText("Couleurs").closest(".qf-element-block");
    if (!questionBlock) {
      throw new Error("Expected question block");
    }
    fireEvent.click(questionBlock);

    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "single-choice" },
    });
    expect((onSourceChange.mock.calls.at(-1)?.[0].source as FormSource).content).toContain("questionType: single-choice");

    fireEvent.change(screen.getByLabelText("Option 1"), {
      target: { value: "Rouge vif" },
    });
    fireEvent.keyDown(screen.getByLabelText("Option 1"), { key: "Tab" });
    fireEvent.change(screen.getByLabelText("Option 2"), {
      target: { value: "Bleu" },
    });

    const content = (onSourceChange.mock.calls.at(-1)?.[0].source as FormSource).content;
    expect(content).toContain("- Rouge vif");
    expect(content).toContain("- Bleu");
    expect(content).not.toContain("value:");
    expect(content).not.toContain("label:");
  });
});
