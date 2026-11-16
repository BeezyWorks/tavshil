// Pantry staples: things most kitchens already have (salt, oil, sugar, flour, dried spices). The shopping list folds
// them into one "probably in the pantry" row. This is the catalog default; a household can mark any ingredient
// either way.

const STAPLES = [
  'salt',
  'kosher salt',
  'sea salt',
  'table salt',
  'pepper',
  'black pepper',
  'white pepper',
  'ground black pepper',
  'oil',
  'vegetable oil',
  'canola oil',
  'olive oil',
  'extra virgin olive oil',
  'sunflower oil',
  'sugar',
  'white sugar',
  'granulated sugar',
  'brown sugar',
  'flour',
  'all purpose flour',
  'all-purpose flour',
  'plain flour',
  'baking powder',
  'baking soda',
  'bicarbonate of soda',
  'vinegar',
  'white vinegar',
  'apple cider vinegar',
  'cider vinegar',
  'soy sauce',
  'honey',
  'paprika',
  'sweet paprika',
  'smoked paprika',
  'cumin',
  'ground cumin',
  'turmeric',
  'ground turmeric',
  'cinnamon',
  'ground cinnamon',
  'garlic powder',
  'onion powder',
  'dried oregano',
  'oregano',
  'dried thyme',
  'dried basil',
  'chili flakes',
  'red pepper flakes',
  'cayenne',
  'cayenne pepper',
  'ground ginger',
  'nutmeg',
  'ground nutmeg',
  'bay leaf',
  'bay leaves',
  'vanilla extract',
  'vanilla',
  'cornstarch',
  'potato starch',
]

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const SET = new Set(STAPLES.map(fold))

/** True for an obvious pantry staple by name ("Salt", "olive oil", "ground cumin"). */
export function isPantryStaple(name: string): boolean {
  return SET.has(fold(name))
}
