import type { BaseRecord } from '@refinedev/core';
import { arrayOf } from '@activitypods/refine-providers';

export type Project = BaseRecord & {
  id: string;
  'pair:label': string;
  'dc:creator': string;
  'apods:conversation'?: string | { id: string };
  'pair:involves'?: string | { id: string } | (string | { id: string })[];
};

export type Message = {
  id: string;
  attributedTo: string;
  content: string;
  published: string;
};

type Reference = string | { id: string };

const getUri = (reference: Reference) => (typeof reference === 'string' ? reference : reference.id);

// Until apods:conversation is declared in the ontology of the Pods, its value is an object
export const getConversationUri = (project?: Project): string | undefined => {
  const value = project?.['apods:conversation'];
  return value && getUri(value);
};

export const getMemberUris = (project?: Project): string[] => arrayOf(project?.['pair:involves']).map(getUri);
