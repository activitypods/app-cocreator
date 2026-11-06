import { useState } from 'react';
import { useCreate, useGetIdentity, useList, useNavigation, useNotification, useTranslate } from '@refinedev/core';
import { Button, Card, Empty, Flex, Form, Input, List, Modal, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Project } from './types';

const ProjectList = () => {
  const translate = useTranslate();
  const { open: notify } = useNotification();
  const { show } = useNavigation();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { result, query } = useList<Project>({ resource: 'projects', pagination: { mode: 'off' } });
  const { mutateAsync: createProject } = useCreate<Project>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onCreate = async ({ name }: { name: string }) => {
    setIsSaving(true);
    try {
      const { data: project } = await createProject({
        resource: 'projects',
        values: { 'pair:label': name },
        successNotification: false
      });
      show('projects', project.id);
    } catch (e) {
      notify?.({ type: 'error', message: (e as Error).message });
      setIsSaving(false);
    }
  };

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {translate('projects.title', 'Projects')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsDialogOpen(true)}>
          {translate('projects.create', 'New project')}
        </Button>
      </Flex>
      <Card>
        <List
          loading={query.isLoading}
          dataSource={result.data}
          rowKey="id"
          locale={{ emptyText: <Empty description={translate('projects.empty', 'No project yet')} /> }}
          renderItem={project => (
            <List.Item key={project.id} onClick={() => show('projects', project.id)} style={{ cursor: 'pointer' }}>
              <Typography.Text strong>{project['pair:label']}</Typography.Text>
              {project['dc:creator'] !== identity?.id && (
                <Typography.Text type="secondary">{translate('projects.invited', 'Invited')}</Typography.Text>
              )}
            </List.Item>
          )}
        />
      </Card>
      <Modal
        title={translate('projects.create', 'New project')}
        open={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        okText={translate('projects.create_confirm', 'Create')}
        okButtonProps={{ htmlType: 'submit', form: 'create-project', loading: isSaving }}
        destroyOnHidden
      >
        <Form id="create-project" layout="vertical" onFinish={onCreate}>
          <Form.Item
            name="name"
            label={translate('projects.name', 'Name')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectList;
