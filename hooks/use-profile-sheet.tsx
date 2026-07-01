import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

type ProfileSheetContextValue = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  open: () => void;
  close: () => void;
};

const ProfileSheetContext = createContext<ProfileSheetContextValue | undefined>(undefined);

export function ProfileSheetProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);

  const open = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const close = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const value = useMemo(
    () => ({ sheetRef, open, close }),
    [open, close],
  );

  return (
    <ProfileSheetContext.Provider value={value}>
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
