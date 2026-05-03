import { defaultQuestionTypes } from "../questionTypes/defaultQuestionTypes";
import type {
  CreateFormRuntimeOptions,
  FormRuntime,
  QuestionTypeDefinition,
  RegistryCollisionStrategy,
  ThemeDefinition,
  ValidatorDefinition,
} from "../publicTypes";
import { defaultThemes } from "./defaultThemes";
import { defaultValidators } from "./defaultValidators";

export function createFormRuntime(options: CreateFormRuntimeOptions = {}): FormRuntime {
  const strategy = options.collisionStrategy ?? "error";
  const questionTypes = buildRegistry("question type", defaultQuestionTypes, options.questionTypes, strategy);
  const themes = buildRegistry("theme", defaultThemes, options.themes, strategy);
  const validators = buildRegistry("validator", defaultValidators, options.validators, strategy);

  return {
    questionTypes,
    themes,
    validators,
  };
}

function buildRegistry<T extends QuestionTypeDefinition | ThemeDefinition | ValidatorDefinition>(
  label: string,
  defaults: readonly T[],
  additions: readonly T[] | undefined,
  strategy: RegistryCollisionStrategy,
): ReadonlyMap<string, T> {
  const registry = new Map<string, T>();

  for (const item of defaults) {
    registry.set(item.id, item);
  }

  for (const item of additions ?? []) {
    if (registry.has(item.id) && strategy === "error") {
      throw new Error(`Duplicate ${label} id: ${item.id}`);
    }

    if (registry.has(item.id) && strategy === "keep-first") {
      continue;
    }

    registry.set(item.id, item);
  }

  return registry;
}
