"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  DEFAULT_BUSINESS_TERMINOLOGY,
  type BusinessTerminology,
} from "@/core/industry-experience/business-terminology";

const BusinessTerminologyContext = createContext<BusinessTerminology>(
  DEFAULT_BUSINESS_TERMINOLOGY
);

type BusinessTerminologyProviderProps = {
  terminology: BusinessTerminology;
  children: ReactNode;
};

export function BusinessTerminologyProvider({
  terminology,
  children,
}: BusinessTerminologyProviderProps) {
  return (
    <BusinessTerminologyContext.Provider value={terminology}>
      {children}
    </BusinessTerminologyContext.Provider>
  );
}

export function useBusinessTerminology(): BusinessTerminology {
  return useContext(BusinessTerminologyContext);
}
