import { RandomSource } from './random';
import { Suspect } from '@/domain/suspect';
import { Location } from '@/domain/location';
import { createAlibi, Alibi } from '@/domain/alibi';
import { TimeSlot, SuspectId } from '@/domain/types';

// Different strategies for killer alibis to increase unpredictability
type KillerAlibiStrategy = 'no_witnesses' | 'unreliable_witness' | 'partial_alibi' | 'conflicting_times';

export function generateAlibis(
  killer: Suspect,
  _victim: Suspect,
  others: Suspect[],
  locations: Location[],
  timeOfDeath: TimeSlot,
  random: RandomSource
): Alibi[] {
  const alibis: Alibi[] = [];
  const publicLocations = locations.filter(l => l.isPublic);
  const privateLocations = locations.filter(l => !l.isPublic);
  const allSuspects = [killer, ...others];

  // Choose a random strategy for the killer's alibi
  const killerStrategy: KillerAlibiStrategy = random.pick([
    'no_witnesses',
    'unreliable_witness',
    'partial_alibi',
    'conflicting_times',
  ]);

  // Generate alibis for innocents - but vary their quality too!
  for (const innocent of others) {
    const location = random.pick(publicLocations);
    const witnesses = selectWitnesses(innocent.id, allSuspects, random);

    // Some innocents might have weaker alibis (adds uncertainty)
    const hasWeakAlibi = random.random() < 0.2; // 20% chance

    if (hasWeakAlibi) {
      // Weak alibi - fewer witnesses, less certain
      const weakWitnesses = witnesses.slice(0, 1);
      alibis.push(
        createAlibi({
          suspectId: innocent.id,
          timeSlot: timeOfDeath,
          location: location.id,
          description: generateWeakAlibiDescription(innocent, location, weakWitnesses, random),
          witnesses: weakWitnesses.map(w => w.id),
          isVerifiable: true,
          isFalse: false,
        })
      );
    } else {
      alibis.push(
        createAlibi({
          suspectId: innocent.id,
          timeSlot: timeOfDeath,
          location: location.id,
          description: generateAlibiDescription(innocent, location, witnesses, random),
          witnesses: witnesses.map(w => w.id),
          isVerifiable: true,
          isFalse: false,
        })
      );
    }
  }

  // Generate alibi for killer based on strategy
  const killerAlibi = generateKillerAlibi(
    killer,
    others,
    publicLocations,
    privateLocations,
    timeOfDeath,
    killerStrategy,
    random
  );
  alibis.push(killerAlibi);

  // Shuffle alibis so killer's position isn't predictable
  return random.shuffle(alibis);
}

function generateKillerAlibi(
  killer: Suspect,
  others: Suspect[],
  publicLocations: Location[],
  privateLocations: Location[],
  timeOfDeath: TimeSlot,
  strategy: KillerAlibiStrategy,
  random: RandomSource
): Alibi {
  switch (strategy) {
    case 'unreliable_witness': {
      // Killer claims a witness who "can't quite remember" or has reason to lie
      const location = random.pick(publicLocations.length > 0 ? publicLocations : privateLocations);
      const fakeWitness = random.pick(others);
      return createAlibi({
        suspectId: killer.id,
        timeSlot: timeOfDeath,
        location: location.id,
        description: generateUnreliableWitnessAlibi(killer, location, fakeWitness, random),
        witnesses: [fakeWitness.id], // Has a witness, but unreliable
        isVerifiable: false, // Can't actually be verified
        isFalse: true,
      });
    }

    case 'partial_alibi': {
      // Killer was seen earlier/later but not during the actual murder time
      const location = random.pick(publicLocations.length > 0 ? publicLocations : privateLocations);
      const witnesses = selectWitnesses(killer.id, [killer, ...others], random);
      return createAlibi({
        suspectId: killer.id,
        timeSlot: timeOfDeath,
        location: location.id,
        description: generatePartialAlibiDescription(killer, location, witnesses, random),
        witnesses: witnesses.map(w => w.id),
        isVerifiable: false, // Partial - doesn't cover the murder window
        isFalse: true,
      });
    }

    case 'conflicting_times': {
      // Killer's story has time inconsistencies
      const location = random.pick(privateLocations.length > 0 ? privateLocations : publicLocations);
      return createAlibi({
        suspectId: killer.id,
        timeSlot: timeOfDeath,
        location: location.id,
        description: generateConflictingTimesAlibi(killer, location, random),
        witnesses: [],
        isVerifiable: false,
        isFalse: true,
      });
    }

    case 'no_witnesses':
    default: {
      // Classic - alone with no witnesses
      const location = privateLocations.length > 0
        ? random.pick(privateLocations)
        : random.pick(publicLocations);
      return createAlibi({
        suspectId: killer.id,
        timeSlot: timeOfDeath,
        location: location.id,
        description: generateFalseAlibiDescription(killer, location, random),
        witnesses: [],
        isVerifiable: false,
        isFalse: true,
      });
    }
  }
}

function selectWitnesses(
  excludeId: SuspectId,
  allSuspects: Suspect[],
  random: RandomSource
): Suspect[] {
  const candidates = allSuspects.filter(s => s.id !== excludeId && !s.isVictim);
  const count = random.randomInt(1, Math.min(2, candidates.length));
  return random.shuffle(candidates).slice(0, count);
}

function generateAlibiDescription(
  suspect: Suspect,
  location: Location,
  witnesses: Suspect[],
  random: RandomSource
): string {
  const activities = [
    'was having a conversation',
    'was reading by the fire',
    'was playing cards',
    'was admiring the paintings',
    'was engaged in discussion',
    'was enjoying a drink',
    'was waiting for dinner',
  ];

  const activity = random.pick(activities);

  if (witnesses.length === 0) {
    return `${suspect.firstName} claims to have been in the ${location.name}, ${activity}.`;
  }

  const witnessNames = witnesses.map(w => w.firstName).join(' and ');
  return `${suspect.firstName} was in the ${location.name}, ${activity}. ${witnessNames} can confirm this.`;
}

function generateFalseAlibiDescription(
  killer: Suspect,
  location: Location,
  random: RandomSource
): string {
  const excuses = [
    `${killer.firstName} claims to have been alone in ${location.name === 'Guest Bedroom' ? 'their room' : `the ${location.name}`}, resting.`,
    `${killer.firstName} says they were in the ${location.name}, but no one can confirm this.`,
    `${killer.firstName} insists they were freshening up in their quarters.`,
    `${killer.firstName} claims to have stepped outside for some air.`,
    `${killer.firstName} says they were in the ${location.name} making a private telephone call.`,
  ];

  return random.pick(excuses);
}

function generateWeakAlibiDescription(
  suspect: Suspect,
  location: Location,
  witnesses: Suspect[],
  random: RandomSource
): string {
  const uncertainPhrases = [
    `${suspect.firstName} was seen briefly in the ${location.name}, though the exact time is unclear.`,
    `${suspect.firstName} claims to have been in the ${location.name}. ${witnesses[0]?.firstName || 'Someone'} thinks they may have seen them there.`,
    `${suspect.firstName} says they were in the ${location.name}, reading. ${witnesses[0]?.firstName || 'A witness'} recalls seeing them, but can't be certain of the time.`,
    `${suspect.firstName} was in the ${location.name} for part of the evening, according to ${witnesses[0]?.firstName || 'a witness'}, who was somewhat distracted.`,
  ];
  return random.pick(uncertainPhrases);
}

function generateUnreliableWitnessAlibi(
  killer: Suspect,
  location: Location,
  witness: Suspect,
  random: RandomSource
): string {
  const unreliableDescriptions = [
    `${killer.firstName} claims ${witness.firstName} saw them in the ${location.name}. However, ${witness.firstName} had been drinking heavily that evening.`,
    `${killer.firstName} says they were with ${witness.firstName} in the ${location.name}, but ${witness.firstName}'s memory of the evening is hazy.`,
    `${killer.firstName} insists ${witness.firstName} can vouch for them, though ${witness.firstName} seems oddly reluctant to confirm the details.`,
    `${killer.firstName} claims ${witness.firstName} saw them in the ${location.name}. ${witness.firstName} agrees, but their account has some inconsistencies.`,
  ];
  return random.pick(unreliableDescriptions);
}

function generatePartialAlibiDescription(
  killer: Suspect,
  location: Location,
  witnesses: Suspect[],
  random: RandomSource
): string {
  const witnessName = witnesses[0]?.firstName || 'Others';
  const partialDescriptions = [
    `${killer.firstName} was seen in the ${location.name} earlier in the evening by ${witnessName}, but stepped out for a while around the time of the murder.`,
    `${witnessName} saw ${killer.firstName} in the ${location.name} before dinner, but not during the critical hour.`,
    `${killer.firstName} arrived at the ${location.name} late, claiming to have been delayed. ${witnessName} can only confirm their presence after the fact.`,
    `${killer.firstName} was in the ${location.name} with ${witnessName}, but excused themselves for about twenty minutes during the evening.`,
  ];
  return random.pick(partialDescriptions);
}

function generateConflictingTimesAlibi(
  killer: Suspect,
  location: Location,
  random: RandomSource
): string {
  const conflictingDescriptions = [
    `${killer.firstName} claims to have been in the ${location.name} from 8 until 10, but the grandfather clock there stopped at 9:15.`,
    `${killer.firstName} says they were in the ${location.name} all evening, but a servant recalls seeing the room empty around 9 o'clock.`,
    `${killer.firstName} insists they never left the ${location.name}, yet their shoes show traces of garden mud.`,
    `${killer.firstName} claims they were reading in the ${location.name}, but the book they mention wasn't published until next year.`,
    `${killer.firstName} says they heard the clock strike nine from the ${location.name}, but that clock has been broken for weeks.`,
  ];
  return random.pick(conflictingDescriptions);
}
