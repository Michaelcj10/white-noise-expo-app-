import React, { createContext, useContext, useState } from "react";

interface QuickPlayContextType {
  isQuickPlaying: boolean;
  setIsQuickPlaying: (playing: boolean) => void;
  favoriteSoundId: string | null;
  setFavoriteSoundId: (id: string | null) => void;
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

  return (
    <QuickPlayContext.Provider
      value={{
        isQuickPlaying,
        setIsQuickPlaying,
        favoriteSoundId,
        setFavoriteSoundId,
      }}
    >
      {children}
    </QuickPlayContext.Provider>
  );
};
