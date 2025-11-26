import { createRandom, RandomSource } from './random';
import { generateSuspects, assignVictimAndKiller } from './suspect_generator';
import { generateRelationshipGraph } from './relationship_graph';
import { generateClues } from './clue_generator';
import { generateAlibis } from './alibi_generator';
import { createCase, Case, isCaseSolvable } from '@/domain/case';
import { createLocation, Location } from '@/domain/location';
import {
  createLocationId,
  createTimeSlot,
  MotiveType,
  WeaponType,
  TimeSlot,
} from '@/domain/types';
import { manorLocations } from '@/data/locations';

export interface CaseGeneratorConfig {
  suspectCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const defaultConfig: CaseGeneratorConfig = {
  suspectCount: 6,
  difficulty: 'medium',
};

export function generateCase(
  seed: string,
  config: Partial<CaseGeneratorConfig> = {}
): Case {
  const fullConfig = { ...defaultConfig, ...config };
  const random = createRandom(seed);

  // Generate locations
  const locations = generateLocations(random);

  // Generate suspects
  const suspects = generateSuspects({ count: fullConfig.suspectCount }, random);

  // Assign victim and killer
  const { victim, killer, others } = assignVictimAndKiller(suspects, random);

  // Select motive and weapon
  const motive = selectMotive(random);
  const weapon = selectWeapon(random);

  // Select crime scene
  const crimeScene = selectCrimeScene(locations, random);

  // Select time of death
  const timeOfDeath = selectTimeOfDeath(random);

  // Generate relationships
  const relationships = generateRelationshipGraph(
    victim,
    killer,
    others,
    motive,
    random
  );

  // Generate clues
  const clues = generateClues(
    killer,
    victim,
    others,
    motive,
    weapon,
    crimeScene,
    locations,
    relationships,
    random,
    {
      minCluesPointingToKiller: getDifficultyClueCount(fullConfig.difficulty),
      redHerringCount: getDifficultyRedHerrings(fullConfig.difficulty),
    }
  );

  // Generate alibis
  const alibis = generateAlibis(
    killer,
    victim,
    others,
    locations,
    timeOfDeath,
    random
  );

  // Create the case
  const generatedCase = createCase({
    seed,
    suspects: [victim, killer, ...others],
    relationships,
    locations,
    clues,
    alibis,
    victim: victim.id,
    killer: killer.id,
    motive,
    weapon,
    crimeScene: crimeScene.id,
    timeOfDeath,
  });

  // Validate solvability
  if (!isCaseSolvable(generatedCase)) {
    // This shouldn't happen with our generation logic, but safety check
    console.warn('Generated case is not solvable, regenerating...');
    return generateCase(`${seed}-retry`, config);
  }

  return generatedCase;
}

function generateLocations(random: RandomSource): Location[] {
  // Use manor locations as the setting
  const shuffled = random.shuffle(manorLocations);
  const count = random.randomInt(6, 8);

  return shuffled.slice(0, count).map((template, index) =>
    createLocation({
      id: createLocationId(`location-${index}`),
      name: template.name,
      description: template.description,
      isPublic: template.isPublic,
      isCrimeScene: false,
    })
  );
}

function selectCrimeScene(locations: Location[], random: RandomSource): Location {
  // Prefer private locations for crime scenes
  const privateLocations = locations.filter(l => !l.isPublic);
  const candidates = privateLocations.length > 0 ? privateLocations : locations;
  const scene = random.pick(candidates);

  // Update the location to mark it as crime scene
  return createLocation({
    id: scene.id,
    name: scene.name,
    description: scene.description,
    isPublic: scene.isPublic,
    isCrimeScene: true,
  });
}

function selectMotive(random: RandomSource): MotiveType {
  const motives = Object.values(MotiveType);
  return random.pick(motives);
}

function selectWeapon(random: RandomSource): WeaponType {
  const weapons = Object.values(WeaponType);
  return random.pick(weapons);
}

function selectTimeOfDeath(random: RandomSource): TimeSlot {
  // Murder typically happens in the evening, between 8 PM and 11 PM
  const hour = random.randomInt(20, 23); // 8 PM to 11 PM
  return createTimeSlot(hour);
}

function getDifficultyClueCount(difficulty: 'easy' | 'medium' | 'hard'): number {
  switch (difficulty) {
    case 'easy':
      return 5;
    case 'medium':
      return 4;
    case 'hard':
      return 3;
  }
}

function getDifficultyRedHerrings(difficulty: 'easy' | 'medium' | 'hard'): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
  }
}

// Re-export for convenience
export { createRandom };
