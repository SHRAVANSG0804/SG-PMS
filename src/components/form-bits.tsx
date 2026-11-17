"use client";

import { useFormStatus } from "react-dom";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initialActionState, type ActionState } from "@/lib/types";
import { Alert } from "./ui";

/**
 * Runs a form's server action from onSubmit, so the form KEEPS what the user
 * typed when the server returns validation errors. (Passing a server action
 * straight to <form action> makes React 19 reset the form afterwards, wiping
 * the user's input.) The clicked button's name/value (e.g. intent=submit) is
 * included in the FormData.
 */
export function useFormAction(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(async () => {
      const result = await action(state, formData);
      startTransition(() => setState(result));
    });
  };
  return { state, pending, onSubmit };
}

/** Submit button that disables itself while its form's server action runs. */
export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  size,
  name,
  value,
  confirm,
  className,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm";
  name?: string;
  value?: string;
  confirm?: string;
  className?: string;
  /** Pass the `pending` from useFormAction; falls back to the native form status. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** Shows the top-level success / error message returned by a server action. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "green" : "red"}>{state.message}</Alert>;
}
