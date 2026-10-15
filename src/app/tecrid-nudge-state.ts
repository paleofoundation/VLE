/** Visitor-local preparation only. None of these actions establishes verification. */
export const PREPARATION_STEPS = [
  { id: "lot-sample", label: "I have identified the offered lot and its controlled sample." },
  { id: "report-reference", label: "I have the laboratory report and sample reference ready." },
  { id: "instructions", label: "I have reviewed the TECRID verification instructions." },
] as const;

export type PreparationState = { checked: string[]; dismissed: boolean };
export type PreparationAction = { type: "toggle"; id: string } | { type: "toggle-reminder" };

export function initialPreparationState(): PreparationState {
  return { checked: [], dismissed: false };
}

export function preparationReducer(state: PreparationState, action: PreparationAction): PreparationState {
  if (action.type === "toggle-reminder") return { ...state, dismissed: !state.dismissed };
  if (!PREPARATION_STEPS.some((step) => step.id === action.id)) return state;
  return {
    ...state,
    checked: state.checked.includes(action.id)
      ? state.checked.filter((id) => id !== action.id)
      : [...state.checked, action.id],
  };
}
