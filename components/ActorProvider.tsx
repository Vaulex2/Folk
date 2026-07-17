"use client";
import { createContext, useContext, useMemo, useState } from "react";

interface ActorValue {
  actor: string;
  setActor: (v: string) => void;
}

const ActorContext = createContext<ActorValue | null>(null);

export default function ActorProvider({
  actor,
  children,
}: {
  actor: string;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState(actor);
  const value = useMemo<ActorValue>(() => ({ actor: current, setActor: setCurrent }), [current]);
  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor(): ActorValue {
  const ctx = useContext(ActorContext);
  if (!ctx) throw new Error("useActor must be used within ActorProvider");
  return ctx;
}
