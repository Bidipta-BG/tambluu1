"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface GlobalLoaderContextValue {
  showLoader: (text?: string) => void;
  hideLoader: () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | undefined>(undefined);

export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("Loading...");

  const showLoader = (loadingText = "Loading...") => {
    setText(loadingText);
    setLoading(true);
  };

  const hideLoader = () => {
    setLoading(false);
  };

  return (
    <GlobalLoaderContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute h-24 w-24 animate-ping rounded-full border-2 border-violet-500/50" />
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-violet-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-200 tracking-widest uppercase animate-pulse">{text}</h2>
          <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide">Please wait a moment</p>
        </div>
      )}
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext);
  if (!context) throw new Error("useGlobalLoader must be used within GlobalLoaderProvider");
  return context;
}
