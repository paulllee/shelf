/** Primary action button (save, add, submit) */
export const btnPrimary =
  "px-4 py-2.5 bg-primary text-primary-content rounded-full border border-primary/80 font-semibold text-sm hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100";

/** Secondary/cancel button */
export const btnSecondary =
  "px-4 py-2.5 bg-base-200 text-base-content rounded-full border border-primary/20 hover:border-primary transition-colors motion-reduce:transition-none font-semibold text-sm";

/** Standard text input */
export const inputCls =
  "w-full bg-base-200 text-base-content px-4 py-3 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none placeholder:text-base-content/30";

/** Dropdown menu item */
export const menuItemCls =
  "flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-base-200 transition-colors motion-reduce:transition-none";

/** Ghost/icon button — transparent, dims when idle */
export const btnGhost =
  "inline-flex items-center justify-content gap-1 bg-transparent text-base-content/60 border-none cursor-pointer font-[inherit] transition-[color,opacity] motion-reduce:transition-none hover:text-base-content disabled:opacity-20 disabled:cursor-not-allowed";

/** Ghost button — small */
export const btnGhostSm = `${btnGhost} text-sm px-2 py-1.5 rounded-lg`;

/** Ghost button — extra small */
export const btnGhostXs = `${btnGhost} text-xs px-1.5 py-1 rounded-md`;

/** Select / dropdown */
export const selectCls =
  "select-arrow w-full bg-base-200 text-base-content px-3 py-2 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none text-sm cursor-pointer";

/** Small input (e.g. exercise fields) */
export const inputSmCls =
  "w-full bg-base-200 text-base-content px-3 py-1.5 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none text-sm placeholder:text-base-content/30";

/** Extra-small input (e.g. exercise set fields) */
export const inputXsCls =
  "w-full bg-base-200 text-base-content px-2 py-1 rounded-md border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none text-xs placeholder:text-base-content/30";
