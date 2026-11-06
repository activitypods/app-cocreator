import type { ReactNode } from 'react';
import { useGetIdentity, useLogout, useTranslate } from '@refinedev/core';
import { BackgroundChecks } from '@activitypods/refine-antd';
import type { Identity } from '@activitypods/refine-providers';
import { Button, Flex, Layout as AntdLayout, Typography, theme } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import { APP_NAME } from './config/env';

const Layout = ({ children }: { children: ReactNode }) => {
  const translate = useTranslate();
  const { token } = theme.useToken();
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const listeningTo = [identity?.webIdData?.inbox, identity?.webIdData?.outbox].filter(Boolean);
  return (
    // Redirects to the consent screen if the app's access needs changed
    <BackgroundChecks listeningTo={listeningTo}>
      <AntdLayout style={{ minHeight: '100vh' }}>
        <AntdLayout.Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: '0 24px'
          }}
        >
          <Flex justify="space-between" align="center" style={{ height: '100%' }}>
            <Link to="/projects">
              <Typography.Text strong style={{ fontSize: 16 }}>
                {APP_NAME}
              </Typography.Text>
            </Link>
            <Flex gap={12} align="center">
              <Typography.Text>{identity?.name}</Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={() => logout()}>
                {translate('buttons.logout', 'Logout')}
              </Button>
            </Flex>
          </Flex>
        </AntdLayout.Header>
        <AntdLayout.Content style={{ padding: 24 }}>{children}</AntdLayout.Content>
      </AntdLayout>
    </BackgroundChecks>
  );
};

export default Layout;
