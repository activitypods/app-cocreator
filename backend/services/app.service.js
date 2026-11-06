const urlJoin = require('url-join');
const { AppService } = require('@activitypods/app');
const CONFIG = require('../config/config');

module.exports = {
  mixins: [AppService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    app: {
      name: CONFIG.APP_NAME,
      description: CONFIG.APP_DESCRIPTION,
      thumbnail: urlJoin(CONFIG.FRONT_URL, 'logo192.png'),
      frontUrl: CONFIG.FRONT_URL,
      supportedLocales: CONFIG.APP_LANG
    },
    oidc: {
      clientUri: CONFIG.FRONT_URL,
      redirectUris: urlJoin(CONFIG.FRONT_URL, 'login'),
      postLogoutRedirectUris: urlJoin(CONFIG.FRONT_URL, 'login?logout=true'),
      tosUri: null
    },
    accessNeeds: {
      required: [
        {
          shapeTreeUri: urlJoin(CONFIG.SHAPE_REPOSITORY_URL, 'shapetrees/pair/Project'),
          accessMode: ['acl:Read', 'acl:Write']
        },
        {
          // Control is needed to let the members of a project read its messages
          shapeTreeUri: urlJoin(CONFIG.SHAPE_REPOSITORY_URL, 'shapetrees/as/Note'),
          accessMode: ['acl:Read', 'acl:Write', 'acl:Control']
        },
        {
          shapeTreeUri: urlJoin(CONFIG.SHAPE_REPOSITORY_URL, 'shapetrees/as/Profile'),
          accessMode: 'acl:Read'
        },
        'apods:ReadInbox',
        'apods:ReadOutbox',
        'apods:PostOutbox',
        'apods:CreateCollection'
      ],
      optional: []
    },
    queueServiceUrl: CONFIG.QUEUE_SERVICE_URL
  }
};
