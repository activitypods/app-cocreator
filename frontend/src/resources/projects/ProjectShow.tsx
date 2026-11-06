import { useState } from 'react';
import { useGetIdentity, useShow, useTranslate } from '@refinedev/core';
import { Avatar, Button, Flex, Spin, Tooltip, Typography } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import useActorProfile from '../../hooks/useActorProfile';
import Conversation from './Conversation';
import InviteDialog from './InviteDialog';
import { getConversationUri, getMemberUris, type Project } from './types';

const Member = ({ actorUri }: { actorUri: string }) => {
  const { data: profile } = useActorProfile(actorUri);
  const name = profile?.['vcard:given-name'];
  return (
    <Tooltip title={name}>
      <Avatar src={profile?.['vcard:photo']}>{name?.[0]?.toUpperCase()}</Avatar>
    </Tooltip>
  );
};

const ProjectShow = () => {
  const translate = useTranslate();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const [isInviting, setIsInviting] = useState(false);
  const { query } = useShow<Project>({
    resource: 'projects',
    liveMode: 'off',
    queryOptions: {
      // The backend attaches the conversation just after the project is created, and adds new members
      refetchInterval: ({ state }) => (state.data && !getConversationUri(state.data.data) ? 1000 : 30000)
    }
  });
  const project = query.data?.data;
  const isCreator = !!project && project['dc:creator'] === identity?.id;
  // The backend adds the invited members to the project asynchronously
  const [invitedUris, setInvitedUris] = useState<string[]>([]);
  const memberUris = [
    ...new Set([...(project ? [project['dc:creator']] : []), ...getMemberUris(project), ...invitedUris])
  ];

  if (!project) return <Spin />;

  return (
    <Flex vertical style={{ height: 'calc(100vh - 112px)' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {project['pair:label']}
        </Typography.Title>
        <Flex gap={12} align="center">
          <Avatar.Group>
            {memberUris.map(actorUri => (
              <Member key={actorUri} actorUri={actorUri} />
            ))}
          </Avatar.Group>
          {isCreator && (
            <Button icon={<UserAddOutlined />} onClick={() => setIsInviting(true)}>
              {translate('projects.invite', 'Invite')}
            </Button>
          )}
        </Flex>
      </Flex>
      {getConversationUri(project) ? <Conversation project={project} /> : <Spin />}
      {isInviting && (
        <InviteDialog
          project={project}
          memberUris={memberUris}
          onClose={() => setIsInviting(false)}
          onInvited={actorUris => setInvitedUris([...invitedUris, ...actorUris])}
        />
      )}
    </Flex>
  );
};

export default ProjectShow;
