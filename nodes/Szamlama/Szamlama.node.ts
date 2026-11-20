import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { documentFields, documentOperations } from './descriptions/DocumentDescription';
import { partnerFields, partnerOperations } from './descriptions/PartnerDescription';
import { productFields, productOperations } from './descriptions/ProductDescription';
import {
	snakeKeys,
	szamlamaApiDownload,
	szamlamaApiRequest,
	toDay,
	withoutEmpty,
} from './GenericFunctions';

/** The lines of a document, from the "Define Below" form or from a JSON array. */
function readLines(context: IExecuteFunctions, i: number): IDataObject[] {
	if (context.getNodeParameter('itemsInput', i) === 'json') {
		let raw = context.getNodeParameter('itemsJson', i) as unknown;
		if (typeof raw === 'string') {
			try {
				raw = JSON.parse(raw);
			} catch {
				throw new NodeOperationError(context.getNode(), 'Items (JSON) is not valid JSON', {
					itemIndex: i,
				});
			}
		}
		if (!Array.isArray(raw) || raw.length === 0) {
			throw new NodeOperationError(
				context.getNode(),
				'Items (JSON) must be an array with at least one line',
				{ itemIndex: i },
			);
		}
		return raw as IDataObject[];
	}

	const lines = (context.getNodeParameter('items.line', i, []) as IDataObject[]) ?? [];
	if (lines.length === 0) {
		throw new NodeOperationError(context.getNode(), 'Add at least one item to the document', {
			itemIndex: i,
		});
	}
	return lines.map((line) => {
		const out: IDataObject = withoutEmpty({
			name: line.name,
			quantity: line.quantity,
			vat_rate: line.vatRate,
			unit: line.unit,
			sku: line.sku,
			note: line.note,
		});
		out[line.priceType === 'gross' ? 'gross_unit_price' : 'net_unit_price'] = line.unitPrice;
		if (line.discountMode && line.discountMode !== 'none') {
			out.discount = { mode: line.discountMode, value: line.discountValue };
		}
		return out;
	});
}

export class Szamlama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Számláma',
		name: 'szamlama',
		icon: { light: 'file:szamlama.svg', dark: 'file:szamlama.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Issue Hungarian invoices and other documents with Számláma, and manage partners and products',
		defaults: {
			name: 'Számláma',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'szamlamaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Document', value: 'document' },
					{ name: 'Partner', value: 'partner' },
					{ name: 'Product', value: 'product' },
				],
				default: 'document',
			},
			...documentOperations,
			...documentFields,
			...partnerOperations,
			...partnerFields,
			...productOperations,
			...productFields,
		],
	};

	methods = {
		loadOptions: {
			async getVatRates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await szamlamaApiRequest.call(this, 'GET', '/invoice-options');
				return ((data.vat_rates as IDataObject[]) ?? []).map((rate) => ({
					name: String(rate.label),
					value: String(rate.key),
				}));
			},
			async getPaymentMethods(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await szamlamaApiRequest.call(this, 'GET', '/invoice-options');
				return ((data.payment_methods as IDataObject[]) ?? []).map((method) => ({
					name: `${String(method.label)} (${String(method.key)})`,
					value: String(method.key),
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				let result: IDataObject | IDataObject[] = {};

				if (resource === 'document') {
					if (operation === 'create') {
						const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						const customer = withoutEmpty(
							snakeKeys(this.getNodeParameter('customer', i, {}) as IDataObject),
						);
						const body: IDataObject = withoutEmpty({
							doc_type: this.getNodeParameter('docType', i),
							external_id: this.getNodeParameter('externalId', i, ''),
							...snakeKeys(additional),
							fulfillment_date: toDay(additional.fulfillmentDate),
							due_date: toDay(additional.dueDate),
							paid_on: toDay(additional.paidOn),
						});
						for (const key of ['company_bank_account_id', 'document_block_id']) {
							if (body[key] === 0) delete body[key];
						}
						if (Object.keys(customer).length) body.customer = customer;
						body.items = readLines(this, i);
						result = await szamlamaApiRequest.call(this, 'POST', '/invoices', body, undefined, i);
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i, false);
						const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i, 50) as number);
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const qs: IDataObject = withoutEmpty({
							...snakeKeys(filters),
							from: toDay(filters.from),
							to: toDay(filters.to),
							per_page: Math.min(limit, 100),
						});
						if (qs.partner_id === 0) delete qs.partner_id;
						const found: IDataObject[] = [];
						let page = 1;
						let lastPage = 1;
						do {
							const data = await szamlamaApiRequest.call(
								this,
								'GET',
								'/invoices',
								undefined,
								{ ...qs, page },
								i,
							);
							found.push(...((data.invoices as IDataObject[]) ?? []));
							lastPage = Number((data.meta as IDataObject | undefined)?.last_page ?? 1);
							page++;
						} while (page <= lastPage && found.length < limit);
						result = found.slice(0, limit);
					} else {
						const id = this.getNodeParameter('documentId', i) as number;
						if (operation === 'get') {
							result = await szamlamaApiRequest.call(
								this,
								'GET',
								`/invoices/${id}`,
								undefined,
								undefined,
								i,
							);
						} else if (operation === 'downloadPdf') {
							const field = this.getNodeParameter('binaryPropertyName', i) as string;
							const buffer = await szamlamaApiDownload.call(this, `/invoices/${id}/pdf`, i);
							const binary = await this.helpers.prepareBinaryData(
								buffer,
								`document-${id}.pdf`,
								'application/pdf',
							);
							returnData.push({
								json: { id },
								binary: { [field]: binary },
								pairedItem: { item: i },
							});
							continue;
						} else if (operation === 'send') {
							const body = withoutEmpty({ email: this.getNodeParameter('email', i, '') });
							result = await szamlamaApiRequest.call(
								this,
								'POST',
								`/invoices/${id}/send`,
								body,
								undefined,
								i,
							);
						} else if (operation === 'markPaid') {
							const body = withoutEmpty({ paid_on: toDay(this.getNodeParameter('paidOn', i, '')) });
							result = await szamlamaApiRequest.call(
								this,
								'POST',
								`/invoices/${id}/paid`,
								body,
								undefined,
								i,
							);
						} else if (operation === 'cancel') {
							result = await szamlamaApiRequest.call(
								this,
								'POST',
								`/invoices/${id}/storno`,
								{},
								undefined,
								i,
							);
						}
					}
				} else if (resource === 'partner') {
					if (operation === 'upsert') {
						const body = withoutEmpty({
							name: this.getNodeParameter('name', i),
							...snakeKeys(this.getNodeParameter('additionalFields', i, {}) as IDataObject),
						});
						result = await szamlamaApiRequest.call(this, 'POST', '/partners', body, undefined, i);
					} else if (operation === 'update') {
						const id = this.getNodeParameter('partnerId', i) as number;
						const body = snakeKeys(this.getNodeParameter('updateFields', i, {}) as IDataObject);
						result = await szamlamaApiRequest.call(
							this,
							'PATCH',
							`/partners/${id}`,
							body,
							undefined,
							i,
						);
					} else if (operation === 'lookup') {
						const qs = { tax_number: this.getNodeParameter('taxNumber', i) };
						result = await szamlamaApiRequest.call(
							this,
							'GET',
							'/partners/lookup',
							undefined,
							qs,
							i,
						);
					} else if (operation === 'getAll') {
						const qs = withoutEmpty({
							search: this.getNodeParameter('search', i, ''),
							limit: this.getNodeParameter('limit', i, 50),
						});
						const data = await szamlamaApiRequest.call(this, 'GET', '/partners', undefined, qs, i);
						result = (data.partners as IDataObject[]) ?? [];
					}
				} else if (resource === 'product') {
					if (operation === 'upsert') {
						const body = withoutEmpty({
							name: this.getNodeParameter('name', i),
							net_price: this.getNodeParameter('netPrice', i),
							...snakeKeys(this.getNodeParameter('additionalFields', i, {}) as IDataObject),
						});
						result = await szamlamaApiRequest.call(this, 'POST', '/products', body, undefined, i);
					} else if (operation === 'update') {
						const id = this.getNodeParameter('productId', i) as number;
						const body = snakeKeys(this.getNodeParameter('updateFields', i, {}) as IDataObject);
						result = await szamlamaApiRequest.call(
							this,
							'PATCH',
							`/products/${id}`,
							body,
							undefined,
							i,
						);
					} else if (operation === 'getAll') {
						const qs = withoutEmpty({
							...(this.getNodeParameter('filters', i, {}) as IDataObject),
							limit: this.getNodeParameter('limit', i, 50),
						});
						const data = await szamlamaApiRequest.call(this, 'GET', '/products', undefined, qs, i);
						result = (data.products as IDataObject[]) ?? [];
					}
				}

				const rows = Array.isArray(result) ? result : [result];
				for (const json of rows) returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				const known = error as NodeApiError;
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message: known.message,
					description: known.description ?? undefined,
					httpCode: known.httpCode ?? undefined,
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
