export const firstNames = [
  // Classic noir/mystery names - Female
  'Eleanor', 'Margaret', 'Victoria', 'Elizabeth', 'Catherine',
  'Vivian', 'Evelyn', 'Beatrice', 'Charlotte', 'Penelope',
  'Constance', 'Harriet', 'Agnes', 'Dorothy', 'Mildred',
  'Irene', 'Lillian', 'Florence', 'Josephine', 'Rosalind',
  'Agatha', 'Cordelia', 'Gwendolyn', 'Millicent', 'Prudence',
  'Adelaide', 'Clementine', 'Ophelia', 'Tabitha', 'Winifred',
  // Classic noir/mystery names - Male
  'Richard', 'William', 'Edward', 'Charles', 'Henry',
  'James', 'Thomas', 'Arthur', 'Frederick', 'George',
  'Sebastian', 'Oliver', 'Theodore', 'Reginald', 'Archibald',
  'Edmund', 'Nathaniel', 'Humphrey', 'Percival', 'Bartholomew',
  'Alistair', 'Benedict', 'Cornelius', 'Desmond', 'Montgomery',
  'Rupert', 'Sylvester', 'Vincent', 'Wallace', 'Xavier',
];

export const lastNames = [
  // Upper-class English surnames
  'Ashworth', 'Blackwood', 'Hartley', 'Pemberton', 'Whitmore',
  'Ravencroft', 'Thornwood', 'Sterling', 'Fairfax', 'Cavendish',
  'Montague', 'Sinclair', 'Worthington', 'Kensington', 'Beaumont',
  'Crawford', 'Harrington', 'Lancaster', 'Fitzgerald', 'Stirling',
  'Wellington', 'Carmichael', 'Prescott', 'Vandermeer', 'Ashford',
  // Additional surnames
  'Davenport', 'Everhart', 'Foxworth', 'Grenville', 'Hawthorne',
  'Kingsley', 'Langley', 'Merriweather', 'Norwood', 'Osgood',
  'Pembroke', 'Rutherford', 'Seymour', 'Trevelyan', 'Underwood',
  'Vance', 'Wentworth', 'Yarborough', 'Aldridge', 'Bainbridge',
  'Chadwick', 'Drummond', 'Eastwood', 'Farnsworth', 'Grimsby',
];

export const occupations = [
  // Wealthy elite
  { title: 'Industrialist', description: 'A wealthy factory owner with vast holdings.' },
  { title: 'Socialite', description: 'A prominent figure in high society.' },
  { title: 'Heiress', description: 'A wealthy young woman expecting an inheritance.' },
  { title: 'Banker', description: 'A financier who controls the family fortune.' },
  { title: 'Shipping Magnate', description: 'Controls trade routes and harbors.' },
  { title: 'Oil Baron', description: 'Made a fortune in petroleum.' },
  // Professionals
  { title: 'Lawyer', description: 'A shrewd legal mind who knows everyone\'s secrets.' },
  { title: 'Doctor', description: 'A respected physician with a calm demeanor.' },
  { title: 'Professor', description: 'An academic with an encyclopedic mind.' },
  { title: 'Architect', description: 'Designs the grand estates of the wealthy.' },
  { title: 'Surgeon', description: 'Steady hands and nerves of steel.' },
  { title: 'Barrister', description: 'Argues cases before the highest courts.' },
  // Creatives
  { title: 'Artist', description: 'A temperamental creative with expensive tastes.' },
  { title: 'Actress', description: 'A stage performer with a flair for drama.' },
  { title: 'Author', description: 'A celebrated novelist known for dark themes.' },
  { title: 'Composer', description: 'Creates symphonies that move audiences to tears.' },
  { title: 'Photographer', description: 'Captures images that reveal hidden truths.' },
  // Military/Government
  { title: 'Colonel', description: 'A retired military officer with rigid principles.' },
  { title: 'Politician', description: 'An ambitious public figure with many enemies.' },
  { title: 'Diplomat', description: 'A master of negotiation and intrigue.' },
  { title: 'Admiral', description: 'Commanded fleets and sailors across the seas.' },
  { title: 'Judge', description: 'Dispenses justice from the bench.' },
  // Working class with access
  { title: 'Butler', description: 'A servant who sees and hears everything.' },
  { title: 'Journalist', description: 'A reporter always digging for stories.' },
  { title: 'Private Secretary', description: 'Manages affairs and keeps secrets.' },
  { title: 'Governess', description: 'Raised the children of the wealthy.' },
  { title: 'Estate Manager', description: 'Oversees the grounds and staff.' },
  // Other
  { title: 'Widow', description: 'Recently bereaved, with a complicated past.' },
  { title: 'Businessman', description: 'A self-made entrepreneur with ruthless methods.' },
  { title: 'Antiquarian', description: 'Deals in rare books and artifacts.' },
  { title: 'Explorer', description: 'Has traveled to the far corners of the earth.' },
  { title: 'Spiritualist', description: 'Claims to commune with the dead.' },
];

export const descriptions = [
  // Suspicious
  'A stern figure with penetrating eyes that miss nothing.',
  'Charming on the surface, but calculating beneath.',
  'Nervous and fidgety, clearly hiding something.',
  'Watchful and silent, observing from the shadows.',
  'Speaks in riddles and never gives a straight answer.',
  'Always seems to know more than they let on.',
  'Has a habit of appearing in unexpected places.',
  // Dignified
  'Quiet and reserved, with an air of hidden knowledge.',
  'Imperious and cold, accustomed to getting their way.',
  'Elegant and composed, never a hair out of place.',
  'Meticulous and precise, obsessed with details.',
  'Carries themselves with military bearing.',
  'Speaks softly but commands attention.',
  // Emotional
  'Warm and friendly, perhaps too eager to please.',
  'Theatrical and dramatic, always the center of attention.',
  'Quick to anger, with a volatile temper.',
  'Melancholic and brooding, lost in memories.',
  'Laughs too loudly and drinks too much.',
  // Eccentric
  'Disheveled and distracted, lost in thought.',
  'Brash and outspoken, with no filter on their opinions.',
  'Mutters to themselves when they think no one is listening.',
  'Collects strange objects and speaks of stranger things.',
  'Dresses decades out of fashion and cares not at all.',
  // Physical tells
  'Has a noticeable limp from an old injury.',
  'Constantly wringing their hands when speaking.',
  'Never makes eye contact for more than a moment.',
  'Chain-smokes and taps ashes nervously.',
  'Wears dark glasses even indoors.',
];

// Personality traits that affect dialogue style
export const personalityTraits = [
  'arrogant',
  'nervous',
  'charming',
  'cold',
  'emotional',
  'calculating',
  'theatrical',
  'secretive',
  'blunt',
  'evasive',
] as const;

export type PersonalityTrait = typeof personalityTraits[number];
