const urlJoin = require('url-join');
const rdf = require('@rdfjs/data-model').default;
const { PodCollectionsHandlerMixin } = require('@activitypods/app');
const CONFIG = require('../config/config');
const postToPod = require('../utils/postToPod');

// The Pod provider fills this group when a resource is shared
const getMembersGroupUri = projectUri => {
  const { origin, pathname } = new URL(projectUri);
  return `${origin}/_groups${pathname}/announces`;
};

module.exports = {
  name: 'projects',
  mixins: [PodCollectionsHandlerMixin],
  settings: {
    shapeTreeUri: urlJoin(CONFIG.SHAPE_REPOSITORY_URL, 'shapetrees/pair/Project'),
    attachPredicate: 'http://activitypods.org/ns/core#conversation',
    collectionOptions: {
      ordered: true,
      summary: 'Project conversation',
      itemsPerPage: 30,
      dereferenceItems: true,
      sortPredicate: 'as:published',
      sortOrder: 'semapps:DescOrder'
    }
  },
  actions: {
    getMembersGroupUri(ctx) {
      return getMembersGroupUri(ctx.params.projectUri);
    },
    // apods:announces can only be read by the project's creator
    async addMembers(ctx) {
      const { projectUri, memberUris, actorUri } = ctx.params;
      await ctx.call('pod-resources.patch', {
        resourceUri: projectUri,
        triplesToAdd: memberUris.map(memberUri =>
          rdf.quad(
            rdf.namedNode(projectUri),
            rdf.namedNode('http://virtual-assembly.org/ontologies/pair#involves'),
            rdf.namedNode(memberUri)
          )
        ),
        actorUri
      });
    }
  },
  methods: {
    // pod-collections.createAndAttach only sets the OrderedCollection type, but as:Collection is
    // also needed to read the collection
    async createConversation(ctx, projectUri, actorUri) {
      const { summary, itemsPerPage, dereferenceItems, sortPredicate, sortOrder } = this.settings.collectionOptions;
      const collectionUri = await postToPod(
        ctx,
        urlJoin(actorUri, 'data/as/collection'),
        {
          type: ['Collection', 'OrderedCollection'],
          summary,
          'semapps:itemsPerPage': itemsPerPage,
          'semapps:dereferenceItems': dereferenceItems,
          'semapps:sortPredicate': sortPredicate,
          'semapps:sortOrder': sortOrder
        },
        actorUri
      );

      await ctx.call('pod-resources.patch', {
        resourceUri: projectUri,
        triplesToAdd: [
          rdf.quad(
            rdf.namedNode(projectUri),
            rdf.namedNode(this.settings.attachPredicate),
            rdf.namedNode(collectionUri)
          )
        ],
        actorUri
      });
      return collectionUri;
    },
    // Collections are public by default. pod-permissions.remove can't be used here, as it also
    // removes the authorizations which don't mention the agent class.
    async restrictToMembers(ctx, collectionUri, projectUri, actorUri) {
      const { origin, pathname } = new URL(collectionUri);
      const aclUri = `${origin}/_acl${pathname}`;
      const authorizations = await ctx.call('pod-permissions.get', { uri: collectionUri, actorUri });
      const { ok } = await ctx.call('pod-permissions.fetch', {
        url: aclUri,
        method: 'PUT',
        headers: { 'Content-Type': 'application/ld+json' },
        body: JSON.stringify({
          '@context': {
            '@base': aclUri,
            acl: 'http://www.w3.org/ns/auth/acl#',
            foaf: 'http://xmlns.com/foaf/0.1/',
            'acl:agent': { '@type': '@id' },
            'acl:agentGroup': { '@type': '@id' },
            'acl:agentClass': { '@type': '@id' },
            'acl:mode': { '@type': '@id' },
            'acl:accessTo': { '@type': '@id' }
          },
          '@graph': authorizations
            .filter(authorization => authorization['acl:accessTo'] === collectionUri)
            .map(({ 'acl:agentClass': agentClass, ...authorization }) =>
              authorization['acl:mode'] === 'acl:Read'
                ? { ...authorization, 'acl:agentGroup': getMembersGroupUri(projectUri) }
                : authorization
            )
        }),
        actorUri
      });
      if (!ok) throw new Error(`Could not restrict ${collectionUri} to the members of ${projectUri}`);
    },
    async onCreate(ctx, resource, actorUri) {
      const projectUri = resource.id || resource['@id'];
      const { body: project } = await ctx.call('pod-resources.get', { resourceUri: projectUri, actorUri });
      if (await this.actions.getCollectionUriFromResource({ resource: project }, { parentCtx: ctx })) return;

      await this.actions.addMembers({ projectUri, memberUris: [actorUri], actorUri }, { parentCtx: ctx });
      const collectionUri = await this.createConversation(ctx, projectUri, actorUri);

      await this.restrictToMembers(ctx, collectionUri, projectUri, actorUri);
    }
  }
};
