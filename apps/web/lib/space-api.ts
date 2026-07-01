import { apiRequest } from "./api-client";

export type SpaceSummary = {
  id: string;
  name: string;
  dimensions: string;
  thumbnail: string | null;
};

export type SpaceElement = {
  id: string;
  element: {
    id: string;
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
  };
  x: number;
  y: number;
};

export type SpaceDetails = {
  dimensions: string;
  elements: SpaceElement[];
};

type CreateSpaceInput = {
  name: string;
  dimensions: string;
};

export function listSpaces(token: string) {
  return apiRequest<{ spaces: SpaceSummary[] }>("/api/v1/space/all", { token });
}

export function createSpace(token: string, input: CreateSpaceInput) {
  return apiRequest<{ spaceId: string }, CreateSpaceInput>("/api/v1/space", {
    method: "POST",
    token,
    body: input,
  });
}

export function deleteSpace(token: string, spaceId: string) {
  return apiRequest<{ message: string }>(`/api/v1/space/${spaceId}`, {
    method: "DELETE",
    token,
  });
}

export function getSpace(token: string, spaceId: string) {
  return apiRequest<SpaceDetails>(`/api/v1/space/${spaceId}`, { token });
}
