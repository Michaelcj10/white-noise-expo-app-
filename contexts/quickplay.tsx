import React, { createContext, useContext, useState } from "react";

interface QuickPlayContextType {
  isQuickPlaying: boolean;
  setIsQuickPlaying: (playing: boolean) => void;
  favoriteSoundId: string | null;
  setFavoriteSoundId: (id: string | null) => void;
  isMainPlaying: boolean;
  setIsMainPlaying: (playing: boolean) => void;
  stopMainSounds: (() => Promise<void>) | null;
  setStopMainSounds: (callback: (() => Promise<void>) | null) => void;
}

const QuickPlayContext = createContext<QuickPlayContextType | undefined>(
  undefined
);

export const useQuickPlay = () => {
  const context = useContext(QuickPlayContext);
  if (!context) {
    throw new Error("useQuickPlay must be used within a QuickPlayProvider");
  }
  return context;
};

export const QuickPlayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isQuickPlaying, setIsQuickPlaying] = useState(false);
  const [favoriteSoundId, setFavoriteSoundId] = useState<string | null>(null);
  const [isMainPlaying, setIsMainPlaying] = useState(false);
  const [stopMainSounds, setStopMainSounds] = useState<
    (() => Promise<void>) | null
  >(null);

  return (
    <QuickPlayContext.Provider
      value={{
        isQuickPlaying,
        setIsQuickPlaying,
        favoriteSoundId,
        setFavoriteSoundId,
        isMainPlaying,
        setIsMainPlaying,
        stopMainSounds,
        setStopMainSounds,
      }}
    >
      {children}
    </QuickPlayContext.Provider>
  );
};
