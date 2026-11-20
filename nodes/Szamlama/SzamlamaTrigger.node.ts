import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { szamlamaApiRequest } from './GenericFunctions';

export class SzamlamaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Számláma Trigger',
		name: 'szamlamaTrigger',
		icon: { light: 'file:szamlama.svg', dark: 'file:szamlama.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description:
			'Starts the workflow when a Számláma document is issued, paid or cancelled, or when its tax authority (NAV) status changes',
		defaults: {
			name: 'Számláma Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'szamlamaApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['invoice.issued'],
				options: [
					{
						name: 'Document Cancelled (Storno)',
						value: 'invoice.storno',
					},
					{
						name: 'Document Issued',
						value: 'invoice.issued',
					},
					{
						name: 'Document Paid',
						value: 'invoice.paid',
					},
					{
						name: 'Tax Authority (NAV) Status Changed',
						value: 'nav.status_changed',
					},
				],
				description:
					'With a test API key the webhook receives the events of test documents only. Számláma only delivers to HTTPS addresses, so the n8n webhook URL has to be public.',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (!data.webhookId) return false;
				const list = await szamlamaApiRequest.call(this, 'GET', '/webhooks');
				const url = this.getNodeWebhookUrl('default');
				const found = ((list.webhooks as IDataObject[]) ?? []).some(
					(hook) => hook.id === data.webhookId && hook.url === url,
				);
				if (!found) {
					delete data.webhookId;
					delete data.webhookSecret;
				}
				return found;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const created = await szamlamaApiRequest.call(this, 'POST', '/webhooks', {
					url: this.getNodeWebhookUrl('default'),
					events: this.getNodeParameter('events') as string[],
					description: 'n8n',
				});
				const data = this.getWorkflowStaticData('node');
				data.webhookId = created.id as number;
				data.webhookSecret = created.secret as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.webhookId) {
					try {
						await szamlamaApiRequest.call(this, 'DELETE', `/webhooks/${data.webhookId}`);
					} catch (error) {
						this.logger.warn(
							`Számláma webhook ${String(data.webhookId)} could not be deleted: ${(error as Error).message}`,
						);
						return false;
					}
					delete data.webhookId;
					delete data.webhookSecret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').webhookSecret;

		// Számláma signs the raw body: X-Szamlama-Signature: sha256=<HMAC-SHA256 with the endpoint secret>.
		if (typeof secret === 'string' && secret !== '' && req.rawBody) {
			const expected = `sha256=${createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
			const received = String(req.headers['x-szamlama-signature'] ?? '');
			const valid =
				received.length === expected.length &&
				timingSafeEqual(Buffer.from(received), Buffer.from(expected));
			if (!valid) {
				const res = this.getResponseObject();
				res.status(401).json({ message: 'Invalid signature' });
				return { noWebhookResponse: true };
			}
		}

		const body = this.getBodyData();
		// The endpoint test ("ping") is not a document event.
		if (body.event === 'ping') {
			return { webhookResponse: { received: true } };
		}

		const { data, ...meta } = body;
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					...meta,
					...((typeof data === 'object' && data !== null ? data : {}) as IDataObject),
				}),
			],
		};
	}
}
