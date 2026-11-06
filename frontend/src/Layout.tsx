import type { ReactNode } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { ThemedLayout, ThemedTitle } from '@refinedev/antd';
import { BackgroundChecks } from '@activitypods/refine-antd';
import type { Identity } from '@activitypods/refine-providers';
import { APP_NAME } from './config/env';

const Layout = ({ children }: { children: ReactNode }) => {
  const { data: identity } = useGetIdentity<Identity>();
  const listeningTo = [identity?.webIdData?.inbox, identity?.webIdData?.outbox].filter(Boolean);
  return (
    // Redirects to the consent screen if the app's access needs changed
    <BackgroundChecks listeningTo={listeningTo}>
      <ThemedLayout Title={({ collapsed }) => <ThemedTitle collapsed={collapsed} text={APP_NAME} />}>
        {children}
      </ThemedLayout>
    </BackgroundChecks>
  );
};

export default Layout;
