# App Builder

Create and modify ActivityPods applications as a group, by chatting.

## Development

```bash
make start                    # Local Pod provider (http://localhost:5000)
cd backend && yarn && yarn dev
cd frontend && yarn && yarn dev  # http://localhost:4001
```

The Pod provider and the app fetch their shapes from `SHAPE_REPOSITORY_URL`.
