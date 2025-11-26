import { LocationId } from './types';

export interface Location {
  readonly id: LocationId;
  readonly name: string;
  readonly description: string;
  readonly isPublic: boolean; // Can anyone access it?
  readonly isCrimeScene: boolean;
}

export interface CreateLocationParams {
  id: LocationId;
  name: string;
  description: string;
  isPublic?: boolean;
  isCrimeScene?: boolean;
}

export function createLocation(params: CreateLocationParams): Location {
  return Object.freeze({
    id: params.id,
    name: params.name,
    description: params.description,
    isPublic: params.isPublic ?? true,
    isCrimeScene: params.isCrimeScene ?? false,
  });
}

export function isCrimeScene(location: Location): boolean {
  return location.isCrimeScene;
}

export function isPrivateLocation(location: Location): boolean {
  return !location.isPublic;
}
