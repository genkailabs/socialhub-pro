import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para combinar classes utilitárias de Tailwind CSS e condicionais sem conflito.
 * @param {...import('clsx').ClassValue} inputs 
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
