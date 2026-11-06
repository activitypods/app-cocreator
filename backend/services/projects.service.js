const urlJoin = require('url-join');
const rdf = require('@rdfjs/data-model').default;
const { PodCollectionsHandlerMixin } = require('@activitypods/app');
const CONFIG = require('../config/config');

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
    async onCreate(ctx, resource, actorUri) {
      const projectUri = resource.id || resource['@id'];

      // This can be called more than once for a project: nothing is returned if the collection exists
      const collectionUri = await this.actions.createAndAttach(
        { resourceUri: projectUri, actorUri },
        { parentCtx: ctx }
      );
      if (!collectionUri) return;

      await this.actions.addMembers({ projectUri, memberUris: [actorUri], actorUri }, { parentCtx: ctx });

      // Collections are public by default
      await ctx.call('pod-permissions.remove', {
        uri: collectionUri,
        agentUri: 'foaf:Agent',
        agentPredicate: 'acl:agentClass',
        mode: 'acl:Read',
        actorUri
      });
      await ctx.call('pod-permissions.add', {
        uri: collectionUri,
        agentUri: getMembersGroupUri(projectUri),
        agentPredicate: 'acl:agentGroup',
        mode: 'acl:Read',
        actorUri
      });
    }
  }
};
