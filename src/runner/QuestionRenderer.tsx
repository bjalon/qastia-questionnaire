import type React from "react";
import type { ChangeEvent } from "react";
import type {
  CompiledQuestionElement,
  FormAnswerValue,
} from "../publicTypes";

export type QuestionRendererProps = {
  readonly question: CompiledQuestionElement;
  readonly value: FormAnswerValue | undefined;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange: (questionId: string, value: FormAnswerValue | undefined) => void;
};

export function QuestionRenderer({
  question,
  value,
  error,
  disabled = false,
  onChange,
}: QuestionRendererProps): React.ReactElement {
  const describedBy = error ? `${question.id}-error` : undefined;

  return (
    <fieldset className="qf-question" data-question-id={question.id} data-question-type={question.questionType}>
      <legend>
        <span>{question.title}</span>
        {question.required ? <strong aria-label="obligatoire">*</strong> : null}
      </legend>
      {question.description ? <p className="qf-question-description">{question.description}</p> : null}
      {renderControl(question, value, describedBy, disabled, Boolean(error), onChange)}
      {error ? (
        <p className="qf-error" id={`${question.id}-error`}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function renderControl(
  question: CompiledQuestionElement,
  value: FormAnswerValue | undefined,
  describedBy: string | undefined,
  disabled: boolean,
  invalid: boolean,
  onChange: (questionId: string, value: FormAnswerValue | undefined) => void,
): React.ReactElement {
  switch (question.questionType) {
    case "short-text":
      return (
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="qf-input"
          name={question.id}
          disabled={disabled}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(question.id, event.currentTarget.value)}
        />
      );
    case "long-text":
      return (
        <textarea
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="qf-textarea"
          name={question.id}
          disabled={disabled}
          rows={5}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(question.id, event.currentTarget.value)}
        />
      );
    case "yes-no":
      return (
        <div className="qf-segmented" aria-describedby={describedBy}>
          <button
            type="button"
            className={value === true ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onChange(question.id, true)}
          >
            Oui
          </button>
          <button
            type="button"
            className={value === false ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onChange(question.id, false)}
          >
            Non
          </button>
        </div>
      );
    case "single-choice":
      return renderOptions(question, value, describedBy, disabled, invalid, onChange, "radio");
    case "multiple-choice":
      return renderOptions(question, value, describedBy, disabled, invalid, onChange, "checkbox");
    case "dropdown":
      return (
        <select
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="qf-input"
          name={question.id}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(question.id, event.currentTarget.value || undefined)}
        >
          <option value="">Selectionner</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "number":
      return (
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="qf-input"
          name={question.id}
          disabled={disabled}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) => onChange(question.id, parseNumberValue(event))}
        />
      );
    case "date":
      return (
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="qf-input"
          name={question.id}
          disabled={disabled}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(question.id, event.currentTarget.value || undefined)}
        />
      );
    case "linear-scale":
      return renderScale(question, value, describedBy, disabled, onChange);
    case "rating":
      return renderRating(question, value, describedBy, disabled, onChange);
    default:
      return (
        <p className="qf-unsupported" aria-describedby={describedBy}>
          Type de question non rendu.
        </p>
      );
  }
}

function renderOptions(
  question: CompiledQuestionElement,
  value: FormAnswerValue | undefined,
  describedBy: string | undefined,
  disabled: boolean,
  invalid: boolean,
  onChange: (questionId: string, value: FormAnswerValue | undefined) => void,
  inputType: "radio" | "checkbox",
): React.ReactElement {
  const selectedValues = Array.isArray(value) ? value : [];

  return (
    <div className="qf-options" aria-describedby={describedBy}>
      {question.options.map((option) => {
        const checked = inputType === "checkbox" ? selectedValues.includes(option.value) : value === option.value;
        return (
          <label key={option.value}>
            <input
              type={inputType}
              name={question.id}
              value={option.value}
              checked={checked}
              disabled={disabled}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              onChange={(event) => {
                if (inputType === "radio") {
                  onChange(question.id, option.value);
                  return;
                }

                const nextValue = toggleOption(selectedValues, option.value, event.currentTarget.checked);
                onChange(question.id, nextValue.length > 0 ? nextValue : undefined);
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function renderScale(
  question: CompiledQuestionElement,
  value: FormAnswerValue | undefined,
  describedBy: string | undefined,
  disabled: boolean,
  onChange: (questionId: string, value: FormAnswerValue | undefined) => void,
): React.ReactElement {
  const min = numberFromRecord(question.config, "min") ?? 1;
  const max = numberFromRecord(question.config, "max") ?? 5;
  const minLabel = stringFromRecord(question.config, "minLabel");
  const maxLabel = stringFromRecord(question.config, "maxLabel");

  return (
    <div className="qf-scale" aria-describedby={describedBy}>
      {minLabel ? <span>{minLabel}</span> : null}
      <div>
        {range(min, max).map((item) => (
          <button
            key={item}
            type="button"
            className={value === item ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onChange(question.id, item)}
          >
            {item}
          </button>
        ))}
      </div>
      {maxLabel ? <span>{maxLabel}</span> : null}
    </div>
  );
}

function renderRating(
  question: CompiledQuestionElement,
  value: FormAnswerValue | undefined,
  describedBy: string | undefined,
  disabled: boolean,
  onChange: (questionId: string, value: FormAnswerValue | undefined) => void,
): React.ReactElement {
  const max = numberFromRecord(question.config, "max") ?? 5;

  return (
    <div className="qf-rating" aria-describedby={describedBy}>
      {range(1, max).map((item) => (
        <button
          key={item}
          type="button"
          aria-label={`${item} sur ${max}`}
          className={typeof value === "number" && value >= item ? "is-selected" : ""}
          disabled={disabled}
          onClick={() => onChange(question.id, item)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function parseNumberValue(event: ChangeEvent<HTMLInputElement>): number | undefined {
  if (event.currentTarget.value === "") {
    return undefined;
  }

  const value = Number(event.currentTarget.value);
  return Number.isFinite(value) ? value : undefined;
}

function toggleOption(
  selectedValues: readonly string[],
  optionValue: string,
  checked: boolean,
): readonly string[] {
  if (checked) {
    return selectedValues.includes(optionValue) ? selectedValues : [...selectedValues, optionValue];
  }

  return selectedValues.filter((value) => value !== optionValue);
}

function range(min: number, max: number): readonly number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += 1) {
    values.push(value);
  }
  return values;
}

function numberFromRecord(record: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringFromRecord(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}
