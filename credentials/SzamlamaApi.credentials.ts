import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class SzamlamaApi implements ICredentialType {
	name = 'szamlamaApi';

	displayName = 'Számláma API';

	icon: Icon = {
		light: 'file:../nodes/Szamlama/szamlama.svg',
		dark: 'file:../nodes/Szamlama/szamlama.svg',
	};

	documentationUrl = 'https://github.com/gelenfarkas/n8n-nodes-szamlama#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create a key in Számláma under Settings → API keys (https://app.szamlama.hu/api-kulcsok). Each key belongs to one company. A test key (szlatest_…) only creates test documents.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				Accept: 'application/json',
				'X-Szamlama-Lang': 'en',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.szamlama.hu/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
