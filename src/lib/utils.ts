import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabungkan kelas Tailwind tanpa konflik (konvensi shadcn/21st.dev). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
