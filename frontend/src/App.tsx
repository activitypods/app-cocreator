import { Authenticated, Refine } from '@refinedev/core';
import { ErrorComponent, useNotificationProvider } from '@refinedev/antd';
import routerProvider, { CatchAllNavigate, NavigateToResource } from '@refinedev/react-router';
import { LoginPage } from '@activitypods/refine-antd';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';
import { ProjectOutlined } from '@ant-design/icons';
import '@ant-design/v5-patch-for-react-19';
import '@refinedev/antd/dist/reset.css';

import { authProvider, dataProvider, liveProvider } from './config/providers';
import { APP_LANG, POD_PROVIDER_BASE_URL } from './config/env';
import { i18nProvider } from './i18n';
import Layout from './Layout';
import ProjectList from './resources/projects/ProjectList';
import ProjectShow from './resources/projects/ProjectShow';

const App = () => (
  <BrowserRouter>
    <ConfigProvider locale={APP_LANG === 'fr' ? frFR : enUS}>
      <AntdApp>
        <Refine
          authProvider={authProvider}
          dataProvider={dataProvider}
          liveProvider={liveProvider}
          routerProvider={routerProvider}
          i18nProvider={i18nProvider}
          notificationProvider={useNotificationProvider}
          resources={[
            {
              name: 'projects',
              list: '/projects',
              show: '/projects/show/:id',
              meta: { icon: <ProjectOutlined /> }
            }
          ]}
          options={{ syncWithLocation: false, disableTelemetry: true, liveMode: 'auto' }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage defaultPodProvider={POD_PROVIDER_BASE_URL} />} />
            <Route
              element={
                <Authenticated key="authenticated-routes" fallback={<CatchAllNavigate to="/login" />}>
                  <Layout>
                    <Outlet />
                  </Layout>
                </Authenticated>
              }
            >
              <Route index element={<NavigateToResource resource="projects" />} />
              <Route path="/projects">
                <Route index element={<ProjectList />} />
                <Route path="show/:id" element={<ProjectShow />} />
              </Route>
              <Route path="*" element={<ErrorComponent />} />
            </Route>
          </Routes>
        </Refine>
      </AntdApp>
    </ConfigProvider>
  </BrowserRouter>
);

export default App;
