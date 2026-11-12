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

1. [Create a GetSocialAPI account](https://getsocialapi.com/dashboard/signup/) and copy your API key from the [dashboard](https://getsocialapi.com/dashboard/). The trial includes 100 API calls with no credit card required.
2. In n8n, install this community package and create **GetSocialAPI Facebook API** credentials.
3. Select an operation. No Facebook profile login or cookies are needed.

The API key is sent as `X-API-Key`. Single-object operations return the API response. List operations return one n8n item per record. Use **Return All** to retrieve all available records, or disable it and set **Limit**. The node follows API cursors internally. Some endpoints only expose one page. Existing workflows using node version 1 retain their original response format and parameters.

See https://getsocialapi.com/docs for full API details.

## Billing and pagination

The n8n node is free to install. API calls use the quota of the GetSocialAPI account that owns the key. GetSocialAPI counts requests that return HTTP `200` or `404`. See the [GetSocialAPI pricing plans](https://getsocialapi.com/#pricing) and [rate limits](https://getsocialapi.com/docs/rate-limits/).

Each page fetched is a separate API request. For example, if **Return All** fetches 10 pages that each return `200`, one node execution uses 10 GetSocialAPI requests. To cap the number of records returned, turn off **Return All** and set **Limit**. The node may still fetch multiple pages to reach that limit.

## Usage example

### Resolve a Facebook group URL

1. Add the **GetSocialAPI Facebook** node and select your API credentials.
2. Set **Resource** to **Group** and **Operation** to **Resolve Group URL**.
3. Enter `https://www.facebook.com/groups/freegarden/` as **URL**, then execute the node.

Example output (abbreviated):

```json
{
  "group_id": "800246542990860"
}
```

Use that ID in **Get Group Members**. Turn off **Return All** and set **Limit** to 5 to retrieve up to five members.

## Development

```sh
npm install
npm run lint
npm run build
npm run dev
```

## Release

See [PUBLISHING.md](PUBLISHING.md).

## License

MIT
