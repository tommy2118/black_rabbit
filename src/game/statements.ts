import { Case } from '@/domain/case';
import { Suspect, getFullName } from '@/domain/suspect';
import { Alibi } from '@/domain/alibi';
import { Relationship, getRelationshipDescription } from '@/domain/relationship';
import { SuspectId, ClueId, ClueType } from '@/domain/types';
import { RandomSource } from '@/generation/random';

// A statement is something a suspect says during interrogation
export interface Statement {
  readonly id: string;
  readonly suspectId: SuspectId;
  readonly text: string;
  readonly topic: 'alibi' | 'victim' | 'relationships' | 'observations' | 'self';
  readonly isLie: boolean;
  readonly contradictedBy: readonly ClueId[]; // Evidence that proves this false
  readonly pressResponse: string; // What they say when pressed
  readonly truthReveal?: string; // What they admit when caught in lie
}

export interface Testimony {
  readonly suspectId: SuspectId;
  readonly statements: readonly Statement[];
}

// Generate all testimonies for a case
export function generateTestimonies(
  generatedCase: Case,
  random: RandomSource
): Map<SuspectId, Testimony> {
  const testimonies = new Map<SuspectId, Testimony>();

  // Get living suspects (not the victim)
  const suspects = generatedCase.suspects.filter(s => !s.isVictim);

  for (const suspect of suspects) {
    const alibi = generatedCase.alibis.find(a => a.suspectId === suspect.id);
    const relationships = generatedCase.relationships.filter(
      r => r.from === suspect.id || r.to === suspect.id
    );
    const victim = generatedCase.suspects.find(s => s.isVictim)!;

    const statements = generateSuspectStatements(
      suspect,
      victim,
      alibi,
      relationships,
      generatedCase,
      random
    );

    testimonies.set(suspect.id, {
      suspectId: suspect.id,
      statements,
    });
  }

  return testimonies;
}

function generateSuspectStatements(
  suspect: Suspect,
  victim: Suspect,
  alibi: Alibi | undefined,
  relationships: Relationship[],
  generatedCase: Case,
  random: RandomSource
): Statement[] {
  const statements: Statement[] = [];
  let statementIndex = 0;

  const nextId = () => `${suspect.id}-stmt-${statementIndex++}`;

  // 1. Alibi statement (potentially false for killer)
  if (alibi) {
    const alibiStatement = generateAlibiStatement(
      nextId(),
      suspect,
      alibi,
      generatedCase
    );
    statements.push(alibiStatement);
  }

  // 2. Statement about relationship with victim
  const victimRelationship = relationships.find(
    r => r.to === victim.id || r.from === victim.id
  );
  if (victimRelationship) {
    statements.push(
      generateRelationshipStatement(
        nextId(),
        suspect,
        victim,
        victimRelationship,
        generatedCase
      )
    );
  }

  // 3. Observation statement (what they claim to have seen/heard)
  statements.push(
    generateObservationStatement(nextId(), suspect, generatedCase, random)
  );

  // 4. Statement about self (potential motive denial or admission)
  statements.push(
    generateSelfStatement(nextId(), suspect, victim, generatedCase, random)
  );

  return statements;
}

function generateAlibiStatement(
  id: string,
  suspect: Suspect,
  alibi: Alibi,
  generatedCase: Case
): Statement {
  const location = generatedCase.locations.find(l => l.id === alibi.location);
  const locationName = location?.name || 'somewhere';

  // Find clues that contradict this alibi (for killer)
  const contradictingClues = generatedCase.clues
    .filter(clue => {
      // Clues that place suspect elsewhere or prove alibi false
      if (clue.pointsTo === suspect.id && !clue.isRedHerring) {
        return clue.type === ClueType.Testimonial || clue.type === ClueType.Physical;
      }
      return false;
    })
    .map(c => c.id);

  if (alibi.isFalse) {
    // Killer's false alibi
    return {
      id,
      suspectId: suspect.id,
      text: `I was in the ${locationName} the entire evening. I never left.`,
      topic: 'alibi',
      isLie: true,
      contradictedBy: contradictingClues,
      pressResponse: `I'm quite certain. I was... resting. Alone, yes, but I was definitely there.`,
      truthReveal: `...Fine. I wasn't in the ${locationName} the whole time. But that doesn't mean I did anything wrong!`,
    };
  } else {
    // Innocent's true alibi
    const witnesses = alibi.witnesses
      .map(wId => generatedCase.suspects.find(s => s.id === wId)?.firstName)
      .filter(Boolean)
      .join(' and ');

    return {
      id,
      suspectId: suspect.id,
      text: `I was in the ${locationName} during that time. ${witnesses ? `${witnesses} can confirm this.` : 'I was alone, but I assure you I was there.'}`,
      topic: 'alibi',
      isLie: false,
      contradictedBy: [],
      pressResponse: witnesses
        ? `Ask ${witnesses} if you don't believe me. They'll tell you I was there.`
        : `I know I can't prove it, but I swear I was there. I had no reason to leave.`,
    };
  }
}

function generateRelationshipStatement(
  id: string,
  suspect: Suspect,
  victim: Suspect,
  relationship: Relationship,
  generatedCase: Case
): Statement {
  const relDesc = getRelationshipDescription(relationship);
  const isSecret = !relationship.isPublicKnowledge;
  const isHostile = relationship.sentiment < -3;

  // Find clues that reveal this relationship
  const revealingClues = generatedCase.clues
    .filter(c => c.type === ClueType.Documentary && c.description.toLowerCase().includes('relationship'))
    .map(c => c.id);

  if (isSecret) {
    // Hiding the relationship
    return {
      id,
      suspectId: suspect.id,
      text: `${victim.firstName}? We were merely acquaintances. Nothing more.`,
      topic: 'relationships',
      isLie: true,
      contradictedBy: revealingClues,
      pressResponse: `I don't know what you're implying. We barely knew each other.`,
      truthReveal: `...Alright. ${victim.firstName} and I were... closer than I let on. But that's private!`,
    };
  } else if (isHostile) {
    // Admitting hostility but denying murder
    return {
      id,
      suspectId: suspect.id,
      text: `${victim.firstName} and I... didn't always see eye to eye. But I didn't kill them!`,
      topic: 'relationships',
      isLie: false,
      contradictedBy: [],
      pressResponse: `Yes, we had our disagreements. ${victim.firstName} could be difficult. But murder? Never.`,
    };
  } else {
    // Normal relationship
    return {
      id,
      suspectId: suspect.id,
      text: `I was ${relDesc} ${victim.firstName}. We got along well enough.`,
      topic: 'relationships',
      isLie: false,
      contradictedBy: [],
      pressResponse: `There's not much more to say. We had a normal relationship.`,
    };
  }
}

function generateObservationStatement(
  id: string,
  suspect: Suspect,
  generatedCase: Case,
  random: RandomSource
): Statement {
  const isKiller = suspect.isKiller;
  const crimeScene = generatedCase.locations.find(
    l => l.id === generatedCase.crimeScene
  );

  // Find testimonial clues that contradict what they claim to have seen
  const contradictingClues = isKiller
    ? generatedCase.clues
        .filter(c => c.type === ClueType.Testimonial && c.pointsTo === suspect.id)
        .map(c => c.id)
    : [];

  if (isKiller) {
    // Pick a random strategy for the killer's observation lie
    const killerObservations = [
      {
        text: `I didn't see anything unusual that evening. Everything seemed perfectly normal.`,
        pressResponse: `I was... preoccupied. I wasn't paying attention to others.`,
      },
      {
        text: `I kept to myself most of the evening. I'm afraid I can't help you.`,
        pressResponse: `I don't make it a habit to spy on others. I minded my own business.`,
      },
      {
        text: `The evening was unremarkable until we heard the scream. I was as shocked as everyone.`,
        pressResponse: `What more do you want me to say? I didn't see who did it.`,
      },
      {
        text: `I was distracted all evening. Personal matters, you understand. I noticed nothing.`,
        pressResponse: `My thoughts were elsewhere. The evening is a blur, honestly.`,
      },
      {
        text: `Everyone seemed normal to me. I had no reason to suspect anything was wrong.`,
        pressResponse: `In hindsight, perhaps I should have paid more attention. But I didn't.`,
      },
    ];

    const chosen = random.pick(killerObservations);

    return {
      id,
      suspectId: suspect.id,
      text: chosen.text,
      topic: 'observations',
      isLie: true,
      contradictedBy: contradictingClues,
      pressResponse: chosen.pressResponse,
      truthReveal: `Stop pressuring me! I... I may have been near the ${crimeScene?.name || 'scene'}. But I didn't do anything!`,
    };
  } else {
    // Innocent may have genuinely seen something
    const observations = [
      `I thought I heard raised voices at one point, but I couldn't make out the words.`,
      `I noticed ${getFullName(generatedCase.suspects.find(s => s.isKiller)!)} seemed distracted that evening.`,
      `The atmosphere felt tense, but I attributed it to the usual family drama.`,
      `I saw someone moving through the hallway, but it was too dark to tell who.`,
    ];

    return {
      id,
      suspectId: suspect.id,
      text: random.pick(observations),
      topic: 'observations',
      isLie: false,
      contradictedBy: [],
      pressResponse: `That's all I know. I wish I had paid more attention.`,
    };
  }
}

function generateSelfStatement(
  id: string,
  suspect: Suspect,
  victim: Suspect,
  generatedCase: Case,
  random: RandomSource
): Statement {
  const isKiller = suspect.isKiller;

  // Find motive-related clues
  const motiveClues = generatedCase.clues
    .filter(
      c =>
        c.type === ClueType.Documentary &&
        c.pointsTo === suspect.id &&
        c.significance === 'critical'
    )
    .map(c => c.id);

  if (isKiller) {
    // Killer denies motive
    return {
      id,
      suspectId: suspect.id,
      text: `I had no reason to want ${victim.firstName} dead. None at all.`,
      topic: 'self',
      isLie: true,
      contradictedBy: motiveClues,
      pressResponse: `Why would I? I had nothing to gain from this tragedy.`,
      truthReveal: `...You found out about that? Fine. Yes, I had... reasons. But that doesn't prove I killed anyone!`,
    };
  } else {
    // Innocent defends themselves
    const defenses = [
      `I know how this looks, but I'm innocent. Please believe me.`,
      `I may not have liked ${victim.firstName}, but I'm not a murderer.`,
      `You're wasting time suspecting me. The real killer is still out there.`,
      `I have nothing to hide. Ask me anything.`,
    ];

    return {
      id,
      suspectId: suspect.id,
      text: random.pick(defenses),
      topic: 'self',
      isLie: false,
      contradictedBy: [],
      pressResponse: `I understand you have to investigate everyone. I just hope you find the truth.`,
    };
  }
}

// Check if evidence contradicts a statement
export function checkContradiction(
  statement: Statement,
  evidenceId: ClueId
): boolean {
  return statement.contradictedBy.includes(evidenceId);
}

// Get all contradictable statements for a suspect
export function getContradictableStatements(testimony: Testimony): Statement[] {
  return testimony.statements.filter(s => s.isLie && s.contradictedBy.length > 0);
}
