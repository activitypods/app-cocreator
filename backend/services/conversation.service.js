const urlJoin = require('url-join');
const { PodActivitiesHandlerMixin } = require('@activitypods/app');
const { arrayOf } = require('@semapps/ldp');

module.exports = {
  name: 'conversation',
  mixins: [PodActivitiesHandlerMixin],
  dependencies: ['projects', 'notes'],
  activities: {
    invite: {
      match: { type: 'Announce', object: { type: 'pair:Project' } },
      async onEmit(ctx, activity, actorUri) {
        const projectUri = activity.object.id || activity.object['@id'];
        if (!projectUri.startsWith(urlJoin(actorUri, '/'))) return;
        await ctx.call('projects.addMembers', { projectUri, memberUris: arrayOf(activity.to), actorUri });
      }
    },
    postMessage: {
      match: { type: 'Create', object: { type: 'Note' } },
      // Messages of the project's creator are already stored in the right Pod
      async onEmit(ctx, activity, actorUri) {
        const note = activity.object;
        const project = await this.getProject(ctx, note, actorUri);
        if (project) await this.addToConversation(ctx, note.id, project, actorUri);
      },
      // Other members send their messages to the project's creator, like FEP-171b's conversation owner
      async onReceive(ctx, activity, actorUri) {
        const note = activity.object;
        const project = await this.getProject(ctx, note, actorUri);
        if (!project) return;

        if (note.attributedTo !== activity.actor || !(await this.isMember(ctx, activity.actor, project, actorUri))) {
          this.logger.warn(`Ignored message of ${activity.actor} about project ${project.id}`);
          return;
        }

        const messageUri = await ctx.call('notes.post', {
          resource: {
            type: 'Note',
            attributedTo: activity.actor,
            content: note.content,
            context: project.id,
            tag: note.tag,
            url: note.id,
            // The creator's Pod decides the order of the messages
            published: new Date().toISOString()
          },
          actorUri
        });
        await this.addToConversation(ctx, messageUri, project, actorUri);
      }
    }
  },
  methods: {
    async getProject(ctx, note, actorUri) {
      if (!note.context?.startsWith?.(urlJoin(actorUri, '/'))) return false;
      const { ok, body: project } = await ctx.call('pod-resources.get', { resourceUri: note.context, actorUri });
      return ok && arrayOf(project.type || project['@type']).includes('pair:Project') && project;
    },
    async isMember(ctx, memberUri, project, actorUri) {
      if (!project['apods:announces']) return false;
      const members = await ctx.call('pod-collections.getItems', {
        collectionUri: project['apods:announces'],
        actorUri
      });
      return members.includes(memberUri);
    },
    async addToConversation(ctx, messageUri, project, actorUri) {
      await ctx.call('pod-permissions.add', {
        uri: messageUri,
        agentUri: await ctx.call('projects.getMembersGroupUri', { projectUri: project.id }),
        agentPredicate: 'acl:agentGroup',
        mode: 'acl:Read',
        actorUri
      });
      await ctx.call('pod-collections.add', {
        collectionUri: await ctx.call('projects.getCollectionUriFromResource', { resource: project }),
        itemUri: messageUri,
        actorUri
      });
    }
  }
};
