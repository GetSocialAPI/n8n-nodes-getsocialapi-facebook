import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IHttpRequestOptions } from 'n8n-workflow';
import { ApplicationError, NodeApiError, NodeOperationError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = "https://api.getsocialapi.com/fb";
const OPERATIONS: Record<string, { path: string; fields: string[] }> = {
  "resolve": {
    "path": "/resolve",
    "fields": [
      "url"
    ]
  },
  "resolveProfile": {
    "path": "/resolve/profile",
    "fields": [
      "url"
    ]
  },
  "overview": {
    "path": "/overview",
    "fields": [
      "groupId"
    ]
  },
  "members": {
    "path": "/api/v1/members",
    "fields": [
      "groupId",
      "after"
    ]
  },
  "groupPosts": {
    "path": "/api/v1/group_posts",
    "fields": [
      "groupId",
      "after"
    ]
  },
  "contacts": {
    "path": "/api/v1/contacts",
    "fields": [
      "userId"
    ]
  },
  "posts": {
    "path": "/api/v1/posts",
    "fields": [
      "userId",
      "after"
    ]
  },
  "feed": {
    "path": "/api/v1/feed",
    "fields": [
      "feedType",
      "feedId",
      "perPage",
      "after"
    ]
  },
  "followers": {
    "path": "/api/v1/followers",
    "fields": [
      "userId",
      "after"
    ]
  },
  "followings": {
    "path": "/api/v1/followings",
    "fields": [
      "userId",
      "after"
    ]
  },
  "friends": {
    "path": "/api/v1/friends",
    "fields": [
      "userId",
      "after"
    ]
  }
};
const QUERY_NAMES: Record<string, string> = { groupId: 'group_id', userId: 'user_id', maxId: 'max_id', minId: 'min_id', sortOrder: 'sort_order', perPage: 'per_page' };

function formatPathValue(name: string, value: string): string {
 const v = value.trim();
 if (!v) throw new ApplicationError(name + ' is required');
 if (['userId','groupId','locationId'].includes(name) && !/^\d{1,20}$/.test(v)) throw new ApplicationError(name + ' must be a numeric ID');
 if (name === 'mediaId' && !/^(?:\d{1,20}|[A-Za-z0-9_-]{5,64})$/.test(v)) throw new ApplicationError('Invalid media ID or shortcode');
 return encodeURIComponent(name === 'tag' ? v.replace(/^#+/,'') : name === 'highlightId' ? v.replace(/^highlight:/,'') : v);
}

type ListPage = { records: IDataObject[]; cursor?: string };

const LIST_OPERATIONS = new Set(["members", "groupPosts", "posts", "feed", "followers", "followings", "friends"]);
const PAGINATED_OPERATIONS = LIST_OPERATIONS;
const LEGACY_LIST_FIELDS = new Set(["after", "feedType", "perPage"]);

type ListConnection = { edges?: Array<{ node?: IDataObject }>; page_info?: {
 has_next_page?: boolean; end_cursor?: string;
} };

function getListPage(response: IDataObject, operation: string, groupFeed: boolean): ListPage {
 const data = response.data as {
  group?: { group_member_profiles?: ListConnection };
  fetch__Group?: { group_member_profiles?: ListConnection };
  group_address?: { group_feed?: ListConnection };
  profile?: { timeline_feed_units?: ListConnection };
  full_profile_list?: { list_items?: ListConnection };
 } | undefined;
 const isFeed = operation === 'groupPosts' || operation === 'posts' || operation === 'feed';
 let connection: ListConnection | undefined;
 if (operation === 'members') {
  connection = data?.group?.group_member_profiles ?? data?.fetch__Group?.group_member_profiles;
 } else if (isFeed) {
  connection = operation === 'groupPosts' || (operation === 'feed' && groupFeed)
   ? data?.group_address?.group_feed : data?.profile?.timeline_feed_units;
 } else {
  connection = data?.full_profile_list?.list_items;
 }
 if (!Array.isArray(connection?.edges)) {
  if (response.errors || !data) throw new ApplicationError('Unexpected Facebook list response');
  return { records: [] };
 }
 const records = connection.edges.flatMap(({ node }) =>
  node && (!isFeed || !node.__typename || node.__typename === 'Story') ? [node] : [],
 );
 return {
  records,
  cursor: connection.page_info?.has_next_page === true ? connection.page_info.end_cursor : undefined,
 };
}

export class GetSocialApiFacebook implements INodeType {
 description: INodeTypeDescription = {
 displayName: 'GetSocialAPI Facebook', name: 'getSocialApiFacebook',
 icon: { light: 'file:getsocialapi.svg', dark: 'file:getsocialapi-dark.svg' }, usableAsTool: true, group: ['transform'], version: [1, 2], defaultVersion: 2,
 description: 'Retrieve Facebook data using GetSocialAPI',
 subtitle: '={{$parameter["resource"] + " / " + $parameter["operation"]}}',
 defaults: {name:'GetSocialAPI Facebook'},
 inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
 credentials: [{name:'getSocialApiFacebookApi',required:true}],
 properties: [
  {
    "displayName": "Resource",
    "name": "resource",
    "type": "options",
    "noDataExpression": true,
    "options": [
      {
        "name": "Group",
        "value": "group"
      },
      {
        "name": "Profile",
        "value": "profile"
      },
      {
        "name": "Connections",
        "value": "connections"
      },
      {
        "name": "Feed",
        "value": "feed"
      }
    ],
    "default": "group"
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "resolve",
    "options": [
      {
        "name": "Resolve Group URL",
        "value": "resolve",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Resolve Group URL"
      },
      {
        "name": "Get Group Overview",
        "value": "overview",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Group Overview"
      },
      {
        "name": "Get Group Members",
        "value": "members",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Group Members"
      },
      {
        "name": "Get Group Posts",
        "value": "groupPosts",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Group Posts"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "group"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "resolveProfile",
    "options": [
      {
        "name": "Resolve Profile URL",
        "value": "resolveProfile",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Resolve Profile URL"
      },
      {
        "name": "Get Profile Contacts",
        "value": "contacts",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Profile Contacts"
      },
      {
        "name": "Get Profile Posts",
        "value": "posts",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Profile Posts"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "followers",
    "options": [
      {
        "name": "Get Followers",
        "value": "followers",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Followers"
      },
      {
        "name": "Get Following",
        "value": "followings",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Following"
      },
      {
        "name": "Get Friends",
        "value": "friends",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Friends"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "feed",
    "options": [
      {
        "name": "Get Feed",
        "value": "feed",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Feed"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "feed"
        ]
      }
    }
  },
  {
    "displayName": "URL",
    "name": "url",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "resolve"
        ],
        "resource": [
          "group"
        ]
      }
    }
  },
  {
    "displayName": "URL",
    "name": "url",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "resolveProfile"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "Group ID",
    "name": "groupId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "overview"
        ],
        "resource": [
          "group"
        ]
      }
    }
  },
  {
    "displayName": "Group ID",
    "name": "groupId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "members"
        ],
        "resource": [
          "group"
        ]
      }
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "members"
        ],
        "resource": [
          "group"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Group ID",
    "name": "groupId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "groupPosts"
        ],
        "resource": [
          "group"
        ]
      }
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "groupPosts"
        ],
        "resource": [
          "group"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "contacts"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "posts"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "posts"
        ],
        "resource": [
          "profile"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Feed Type",
    "name": "feedType",
    "type": "options",
    "default": "user",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "feed"
        ],
        "resource": [
          "feed"
        ],
        "@version": [
          1
        ]
      }
    },
    "options": [
      {
        "name": "User",
        "value": "user"
      },
      {
        "name": "Group",
        "value": "group"
      }
    ]
  },
  {
    "displayName": "Feed ID",
    "name": "feedId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "feed"
        ],
        "resource": [
          "feed"
        ]
      }
    }
  },
  {
    "displayName": "Per Page",
    "name": "perPage",
    "type": "number",
    "default": 10,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "feed"
        ],
        "resource": [
          "feed"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 3,
      "maxValue": 20
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "feed"
        ],
        "resource": [
          "feed"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "followers"
        ],
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "followers"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "followings"
        ],
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "followings"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "friends"
        ],
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "After (Cursor)",
    "name": "after",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "friends"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Return All",
    "name": "returnAll",
    "type": "boolean",
    "default": false,
    "description": "Whether to return all results or only up to a given limit",
    "displayOptions": {
      "show": {
        "operation": [
          "members",
          "groupPosts",
          "posts",
          "feed",
          "followers",
          "followings",
          "friends"
        ],
        "@version": [
          2
        ]
      }
    }
  },
  {
    "displayName": "Limit",
    "name": "limit",
    "type": "number",
    "default": 50,
    "description": "Max number of results to return",
    "typeOptions": {
      "minValue": 1
    },
    "displayOptions": {
      "show": {
        "operation": [
          "members",
          "groupPosts",
          "posts",
          "feed",
          "followers",
          "followings",
          "friends"
        ],
        "returnAll": [
          false
        ],
        "@version": [
          2
        ]
      }
    }
  },
  {
    "displayName": "Additional Fields",
    "name": "additionalFields",
    "type": "collection",
    "placeholder": "Add Field",
    "default": {},
    "options": [
      {
        "displayName": "Feed Type",
        "name": "feedType",
        "type": "options",
        "default": "user",
        "options": [
          {
            "name": "User",
            "value": "user"
          },
          {
            "name": "Group",
            "value": "group"
          }
        ]
      },
      {
        "displayName": "Per Page",
        "name": "perPage",
        "type": "number",
        "default": 10,
        "typeOptions": {
          "minValue": 3,
          "maxValue": 20
        }
      }
    ],
    "displayOptions": {
      "show": {
        "operation": [
          "feed"
        ],
        "@version": [
          2
        ]
      }
    }
  }
]
 };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const output: INodeExecutionData[] = [];
  const legacy = this.getNode().typeVersion === 1;
  for (let i = 0; i < items.length; i++) {
   try {
    const operation = this.getNodeParameter('operation', i) as string;
    const cfg = OPERATIONS[operation];
    if (!cfg || !Object.prototype.hasOwnProperty.call(OPERATIONS, operation)) {
     throw new NodeOperationError(this.getNode(), 'Unsupported operation', { itemIndex: i });
    }
    const path = cfg.path.replace(/\{(\w+)\}/g, (_match, name: string) =>
     formatPathValue(name, String(this.getNodeParameter(name, i))),
    );
    const qs: Record<string, string | number> = {};
    const fields = legacy ? cfg.fields : cfg.fields.filter(field => !LEGACY_LIST_FIELDS.has(field));
    for (const field of fields) {
     const value = this.getNodeParameter(field, i, '') as string | number;
     if (value === '' || value === null || value === undefined || value === 0) continue;
     if (field === 'feedType' || field === 'feedId') continue;
     qs[QUERY_NAMES[field] ?? field] = value;
    }
    const additional = legacy ? {} : this.getNodeParameter('additionalFields', i, {}) as IDataObject;
    let groupFeed = false;
    if (operation === 'feed') {
     const type = legacy ? this.getNodeParameter('feedType', i) : additional.feedType;
     const id = String(this.getNodeParameter('feedId', i)).trim();
     if (!/^\d{1,20}$/.test(id)) {
      throw new NodeOperationError(this.getNode(), 'Feed ID must be numeric', { itemIndex: i });
     }
     groupFeed = type === 'group';
     qs[groupFeed ? 'group_id' : 'user_id'] = id;
     if (!legacy && additional.perPage !== undefined) qs.per_page = additional.perPage as number;
    }
    const isList = !legacy && LIST_OPERATIONS.has(operation);
    const returnAll = isList && this.getNodeParameter('returnAll', i, false) === true;
    const limit = isList && !returnAll ? Number(this.getNodeParameter('limit', i, 50)) : Infinity;
    if (!returnAll && isList && (!Number.isSafeInteger(limit) || limit < 1)) {
     throw new NodeOperationError(this.getNode(), 'Limit must be a positive integer', { itemIndex: i });
    }

    const records: IDataObject[] = [];
    const seenCursors = new Set<string>();
    const seenIds = new Set<string>();
    while (true) {
     const request: IHttpRequestOptions = { method: 'GET', url: BASE_URL + path, qs, json: true, timeout: 30000 };
     const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this, 'getSocialApiFacebookApi', request);
     const json = response && typeof response === 'object' && !Array.isArray(response)
      ? response as IDataObject : { data: response } as IDataObject;
     if (!isList) {
      records.push(json);
      break;
     }

     const page = getListPage(json, operation, groupFeed);
     for (const record of page.records) {
      const id = record.cache_id ?? record.id;
      if (typeof id === 'string' || typeof id === 'number') {
       if (seenIds.has(String(id))) continue;
       seenIds.add(String(id));
      }
      records.push(record);
      if (records.length >= limit) break;
     }
     const cursor = page.cursor;
     if (records.length >= limit || !PAGINATED_OPERATIONS.has(operation) || !cursor || seenCursors.has(cursor)) break;
     seenCursors.add(cursor);
     qs['after'] = cursor;
    }
    for (const json of records) output.push({ json, pairedItem: { item: i } });
   } catch (error) {
    if (this.continueOnFail()) {
     output.push({ json: { error: error instanceof Error ? error.message : String(error) }, pairedItem: { item: i } });
     continue;
    }
    if (error instanceof NodeOperationError) {
     throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
    }
    throw new NodeApiError(this.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex: i });
   }
  }
  return [output];
 }
}
