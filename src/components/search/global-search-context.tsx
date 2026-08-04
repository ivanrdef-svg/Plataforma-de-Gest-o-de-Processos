import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface GlobalSearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (value: boolean) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, open, close, setOpen }),
    [isOpen, open, close],
  );

  return (
    <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error("useGlobalSearch deve ser usado dentro de GlobalSearchProvider");
  }
  return ctx;
}
