import { RandomSource } from './random';
import { createSuspect, Suspect } from '@/domain/suspect';
import {
  createSuspectId,
  createPersonalityTraits,
  PersonalityTraits,
} from '@/domain/types';
import { firstNames, lastNames, occupations, descriptions } from '@/data/names';

export interface SuspectGeneratorConfig {
  count: number;
}

export function generateSuspects(
  config: SuspectGeneratorConfig,
  random: RandomSource
): Suspect[] {
  const usedNames = new Set<string>();
  const suspects: Suspect[] = [];

  // Shuffle names to ensure variety
  const shuffledFirstNames = random.shuffle(firstNames);
  const shuffledLastNames = random.shuffle(lastNames);
  const shuffledOccupations = random.shuffle(occupations);
  const shuffledDescriptions = random.shuffle(descriptions);

  for (let i = 0; i < config.count; i++) {
    const firstName = shuffledFirstNames[i % shuffledFirstNames.length];
    const lastName = shuffledLastNames[i % shuffledLastNames.length];
    const fullName = `${firstName} ${lastName}`;

    // Ensure unique names
    if (usedNames.has(fullName)) {
      // Try next combination
      const altLastName = shuffledLastNames[(i + 1) % shuffledLastNames.length];
      const altFullName = `${firstName} ${altLastName}`;
      usedNames.add(altFullName);
    } else {
      usedNames.add(fullName);
    }

    const occupation = shuffledOccupations[i % shuffledOccupations.length];
    const description = shuffledDescriptions[i % shuffledDescriptions.length];
    const personality = generatePersonality(random);
    const age = random.randomInt(25, 70);

    suspects.push(
      createSuspect({
        id: createSuspectId(`suspect-${i}`),
        firstName,
        lastName: shuffledLastNames[i % shuffledLastNames.length],
        occupation: occupation.title,
        age,
        description: `${description} ${occupation.description}`,
        personality,
      })
    );
  }

  return suspects;
}

function generatePersonality(random: RandomSource): PersonalityTraits {
  return createPersonalityTraits(
    random.random(), // honesty
    random.random(), // composure
    random.random(), // aggression
    random.random() // observance
  );
}

export function assignVictimAndKiller(
  suspects: Suspect[],
  random: RandomSource
): { victim: Suspect; killer: Suspect; others: Suspect[] } {
  if (suspects.length < 3) {
    throw new Error('Need at least 3 suspects to assign victim and killer');
  }

  // Truly random selection - pick any two distinct indices
  const victimIndex = random.randomInt(0, suspects.length - 1);
  let killerIndex = random.randomInt(0, suspects.length - 1);
  while (killerIndex === victimIndex) {
    killerIndex = random.randomInt(0, suspects.length - 1);
  }

  const victim = createSuspect({
    ...suspects[victimIndex],
    id: suspects[victimIndex].id,
    isVictim: true,
  });

  const killer = createSuspect({
    ...suspects[killerIndex],
    id: suspects[killerIndex].id,
    isKiller: true,
  });

  // Others are everyone except victim and killer
  const others = suspects.filter((_, i) => i !== victimIndex && i !== killerIndex);

  // Shuffle the final order so killer position in returned array is random
  const shuffledOthers = random.shuffle(others);

  return { victim, killer, others: shuffledOthers };
}
