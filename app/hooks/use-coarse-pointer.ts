"use client";

import { useEffect, useState } from "react";

/** True on phones/tablets where the primary pointer is a finger. */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");

    const update = () => {
      setCoarse(query.matches);
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}
