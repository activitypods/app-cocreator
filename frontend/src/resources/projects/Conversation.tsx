import { useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useGetIdentity, useNotification, useTranslate } from '@refinedev/core';
import { useCollection, useOutbox } from '@activitypods/refine-hooks';
import { fetchWithSession } from '@activitypods/refine-providers';
import { Avatar, Button, Card, Empty, Flex, Input, Spin, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authProvider } from '../../config/providers';
import useActorProfile from '../../hooks/useActorProfile';
import useCollectionChannel from '../../hooks/useCollectionChannel';
import { getConversationUri, type Message, type Project } from './types';

const LOAD_OLDER_THRESHOLD = 80;
const STICK_TO_BOTTOM_THRESHOLD = 120;

/** A message shown before the creator's Pod has added it to the conversation. */
type PendingMessage = Message & {
  /** Messages already in the conversation when it was sent: the one that shows up later with the
   *  same author and content, and isn't among these, is this message. */
  knownIds: string[];
};

const MessageItem = ({ message, isPending }: { message: Message; isPending?: boolean }) => {
  const { data: profile } = useActorProfile(message.attributedTo);
  const name = profile?.['vcard:given-name'];
  return (
    <Flex gap={8} align="start" data-testid="message" style={{ opacity: isPending ? 0.6 : 1 }}>
      <Avatar src={profile?.['vcard:photo']}>{name?.[0]?.toUpperCase()}</Avatar>
      <div style={{ minWidth: 0 }}>
        <Flex gap={8} align="baseline">
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(message.published).format('lll')}
          </Typography.Text>
        </Flex>
        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</div>
      </div>
    </Flex>
  );
};

const Conversation = ({ project }: { project: Project }) => {
  const translate = useTranslate();
  const { open: notify } = useNotification();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const outbox = useOutbox();
  const conversationUri = getConversationUri(project);
  const collection = useCollection(conversationUri);
  const [content, setContent] = useState('');
  const [pending, setPending] = useState<PendingMessage[]>([]);

  useCollectionChannel(conversationUri, {
    onAdd: async itemUri => {
      const { json: message } = await fetchWithSession(itemUri, {}, authProvider.getSession() ?? undefined);
      collection.addItem(message);
    },
    onReconnect: () => collection.refetch()
  });

  // The first pages hold the most recent messages
  const received: Message[] = useMemo(() => {
    const byId = new Map<string, Message>(collection.items.map((message: Message) => [message.id, message]));
    return [...byId.values()].sort((a, b) => a.published.localeCompare(b.published));
  }, [collection.items]);

  // A message goes through the creator's Pod before it reaches the conversation, so it is shown
  // right away, then swapped for the real one once it arrives
  const stillPending = useMemo(() => {
    const matched = new Set<string>();
    return pending.filter(message => {
      const arrived = received.find(
        ({ id, attributedTo, content }) =>
          !matched.has(id) &&
          !message.knownIds.includes(id) &&
          attributedTo === message.attributedTo &&
          content === message.content
      );
      if (arrived) matched.add(arrived.id);
      return !arrived;
    });
  }, [received, pending]);

  const messages = useMemo(() => [...received, ...stillPending], [received, stillPending]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number | undefined>(undefined);
  const isAtBottom = useRef(true);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (previousScrollHeight.current !== undefined) {
      // Older messages were added above: keep what the user is reading in place
      element.scrollTop += element.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = undefined;
    } else if (isAtBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const element = scrollRef.current!;
    isAtBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_THRESHOLD;
    if (element.scrollTop < LOAD_OLDER_THRESHOLD && collection.hasNextPage && !collection.isFetchingNextPage) {
      previousScrollHeight.current = element.scrollHeight;
      collection.fetchNextPage();
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;

    const published = new Date().toISOString();
    const id = `pending:${published}`;
    setPending(list => [
      ...list,
      {
        id,
        attributedTo: identity!.id,
        content: text,
        published,
        knownIds: received.map(message => message.id)
      }
    ]);
    setContent('');
    isAtBottom.current = true;

    try {
      const creator = project['dc:creator'];
      await outbox.post({
        type: 'Create',
        actor: identity?.id,
        to: creator !== identity?.id ? creator : undefined,
        object: {
          type: 'Note',
          attributedTo: identity?.id,
          content: text,
          context: project.id,
          published
        }
      });
    } catch (e) {
      setPending(list => list.filter(message => message.id !== id));
      setContent(text);
      notify?.({ type: 'error', message: (e as Error).message });
    }
  };

  return (
    <Card
      style={{ flex: 1, minHeight: 0 }}
      styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        data-testid="messages"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}
      >
        {collection.isFetchingNextPage && <Spin style={{ alignSelf: 'center' }} />}
        {collection.isLoading && <Spin style={{ alignSelf: 'center' }} />}
        {collection.isSuccess && messages.length === 0 && (
          <Empty description={translate('conversation.empty', 'No message yet')} />
        )}
        {messages.map(message => (
          <MessageItem
            key={message.id}
            message={message}
            isPending={stillPending.includes(message as PendingMessage)}
          />
        ))}
      </div>
      <form onSubmit={send}>
        <Flex gap={8}>
          <Input.TextArea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) send(e);
            }}
            placeholder={translate('conversation.placeholder', 'Write a message')}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            aria-label={translate('conversation.send', 'Send')}
          />
        </Flex>
      </form>
    </Card>
  );
};

export default Conversation;
