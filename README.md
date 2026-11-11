# n8n-nodes-getsocialapi-facebook

Community node connecting [n8n](https://n8n.io/) to [GetSocialAPI](https://getsocialapi.com/) Facebook REST API.

## Supported operations (11)

- **Resolve Group URL** (`resolve`): `GET /resolve`
- **Resolve Profile URL** (`resolveProfile`): `GET /resolve/profile`
- **Get Group Overview** (`overview`): `GET /overview`
- **Get Group Members** (`members`): `GET /api/v1/members`
- **Get Group Posts** (`groupPosts`): `GET /api/v1/group_posts`
- **Get Profile Contacts** (`contacts`): `GET /api/v1/contacts`
- **Get Profile Posts** (`posts`): `GET /api/v1/posts`
- **Get Feed** (`feed`): `GET /api/v1/feed`
- **Get Followers** (`followers`): `GET /api/v1/followers`
- **Get Following** (`followings`): `GET /api/v1/followings`
- **Get Friends** (`friends`): `GET /api/v1/friends`

## Setup

1. Get your API key from https://getsocialapi.com/dashboard/
2. In n8n, install this community package and create **GetSocialAPI Facebook API** credentials.
3. Select an operation. No Facebook profile login or cookies are needed.

API key is sent as `X-API-Key`. Operations return raw JSON responses. Cursor fields are available for manual pagination; automatic multi-page iteration is not yet provided.

See https://getsocialapi.com/docs for full API details.

## Development

```sh
npm install
npm run lint
npm run build
npm run dev
```

## Release

See PUBLISHING.md. Do not publish until CI and real API tests pass.

## License

MIT
