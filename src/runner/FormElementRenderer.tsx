import type React from "react";
import type {
  CompiledFormElement,
  FormAnswerValue,
} from "../publicTypes";
import { QuestionRenderer } from "./QuestionRenderer";

export type FormElementRendererProps = {
  readonly element: CompiledFormElement;
  readonly value: FormAnswerValue | undefined;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange: (questionId: string, value: FormAnswerValue | undefined) => void;
};

export function FormElementRenderer({
  element,
  value,
  error,
  disabled = false,
  onChange,
}: FormElementRendererProps): React.ReactElement {
  if (element.type === "statement") {
    return (
      <section className="qf-statement">
        <h3>{element.title}</h3>
        {element.description ? <p>{element.description}</p> : null}
      </section>
    );
  }

  return <QuestionRenderer question={element} value={value} error={error} disabled={disabled} onChange={onChange} />;
}
