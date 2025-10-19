import React, { createContext, useContext, useRef } from "react";
import { ScrollView } from "react-native";

interface ScrollContextType {
  scrollToTop: (key?: string) => void;
  setScrollViewRef: (key: string, ref: ScrollView | null) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error("useScroll must be used within a ScrollProvider");
  }
  return context;
};

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const scrollViewRefs = useRef<Map<string, ScrollView | null>>(new Map());

  const setScrollViewRef = (key: string, ref: ScrollView | null) => {
    scrollViewRefs.current.set(key, ref);
  };

  const scrollToTop = (key?: string) => {
    if (key) {
      const ref = scrollViewRefs.current.get(key);
      ref?.scrollTo({ x: 0, y: 0, animated: true });
    } else {
      // Scroll all if no key provided
      scrollViewRefs.current.forEach((ref) => {
        ref?.scrollTo({ x: 0, y: 0, animated: true });
      });
    }
  };

  return (
    <ScrollContext.Provider value={{ scrollToTop, setScrollViewRef }}>
      {children}
    </ScrollContext.Provider>
  );
};
