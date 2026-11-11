import type { IAuthenticateGeneric, ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';
export class GetSocialApiFacebookApi implements ICredentialType {
 name='getSocialApiFacebookApi';
 icon='file:../nodes/GetSocialApiFacebook/getsocialapi.svg' as const;
 test: ICredentialTestRequest={request:{baseURL:'https://api.getsocialapi.com/fb/resolve?url=https%3A%2F%2Fwww.facebook.com%2Fgroups%2Ffreegarden%2F'}};
 displayName='GetSocialAPI Facebook API';
 documentationUrl='https://getsocialapi.com/docs';
 properties: INodeProperties[]=[{displayName:'API Key',name:'apiKey',type:'string',typeOptions:{password:true},default:'',required:true}];
 authenticate: IAuthenticateGeneric={type:'generic',properties:{headers:{'X-API-Key':'={{$credentials.apiKey}}'}}};
}
