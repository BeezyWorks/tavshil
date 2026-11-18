/**
 * Ingredient display categories (fat, flour, sugar, liquid, spice) for per-category unit overrides, from the
 * name. Fat comes first so "butter" is not caught by "cream" or "oil" further down.
 */
const DISPLAY_CATEGORIES: [string, RegExp][] = [
  [
    'fat',
    /\b(butter|margarine|shortening|ghee|schmaltz|lard|cocoa butter|peanut butter|nut butter)\b/i,
  ],
  ['flour', /\b(flour|matzo? meal|matzah meal|cake meal|semolina|cornstarch|starch)\b/i],
  ['sugar', /\b(sugar|honey|syrup|molasses|stevia)\b/i],
  ['liquid', /\b(milk|water|oil|juice|wine|broth|stock|cream|vinegar|sauce|coffee|tea|seltzer)\b/i],
  [
    'spice',
    /\b(salt|pepper|cumin|paprika|cinnamon|turmeric|oregano|spice|garlic powder|za'?atar|nutmeg)\b/i,
  ],
]

/** The display category of an ingredient name, if it has one. */
export const displayCategory = (name: string): string | undefined =>
  DISPLAY_CATEGORIES.find(([, re]) => re.test(name))?.[0]
