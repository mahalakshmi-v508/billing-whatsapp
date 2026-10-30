/**
 * Lookup table of every invoice / receipt theme component.
 *
 * Kept in its own module so `pages/billing/Invoice.jsx` only exports React
 * components (required for React Fast Refresh).
 */
import {
  ThemeTally,
  ThemeGST1,
  ThemeGST3,
  ThemeDoubleDivine,
  ThemePOS,
  ThemePOSClassic,
  ThemePOSModern,
  ThemePOSDetailed,
  ThemePOSMinimal,
  ThemePOSVintage,
} from "./Invoice";

export const DESIGN_COMPONENTS = {
  original: ThemeTally,
  classic: ThemeTally,
  modern: ThemeGST1,
  bold: ThemeDoubleDivine,
  minimal: ThemeGST3,
  corporate: ThemeTally,
  stripe: ThemeGST1,
  pos: ThemePOS,
  pos_classic: ThemePOSClassic,
  pos_modern: ThemePOSModern,
  pos_detailed: ThemePOSDetailed,
  pos_minimal: ThemePOSMinimal,
  pos_vintage: ThemePOSVintage,
  tally: ThemeTally,
  gst1: ThemeGST1,
  gst3: ThemeGST3,
  double_divine: ThemeDoubleDivine,
  french_elite: ThemeTally,
  vintage_classic: ThemeTally,
  vintage_bold: ThemeTally,
};
