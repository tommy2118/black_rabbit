export interface LocationTemplate {
  name: string;
  description: string;
  isPublic: boolean;
}

export const manorLocations: LocationTemplate[] = [
  // Private rooms
  {
    name: 'Study',
    description: 'A wood-paneled room lined with leather-bound books. The smell of tobacco lingers in the air.',
    isPublic: false,
  },
  {
    name: 'Master Bedroom',
    description: 'An opulent bedroom with a four-poster bed and heavy curtains.',
    isPublic: false,
  },
  {
    name: 'Guest Bedroom',
    description: 'A comfortable but less ornate sleeping quarters for visitors.',
    isPublic: false,
  },
  {
    name: 'Kitchen',
    description: 'A large kitchen with copper pots hanging from the ceiling and the scent of herbs.',
    isPublic: false,
  },
  {
    name: 'Wine Cellar',
    description: 'A cool underground room with racks of vintage bottles and cobwebs in the corners.',
    isPublic: false,
  },
  {
    name: 'Servant\'s Quarters',
    description: 'Simple rooms behind the kitchen where the staff resides.',
    isPublic: false,
  },
  {
    name: 'Attic',
    description: 'A dusty space beneath the rafters, filled with forgotten trunks and memories.',
    isPublic: false,
  },
  // Public rooms
  {
    name: 'Parlor',
    description: 'An elegant sitting room with velvet furniture and a crackling fireplace.',
    isPublic: true,
  },
  {
    name: 'Dining Room',
    description: 'A grand dining room with a long mahogany table set with fine china.',
    isPublic: true,
  },
  {
    name: 'Library',
    description: 'Floor-to-ceiling bookshelves surround comfortable reading chairs. A ladder slides along the shelves.',
    isPublic: true,
  },
  {
    name: 'Conservatory',
    description: 'A glass-walled room filled with exotic plants and humid air. Moonlight streams through the panes.',
    isPublic: true,
  },
  {
    name: 'Billiard Room',
    description: 'A masculine retreat with a green-felted table and trophy heads on the walls.',
    isPublic: true,
  },
  {
    name: 'Garden',
    description: 'A manicured garden with hedges, fountains, and hidden alcoves. Rose bushes line the paths.',
    isPublic: true,
  },
  {
    name: 'Foyer',
    description: 'The grand entrance hall with a sweeping staircase and crystal chandelier.',
    isPublic: true,
  },
  {
    name: 'Music Room',
    description: 'A room dominated by a grand piano and walls hung with portraits of composers.',
    isPublic: true,
  },
  {
    name: 'Drawing Room',
    description: 'A formal reception room with silk wallpaper and delicate porcelain figurines.',
    isPublic: true,
  },
  {
    name: 'Ballroom',
    description: 'A vast room with polished floors and mirrors that multiply the candlelight.',
    isPublic: true,
  },
  {
    name: 'Veranda',
    description: 'A covered porch overlooking the grounds. Wicker chairs face the gardens.',
    isPublic: true,
  },
  {
    name: 'Trophy Room',
    description: 'Mounted heads and hunting memorabilia cover every surface. A rifle case stands in the corner.',
    isPublic: true,
  },
];

export const weapons = [
  // Poisons
  { type: 'poison', name: 'Arsenic', description: 'A deadly poison slipped into a drink.' },
  { type: 'poison', name: 'Cyanide', description: 'A fast-acting poison with a bitter almond scent.' },
  { type: 'poison', name: 'Belladonna', description: 'Extracted from deadly nightshade. Untraceable in small doses.' },
  { type: 'poison', name: 'Digitalis', description: 'Heart medication in lethal doses. Mimics natural causes.' },
  // Blades
  { type: 'knife', name: 'Letter Opener', description: 'A silver letter opener, now stained with blood.' },
  { type: 'knife', name: 'Kitchen Knife', description: 'A sharp blade from the kitchen.' },
  { type: 'knife', name: 'Hunting Knife', description: 'A curved blade meant for game, turned to darker purpose.' },
  { type: 'knife', name: 'Ceremonial Dagger', description: 'An ornate blade from the trophy room.' },
  // Blunt objects
  { type: 'blunt', name: 'Candlestick', description: 'A heavy brass candlestick, dented from impact.' },
  { type: 'blunt', name: 'Bronze Statue', description: 'A bronze statuette of a horse, now a murder weapon.' },
  { type: 'blunt', name: 'Fireplace Poker', description: 'An iron poker from beside the hearth.' },
  { type: 'blunt', name: 'Crystal Decanter', description: 'A heavy crystal decanter, shattered at the base.' },
  { type: 'blunt', name: 'Walking Cane', description: 'A cane with a heavy silver handle.' },
  // Firearms
  { type: 'firearm', name: 'Revolver', description: 'A pearl-handled revolver with one bullet missing.' },
  { type: 'firearm', name: 'Hunting Rifle', description: 'A rifle from the trophy room. Recently fired.' },
  { type: 'firearm', name: 'Derringer', description: 'A small pistol that fits in a pocket or purse.' },
  // Strangulation
  { type: 'strangulation', name: 'Silk Scarf', description: 'A silk scarf twisted tight around the throat.' },
  { type: 'strangulation', name: 'Rope', description: 'A length of rough rope from the stables.' },
  { type: 'strangulation', name: 'Belt', description: 'A leather belt used as a garrote.' },
  { type: 'strangulation', name: 'Curtain Cord', description: 'A braided cord ripped from the drapes.' },
  // Other
  { type: 'pushed', name: 'Balcony', description: 'A fatal fall from the second-floor balcony.' },
  { type: 'pushed', name: 'Staircase', description: 'Pushed down the grand staircase. Ruled an "accident."' },
  { type: 'drowning', name: 'Garden Pond', description: 'Held under the water of the ornamental pond.' },
  { type: 'drowning', name: 'Bathtub', description: 'Drowned in the bath. Made to look like an accident.' },
];
