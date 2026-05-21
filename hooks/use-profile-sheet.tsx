import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { createContext, useContext, useRef } from "react";

type ProfileSheetContextValue = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  open: () => void;
  close: () => void;
};

const ProfileSheetContext = createContext<ProfileSheetContextValue | undefined>(undefined);

export function ProfileSheetProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);

  const open = () => {
    sheetRef.current?.present();
  };

  const close = () => {
    sheetRef.current?.dismiss();
  };

  return (
    <ProfileSheetContext.Provider value={{ sheetRef, open, close }}>
      {children}
    </ProfileSheetContext.Provider>
  );
}

export function useProfileSheet() {
  const context = useContext(ProfileSheetContext);
  if (!context) {
    throw new Error("useProfileSheet must be used within ProfileSheetProvider");
  }
  return context;
}
