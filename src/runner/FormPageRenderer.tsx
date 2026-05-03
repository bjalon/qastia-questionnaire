import type React from "react";
import type {
  CompiledFormPage,
  FormAnswerValue,
  FormAnswers,
} from "../publicTypes";
import { FormElementRenderer } from "./FormElementRenderer";

export type FormPageRendererProps = {
  readonly page: CompiledFormPage;
  readonly answers: FormAnswers;
  readonly errors: ReadonlyMap<string, string>;
  readonly onChange: (questionId: string, value: FormAnswerValue | undefined) => void;
};

export function FormPageRenderer({
  page,
  answers,
  errors,
  onChange,
}: FormPageRendererProps): React.ReactElement {
  return (
    <section className="qf-page" data-page-id={page.id}>
      <header className="qf-page-header">
        <h2>{page.title}</h2>
        {page.description ? <p>{page.description}</p> : null}
      </header>
      <div className="qf-elements">
        {page.elements.map((element) => (
          <FormElementRenderer
            key={element.id}
            element={element}
            value={answers[element.id]}
            error={errors.get(element.id)}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}
