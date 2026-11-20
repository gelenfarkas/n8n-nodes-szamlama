import type { INodeProperties } from 'n8n-workflow';
import { CUSTOMER_TYPES } from './DocumentDescription';

const show = (operation: string[]) => ({ show: { resource: ['partner'], operation } });

export const partnerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['partner'] } },
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a partner',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Search partners by name, tax number or email',
				action: 'Get many partners',
			},
			{
				name: 'Look Up by Tax Number',
				value: 'lookup',
				description:
					'Get the official name and address of a Hungarian company from the tax authority (NAV)',
				action: 'Look up a company by tax number',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the given fields of a partner',
				action: 'Update a partner',
			},
		],
		default: 'upsert',
	},
];

const addressFields: INodeProperties[] = [
	{ displayName: 'City', name: 'city', type: 'string', default: '' },
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		description: 'Country name or ISO code. Defaults to Hungary.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Up to 3 addresses, separated by commas',
	},
	{
		displayName: 'EU VAT Number',
		name: 'euTaxNumber',
		type: 'string',
		default: '',
		placeholder: 'e.g. DE123456789',
	},
	{
		displayName: 'Is Supplier',
		name: 'isSupplier',
		type: 'boolean',
		default: true,
		description: 'Whether the partner is a supplier',
	},
	{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
	{ displayName: 'Postal Code', name: 'postCode', type: 'string', default: '' },
	{ displayName: 'Street Address', name: 'address', type: 'string', default: '' },
	{
		displayName: 'Tax Number',
		name: 'taxNumber',
		type: 'string',
		default: '',
		placeholder: 'e.g. 12345678-1-23',
		description: 'Hungarian tax number',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: CUSTOMER_TYPES,
		default: 'domestic',
		description: 'Choose "Private Person" for consumers',
	},
];

export const partnerFields: INodeProperties[] = [
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['upsert']),
		options: [
			...addressFields.slice(0, 4),
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'Your own ID for this partner, used for matching',
			},
			...addressFields.slice(4),
		],
	},

	// ------------------------------------------------------------ update
	{
		displayName: 'Partner ID',
		name: 'partnerId',
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
			...addressFields.slice(0, 4),
			{
				displayName: 'Is Customer',
				name: 'isCustomer',
				type: 'boolean',
				default: true,
				description: 'Whether the partner is a customer',
			},
			addressFields[4],
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			...addressFields.slice(5),
		],
	},

	// ------------------------------------------------------------ lookup
	{
		displayName: 'Tax Number',
		name: 'taxNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 12345678',
		displayOptions: show(['lookup']),
		description: 'The first 8 digits are enough',
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
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: show(['getAll']),
		description: 'Part of the name, the tax number or the email address',
	},
];
