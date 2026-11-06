import { useEffect, useRef } from 'react';
import { arrayOf, fetchWithSession } from '@activitypods/refine-providers';
import { authProvider } from '../config/providers';

const CHANNEL_TYPE = 'notify:WebSocketChannel2023';
const RECONNECT_DELAY = 5000;

type Handlers = {
  onAdd: (itemUri: string) => void;
  onReconnect: () => void;
};

/**
 * Listen to a collection through Solid Notifications. On other servers, the channel is created
 * through the user's Pod proxy, then the socket connects directly: its URL is enough to read it.
 */
const useCollectionChannel = (collectionUri: string | undefined, handlers: Handlers) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!collectionUri) return undefined;

    let stopped = false;
    let socket: WebSocket | undefined;
    let channelUri: string | undefined;
    let retry: ReturnType<typeof setTimeout>;
    let wasConnected = false;
    const session = authProvider.getSession() ?? undefined;

    const scheduleRetry = () => {
      if (!stopped) retry = setTimeout(connect, RECONNECT_DELAY);
    };

    const connect = async () => {
      try {
        const { origin } = new URL(collectionUri);
        const { json: storage } = await fetchWithSession(`${origin}/.well-known/solid`, {}, session);
        const endpoint = arrayOf<string>(storage['notify:subscription']).find(uri =>
          uri.includes('WebSocketChannel2023')
        );
        if (!endpoint) throw new Error(`No WebSocket channel available on ${origin}`);

        const { json: channel } = await fetchWithSession(
          endpoint,
          {
            method: 'POST',
            body: JSON.stringify({
              '@context': { notify: 'http://www.w3.org/ns/solid/notifications#' },
              '@type': CHANNEL_TYPE,
              'notify:topic': collectionUri
            })
          },
          session
        );
        if (stopped) return;
        channelUri = channel.id || channel['@id'];

        socket = new WebSocket(channel['notify:receiveFrom']);
        socket.onopen = () => {
          // Messages may have been missed while the socket was closed
          if (wasConnected) handlersRef.current.onReconnect();
          wasConnected = true;
        };
        socket.onmessage = event => {
          const activity = JSON.parse(event.data);
          if (activity.type === 'Add') handlersRef.current.onAdd(activity.object);
        };
        socket.onclose = scheduleRetry;
      } catch (e) {
        console.warn(`Could not listen to ${collectionUri}`, e);
        scheduleRetry();
      }
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (channelUri) fetchWithSession(channelUri, { method: 'DELETE' }, session).catch(() => undefined);
    };
  }, [collectionUri]);
};

export default useCollectionChannel;
