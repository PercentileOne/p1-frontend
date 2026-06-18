import { useEffect } from "react";

export const useScrollReset = (machineState: string) => {
  useEffect(() => {
    if (
      machineState === "enteringCategory" ||
      machineState === "enteringSubcategory" ||
      machineState === "enteringCareer"
    ) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [machineState]);
};
