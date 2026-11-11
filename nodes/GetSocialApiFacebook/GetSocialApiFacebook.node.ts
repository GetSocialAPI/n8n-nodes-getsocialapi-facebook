import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IHttpRequestOptions } from 'n8n-workflow';
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

export class GetSocialApiFacebook implements INodeType {
 description: INodeTypeDescription = {
 displayName: 'GetSocialAPI Facebook', name: 'getSocialApiFacebook',
 icon: 'file:getsocialapi.svg', usableAsTool: true, group: ['transform'], version: 1,
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
        ]
      }
    }
  }
]
 };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const output: INodeExecutionData[] = [];
  for(let i=0;i<items.length;i++){
   try {
    const operation = this.getNodeParameter('operation',i) as string;
    const cfg = OPERATIONS[operation];
    if(!cfg) throw new NodeOperationError(this.getNode(),'Unsupported operation',{itemIndex:i});
    const path = cfg.path.replace(/\{(\w+)\}/g, (_m,name:string) => formatPathValue(name,String(this.getNodeParameter(name,i))));
    const qs: Record<string,string|number> = {};
    for(const field of cfg.fields){
     const value = this.getNodeParameter(field,i,'') as string | number;
     if(value === '' || value === null || value === undefined || value === 0) continue;
     if(field === 'feedType' || field === 'feedId') continue;
     qs[QUERY_NAMES[field] ?? field] = value;
    }
    if(operation === 'feed'){
     const type = this.getNodeParameter('feedType',i) as string;
     const id = String(this.getNodeParameter('feedId',i));
     if(!/^\d{1,20}$/.test(id)) throw new NodeOperationError(this.getNode(),'Feed ID must be numeric',{itemIndex:i});
     qs[type === 'group'?'group_id':'user_id'] = id;
    }
    const request: IHttpRequestOptions = {method:'GET',url:BASE_URL+path,qs,json:true,timeout:30000};
    const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this,'getSocialApiFacebookApi',request);
    const json = response && typeof response === 'object' && !Array.isArray(response) ? response as INodeExecutionData['json'] : {data:response} as INodeExecutionData['json'];
    output.push({json,pairedItem:{item:i}});
   } catch(error){
    if(this.continueOnFail()){output.push({json:{error:error instanceof Error?error.message:String(error)},pairedItem:{item:i}});continue;}
    if(error instanceof NodeOperationError) throw new NodeOperationError(this.getNode(),error.message,{itemIndex:i});
    throw new NodeApiError(this.getNode(),{message: error instanceof Error ? error.message : String(error)},{itemIndex:i});
   }
  }
  return [output];
 }
}
