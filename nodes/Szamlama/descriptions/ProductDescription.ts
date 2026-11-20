import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ show: { resource: ['product'], operation } });

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a product',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Search products and services by name or SKU',
				action: 'Get many products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the given fields of a product or service',
				action: 'Update a product',
			},
		],
		default: 'upsert',
	},
];

const VAT_RATES = [
	{ name: '0%', value: '0' },
	{ name: '5%', value: '5' },
	{ name: '18%', value: '18' },
	{ name: '27%', value: '27' },
];

const commonFields: INodeProperties[] = [
	{
		displayName: 'Active',
		name: 'active',
		type: 'boolean',
		default: true,
		description: 'Whether the product can be chosen on new documents',
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		placeholder: 'e.g. EUR',
		description: 'ISO code. Defaults to HUF.',
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
	},
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		default: '',
		description: 'Products are matched by SKU, so no duplicate is created',
	},
	{
		displayName: 'Unit',
		name: 'unit',
		type: 'string',
		default: '',
		placeholder: 'e.g. db',
		description: 'Defaults to "db" (piece)',
	},
	{
		displayName: 'VAT Rate',
		name: 'vatRate',
		type: 'options',
		options: VAT_RATES,
		default: '27',
	},
];

export const productFields: INodeProperties[] = [
	// ------------------------------------------------------------ upsert
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['upsert']),
	},
	{
		displayName: 'Net Unit Price',
		name: 'netPrice',
		type: 'number',
		typeOptions: { numberPrecision: 4 },
		required: true,
		default: 0,
		displayOptions: show(['upsert']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['upsert']),
		options: commonFields,
	},

	// ------------------------------------------------------------ update
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: show(['update']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			...commonFields.slice(0, 2),
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Net Unit Price',
				name: 'netPrice',
				type: 'number',
				typeOptions: { numberPrecision: 4 },
				default: 0,
			},
			...commonFields.slice(2),
		],
	},

	// ------------------------------------------------------------ get many
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: show(['getAll']),
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Part of the name or the SKU',
			},
			{
				displayName: 'State',
				name: 'active',
				type: 'options',
				options: [
					{ name: 'Active', value: '1' },
					{ name: 'Inactive', value: '0' },
				],
				default: '1',
			},
		],
	},
];
