import urlJoin from 'url-join';
import {
  authProvider as apodsAuthProvider,
  dataProvider as apodsDataProvider,
  liveProvider as apodsLiveProvider
} from '@activitypods/refine-providers';
import { BACKEND_URL, CLIENT_ID, SHAPE_REPOSITORY_URL } from './env';

export const resources = {
  projects: {
    shapeTreeUri: urlJoin(SHAPE_REPOSITORY_URL, 'shapetrees/pair/Project')
  },
  contacts: {
    shapeTreeUri: urlJoin(SHAPE_REPOSITORY_URL, 'shapetrees/as/Profile')
  }
};

// The backend context includes the ontologies declared by the app
export const jsonContext = [
  'https://www.w3.org/ns/activitystreams',
  urlJoin(new URL(BACKEND_URL).origin, '.well-known/context.jsonld')
];

export const authProvider = apodsAuthProvider({
  clientId: CLIENT_ID,
  // Already done by the BackgroundChecks component
  appStatusCheckInterval: false
});

export const dataProvider = apodsDataProvider({ authProvider, resources, jsonContext });

export const liveProvider = apodsLiveProvider({ authProvider, resources, jsonContext });
