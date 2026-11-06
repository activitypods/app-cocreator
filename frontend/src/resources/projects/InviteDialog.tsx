import { useState } from 'react';
import { useGetIdentity, useList, useNotification, useTranslate } from '@refinedev/core';
import { useOutbox } from '@activitypods/refine-hooks';
import { Avatar, Checkbox, Empty, List, Modal } from 'antd';
import type { Project } from './types';

type Contact = { id: string; describes: string; 'vcard:given-name'?: string; 'vcard:photo'?: string };

type Props = {
  project: Project;
  memberUris: string[];
  onClose: () => void;
  onInvited: (actorUris: string[]) => void;
};

const InviteDialog = ({ project, memberUris, onClose, onInvited }: Props) => {
  const translate = useTranslate();
  const { open: notify } = useNotification();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const outbox = useOutbox();
  const { result, query } = useList<Contact>({
    resource: 'contacts',
    pagination: { mode: 'off' },
    sorters: [{ field: 'vcard:given-name', order: 'asc' }],
    liveMode: 'off'
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const contacts = result.data.filter(contact => contact.describes && contact.describes !== identity?.id);

  const invite = async () => {
    setIsSending(true);
    try {
      await outbox.post({ type: 'Announce', actor: identity?.id, object: project.id, to: selected });
      onInvited(selected);
      onClose();
    } catch (e) {
      notify?.({ type: 'error', message: (e as Error).message });
      setIsSending(false);
    }
  };

  return (
    <Modal
      open
      title={translate('projects.invite', 'Invite')}
      onCancel={onClose}
      onOk={invite}
      okText={translate('projects.invite_confirm', 'Send invitations')}
      okButtonProps={{ disabled: selected.length === 0, loading: isSending }}
    >
      <List
        loading={query.isLoading}
        dataSource={contacts}
        rowKey="id"
        locale={{ emptyText: <Empty description={translate('projects.no_contacts', 'No contact yet')} /> }}
        style={{ maxHeight: '50vh', overflowY: 'auto' }}
        renderItem={contact => {
          const isMember = memberUris.includes(contact.describes);
          return (
            <List.Item
              extra={
                <Checkbox
                  aria-label={contact['vcard:given-name']}
                  disabled={isMember}
                  checked={isMember || selected.includes(contact.describes)}
                  onChange={e =>
                    setSelected(
                      e.target.checked
                        ? [...selected, contact.describes]
                        : selected.filter(uri => uri !== contact.describes)
                    )
                  }
                />
              }
            >
              <List.Item.Meta
                avatar={<Avatar src={contact['vcard:photo']}>{contact['vcard:given-name']?.[0]?.toUpperCase()}</Avatar>}
                title={contact['vcard:given-name']}
              />
            </List.Item>
          );
        }}
      />
    </Modal>
  );
};

export default InviteDialog;
