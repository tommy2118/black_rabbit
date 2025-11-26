import { RandomSource } from './random';
import { Suspect } from '@/domain/suspect';
import { Location } from '@/domain/location';
import { createClue, Clue } from '@/domain/clue';
import { Relationship } from '@/domain/relationship';
import {
  createClueId,
  ClueType,
  MotiveType,
  WeaponType,
} from '@/domain/types';

export interface ClueGeneratorConfig {
  minCluesPointingToKiller: number;
  redHerringCount: number;
}

export function generateClues(
  killer: Suspect,
  victim: Suspect,
  others: Suspect[],
  motive: MotiveType,
  weapon: WeaponType,
  crimeScene: Location,
  allLocations: Location[],
  relationships: Relationship[],
  random: RandomSource,
  config: ClueGeneratorConfig = { minCluesPointingToKiller: 3, redHerringCount: 2 }
): Clue[] {
  const clues: Clue[] = [];
  let clueIndex = 0;

  const nextClueId = () => createClueId(`clue-${clueIndex++}`);

  // 1. Physical evidence at crime scene pointing to killer
  clues.push(
    createClue({
      id: nextClueId(),
      type: ClueType.Physical,
      name: getPhysicalEvidenceName(weapon, random),
      description: getPhysicalEvidenceDescription(weapon, killer, random),
      foundAt: crimeScene.id,
      pointsTo: killer.id,
      significance: 'critical',
    })
  );

  // 2. Motive clue (documentary evidence)
  clues.push(
    createClue({
      id: nextClueId(),
      type: ClueType.Documentary,
      name: getMotiveDocumentName(motive, random),
      description: getMotiveDocumentDescription(motive, victim, killer, random),
      foundAt: random.pick(allLocations).id,
      pointsTo: killer.id,
      significance: 'critical',
    })
  );

  // 3. Opportunity clue (places killer at scene)
  clues.push(
    createClue({
      id: nextClueId(),
      type: ClueType.Testimonial,
      name: 'Witness Account',
      description: `Someone saw ${killer.firstName} near the ${crimeScene.name} around the time of the murder.`,
      foundAt: crimeScene.id,
      pointsTo: killer.id,
      significance: 'normal',
    })
  );

  // 4. Behavioral clue
  clues.push(
    createClue({
      id: nextClueId(),
      type: ClueType.Behavioral,
      name: 'Suspicious Behavior',
      description: `${killer.firstName} was seen acting nervously after the body was discovered.`,
      foundAt: random.pick(allLocations).id,
      pointsTo: killer.id,
      significance: 'normal',
    })
  );

  // 5. Forensic evidence (time of death, etc.)
  clues.push(
    createClue({
      id: nextClueId(),
      type: ClueType.Forensic,
      name: 'Time of Death',
      description: 'The victim died between 9:00 PM and 10:00 PM based on body temperature.',
      foundAt: crimeScene.id,
      significance: 'critical',
    })
  );

  // 6. Add alibi-clearing clues for innocents
  for (const innocent of others) {
    clues.push(
      createClue({
        id: nextClueId(),
        type: ClueType.Testimonial,
        name: `${innocent.firstName}'s Alibi`,
        description: `Multiple witnesses confirm ${innocent.firstName} was in the ${random.pick(allLocations).name} during the time of the murder.`,
        foundAt: random.pick(allLocations).id,
        pointsTo: innocent.id,
        significance: 'normal',
      })
    );
  }

  // 7. Red herrings (point to innocents but can be refuted)
  const shuffledInnocents = random.shuffle(others);
  for (let i = 0; i < Math.min(config.redHerringCount, shuffledInnocents.length); i++) {
    const redHerringTarget = shuffledInnocents[i];
    const alibiClue = clues.find(
      c => c.pointsTo === redHerringTarget.id && c.type === ClueType.Testimonial
    );

    clues.push(
      createClue({
        id: nextClueId(),
        type: ClueType.Physical,
        name: getRedHerringName(random),
        description: `Evidence that initially seems to implicate ${redHerringTarget.firstName}, but doesn't hold up to scrutiny.`,
        foundAt: crimeScene.id,
        pointsTo: redHerringTarget.id,
        isRedHerring: true,
        refutedBy: alibiClue?.id,
        significance: 'minor',
      })
    );
  }

  // 8. Relationship revelation clue (for secret relationships)
  const secretRelationship = relationships.find(r => !r.isPublicKnowledge);
  if (secretRelationship) {
    const privateLocations = allLocations.filter(l => !l.isPublic);
    const hiddenLocation = privateLocations.length > 0
      ? random.pick(privateLocations)
      : random.pick(allLocations);
    clues.push(
      createClue({
        id: nextClueId(),
        type: ClueType.Documentary,
        name: 'Hidden Correspondence',
        description: `Letters revealing a secret ${secretRelationship.type} relationship.`,
        foundAt: hiddenLocation.id,
        significance: 'normal',
      })
    );
  }

  // Shuffle clues so discovery order is unpredictable
  return random.shuffle(clues);
}

function getPhysicalEvidenceName(weapon: WeaponType, random: RandomSource): string {
  const names: Record<WeaponType, string[]> = {
    [WeaponType.Poison]: ['Poison Vial', 'Empty Medicine Bottle', 'Suspicious Powder'],
    [WeaponType.Knife]: ['Bloodied Blade', 'Letter Opener', 'Kitchen Knife'],
    [WeaponType.Blunt]: ['Dented Candlestick', 'Bronze Statue', 'Heavy Paperweight'],
    [WeaponType.Firearm]: ['Discharged Revolver', 'Spent Shell Casing', 'Gun Oil Residue'],
    [WeaponType.Strangulation]: ['Torn Silk Scarf', 'Rope Fibers', 'Ligature Marks'],
    [WeaponType.Pushed]: ['Broken Railing', 'Torn Fabric on Balcony', 'Scuff Marks'],
  };
  return random.pick(names[weapon]);
}

function getPhysicalEvidenceDescription(
  weapon: WeaponType,
  killer: Suspect,
  random: RandomSource
): string {
  const descriptions: Record<WeaponType, string[]> = {
    [WeaponType.Poison]: [
      `An empty vial with traces of arsenic. The label has been torn off, but the style matches bottles in ${killer.firstName}'s possession.`,
      `A small glass container that once held a deadly substance. Fingerprint analysis might prove useful.`,
    ],
    [WeaponType.Knife]: [
      `A blade stained with the victim's blood. The handle bears an unusual marking.`,
      `A sharp implement found near the body. It appears to have been wiped clean, but traces remain.`,
    ],
    [WeaponType.Blunt]: [
      `A heavy object bearing blood and hair. It was clearly used with considerable force.`,
      `The murder weapon, carelessly discarded. Forensic examination may reveal the killer's identity.`,
    ],
    [WeaponType.Firearm]: [
      `A revolver with one bullet missing from the chamber. Recently fired.`,
      `Shell casings found at the scene. The gun itself may still be in the house.`,
    ],
    [WeaponType.Strangulation]: [
      `Fabric fibers found under the victim's fingernails, torn during the struggle.`,
      `A distinctive pattern of bruising on the victim's neck suggests a specific type of ligature.`,
    ],
    [WeaponType.Pushed]: [
      `The railing shows signs of a struggle. Someone was pushed with great force.`,
      `Fabric caught on a nail near the balcony edge. The victim grabbed at something—or someone.`,
    ],
  };
  return random.pick(descriptions[weapon]);
}

function getMotiveDocumentName(motive: MotiveType, random: RandomSource): string {
  const names: Record<MotiveType, string[]> = {
    [MotiveType.Jealousy]: ['Love Letters', 'Torn Photograph', 'Private Diary'],
    [MotiveType.Greed]: ['Modified Will', 'Insurance Policy', 'Financial Records'],
    [MotiveType.Revenge]: ['Threatening Letter', 'Legal Documents', 'Old Newspaper Clipping'],
    [MotiveType.Fear]: ['Blackmail Note', 'Incriminating Photographs', 'Sealed Envelope'],
    [MotiveType.Hatred]: ['Bitter Correspondence', 'Defaced Portrait', 'Burned Letters'],
    [MotiveType.Protection]: ['Secret Documents', 'Hidden Evidence', 'Coded Messages'],
    [MotiveType.Ambition]: ['Business Contract', 'Promotion Letter', 'Partnership Agreement'],
  };
  return random.pick(names[motive]);
}

function getMotiveDocumentDescription(
  motive: MotiveType,
  victim: Suspect,
  killer: Suspect,
  random: RandomSource
): string {
  const descriptions: Record<MotiveType, string[]> = {
    [MotiveType.Jealousy]: [
      `Documents revealing ${killer.firstName}'s jealousy over ${victim.firstName}'s romantic entanglements.`,
      `Evidence of a love triangle that drove ${killer.firstName} to desperate measures.`,
    ],
    [MotiveType.Greed]: [
      `Papers showing ${killer.firstName} stood to inherit a fortune upon ${victim.firstName}'s death.`,
      `Financial documents revealing ${killer.firstName} was about to be cut out of the will.`,
    ],
    [MotiveType.Revenge]: [
      `Letters documenting a past wrong that ${killer.firstName} could never forgive.`,
      `Evidence of an old betrayal that festered into murderous rage.`,
    ],
    [MotiveType.Fear]: [
      `${victim.firstName} had discovered something about ${killer.firstName} that could destroy them.`,
      `Blackmail materials showing ${killer.firstName} was being threatened with exposure.`,
    ],
    [MotiveType.Hatred]: [
      `A long history of animosity between ${killer.firstName} and the victim, documented in bitter letters.`,
      `Evidence of a deep-seated hatred that finally boiled over.`,
    ],
    [MotiveType.Protection]: [
      `Documents showing ${killer.firstName} killed to protect someone else—or a terrible secret.`,
      `${victim.firstName} was about to expose something that would harm someone ${killer.firstName} loves.`,
    ],
    [MotiveType.Ambition]: [
      `${victim.firstName} was standing in the way of ${killer.firstName}'s advancement.`,
      `Business documents showing ${killer.firstName} would gain power or position from the death.`,
    ],
  };
  return random.pick(descriptions[motive]);
}

function getRedHerringName(random: RandomSource): string {
  const names = [
    'Suspicious Object',
    'Misplaced Item',
    'Circumstantial Evidence',
    'Misleading Clue',
    'Planted Evidence',
  ];
  return random.pick(names);
}
