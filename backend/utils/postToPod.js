// pod-resources.post of @activitypods/app 2.3.2 can't read the Location header
const postToPod = async (ctx, containerUri, resource, actorUri) => {
  const { ok, headers } = await ctx.call('pod-resources.fetch', {
    url: containerUri,
    method: 'POST',
    headers: { 'Content-Type': 'application/ld+json' },
    body: JSON.stringify({ '@context': await ctx.call('jsonld.context.get'), ...resource }),
    actorUri
  });
  if (!ok) throw new Error(`Could not post to ${containerUri}`);
  return headers.location;
};

module.exports = postToPod;
