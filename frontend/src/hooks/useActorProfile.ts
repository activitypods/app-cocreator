import { useQuery } from '@tanstack/react-query';
import { fetchWithSession } from '@activitypods/refine-providers';
import { authProvider } from '../config/providers';

export type Profile = { 'vcard:given-name'?: string; 'vcard:photo'?: string };

const useActorProfile = (actorUri?: string) =>
  useQuery({
    queryKey: ['actor-profile', actorUri],
    queryFn: async (): Promise<Profile | null> => {
      const session = authProvider.getSession() ?? undefined;
      const { json: actor } = await fetchWithSession(actorUri!, {}, session);
      try {
        const { json: profile } = await fetchWithSession(actor.url, {}, session);
        return profile;
      } catch {
        // Profiles are only readable by contacts, and members of a project are not always contacts
        return { 'vcard:given-name': actor.preferredUsername };
      }
    },
    enabled: !!actorUri,
    retry: false,
    staleTime: 5 * 60 * 1000
  });

export default useActorProfile;
