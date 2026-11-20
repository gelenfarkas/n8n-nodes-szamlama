import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ show: { resource: ['document'], operation } });

const DOC_TYPES = [
	{ name: 'Advance Invoice', value: 'advance' },
	{ name: 'Delivery Note', value: 'delivery_note' },
	{ name: 'Final Invoice', value: 'final' },
	{ name: 'Invoice', value: 'invoice' },
	{ name: 'Pro Forma Invoice (Payment Request)', value: 'proforma' },
	{ name: 'Receipt', value: 'receipt' },
];

export const CUSTOMER_TYPES = [
	{ name: 'Company Outside the EU', value: 'non_eu' },
	{ name: 'EU Company', value: 'eu' },
	{ name: 'Hungarian Company', value: 'domestic' },
	{ name: 'Private Person', value: 'private' },
	{ name: 'Private Person with a Tax Number', value: 'private_taxed' },
];

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['document'] } },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel an issued document by issuing a cancellation (storno) document',
				action: 'Cancel a document',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Issue an invoice, a pro forma invoice, a receipt or another document',
				action: 'Create a document',
			},
			{
				name: 'Download PDF',
				value: 'downloadPdf',
				description: 'Download the PDF file of a document',
				action: 'Download a document PDF',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a document by its ID',
				action: 'Get a document',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Search documents by number, customer, date, type or payment state',
				action: 'Get many documents',
			},
			{
				name: 'Mark as Paid',
				value: 'markPaid',
				description: 'Mark an issued invoice or advance invoice as paid',
				action: 'Mark a document as paid',
			},
			{
				name: 'Send by Email',
				value: 'send',
				description: 'Send an issued document to the customer by email',
				action: 'Send a document by email',
			},
		],
		default: 'create',
	},
];

export const documentFields: INodeProperties[] = [
	// ------------------------------------------------------------ shared: document ID
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: show(['cancel', 'downloadPdf', 'get', 'markPaid', 'send']),
		description: 'The ID of the document, for example from the Create or the Get Many operation',
	},

	// ------------------------------------------------------------ create
	{
		displayName:
			'With a test API key (or in a test company) a test document is created: it is not reported to the tax authority (NAV) and is never sent to customers. A live invoice cannot be edited or deleted after it is issued, only cancelled.',
		name: 'createNotice',
		type: 'notice',
		default: '',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Document Type',
		name: 'docType',
		type: 'options',
		options: DOC_TYPES,
		default: 'invoice',
		displayOptions: show(['create']),
	},
	{
		displayName: 'External ID',
		name: 'externalId',
		type: 'string',
		default: '',
		displayOptions: show(['create']),
		description:
			'Your own unique ID for this document, for example the order ID. Recommended: if a document with the same external ID already exists, it is returned and no second document is issued.',
	},
	{
		displayName: 'Customer',
		name: 'customer',
		type: 'collection',
		placeholder: 'Add Customer Field',
		default: {},
		displayOptions: show(['create']),
		description:
			'Required for every document type except receipts. For a Hungarian company the name and the tax number are enough: the address is filled in from the tax authority (NAV).',
		options: [
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
				displayName: 'External Customer ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description:
					'Your own ID for this customer. Customers are matched by it, so two people with the same name stay separate.',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
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
		],
	},
	{
		displayName: 'Items Input',
		name: 'itemsInput',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Define Below',
				value: 'define',
				description: 'Add the lines one by one',
			},
			{
				name: 'JSON Array',
				value: 'json',
				description: 'Map the lines of an order as an array, for example with an expression',
			},
		],
		default: 'define',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Items',
		name: 'items',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Item',
		default: {},
		displayOptions: {
			show: { resource: ['document'], operation: ['create'], itemsInput: ['define'] },
		},
		description: 'One entry for every line of the document',
		options: [
			{
				displayName: 'Item',
				name: 'line',
				values: [
					{
						displayName: 'Discount',
						name: 'discountMode',
						type: 'options',
						options: [
							{
								name: 'None',
								value: 'none',
							},
							{
								name: 'Percent',
								value: 'percent',
							},
							{
								name: 'Fixed Amount',
								value: 'fixed',
							},
						],
						default: 'none',
					},
					{
						displayName: 'Discount Value',
						name: 'discountValue',
						type: 'number',
						default: 0,
						displayOptions: { hide: { discountMode: ['none'] } },
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: 'Shown under the line on the document',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						default: 1,
					},
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Unit',
						name: 'unit',
						type: 'string',
						default: '',
						placeholder: 'e.g. db',
						description: "For example 'db' (piece) or 'óra' (hour). Defaults to 'db'.",
					},
					{
						displayName: 'Unit Price',
						name: 'unitPrice',
						type: 'number',
						typeOptions: { numberPrecision: 4 },
						default: 0,
					},
					{
						displayName: 'Unit Price Is',
						name: 'priceType',
						type: 'options',
						options: [
							{
								name: 'Net (Without VAT)',
								value: 'net',
							},
							{
								name: 'Gross (With VAT)',
								value: 'gross',
							},
						],
						default: 'net',
						description: 'From a gross price the net price is calculated with the VAT rate',
					},
					{
						displayName: 'VAT Rate Name or ID',
						name: 'vatRate',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getVatRates' },
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						hint: 'A percentage (27, 18, 5, 0) or a code such as AAM. Defaults to 27%.',
					},
				],
			},
		],
	},
	{
		displayName: 'Items (JSON)',
		name: 'itemsJson',
		type: 'json',
		default: '[]',
		required: true,
		displayOptions: {
			show: { resource: ['document'], operation: ['create'], itemsInput: ['json'] },
		},
		description:
			'An array with one object for every line. Fields: name, quantity, net_unit_price or gross_unit_price, and optionally vat_rate, unit, sku, note, discount (mode, value). For example: [{"name": "T-shirt", "quantity": 2, "gross_unit_price": 5990}].',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{
				displayName: 'Advance Invoice Number',
				name: 'advanceInvoiceNumber',
				type: 'string',
				default: '',
				description: 'For a final invoice: the number of the advance invoice it settles',
			},
			{
				displayName: 'Already Paid',
				name: 'paid',
				type: 'boolean',
				default: true,
				description: 'Whether to mark the document as paid when it is issued',
			},
			{
				displayName: 'Company Bank Account ID',
				name: 'companyBankAccountId',
				type: 'number',
				default: 0,
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
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Only the day is used. Defaults to the payment term set in Számláma.',
			},
			{
				displayName: 'Electronic Document',
				name: 'electronic',
				type: 'boolean',
				default: true,
				description:
					'Whether to issue an electronic document. Leave unset to use the company default.',
			},
			{
				displayName: 'Fulfillment Date',
				name: 'fulfillmentDate',
				type: 'dateTime',
				default: '',
				description:
					'Only the day is used. Defaults to today. The issue date is always the day of issuing.',
			},
			{
				displayName: 'Invoice Block ID',
				name: 'documentBlockId',
				type: 'number',
				default: 0,
				description:
					'The number series to use. Leave unset for the default block of the document type.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{ name: 'English', value: 'en' },
					{ name: 'German', value: 'de' },
					{ name: 'Hungarian', value: 'hu' },
				],
				default: 'hu',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Printed on the document',
			},
			{
				displayName: 'Online Card Payment Link',
				name: 'onlinePayment',
				type: 'boolean',
				default: true,
				description:
					'Whether to add an online card payment link. Leave unset to use the company rule.',
			},
			{
				displayName: 'Order Number',
				name: 'orderNumber',
				type: 'string',
				default: '',
				description: 'Printed on the document',
			},
			{
				displayName: 'Paid On',
				name: 'paidOn',
				type: 'dateTime',
				default: '',
				description: 'Only the day is used. Used with Already Paid; today at the latest.',
			},
			{
				displayName: 'Payment Method Name or ID',
				name: 'paymentMethod',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getPaymentMethods' },
				default: '',
				hint: 'Defaults to bank transfer',
			},
			{
				displayName: 'Send by Email',
				name: 'sendEmail',
				type: 'boolean',
				default: true,
				description:
					'Whether to send the document to the email address of the customer. Test documents are never sent to customers.',
			},
		],
	},

	// ------------------------------------------------------------ download PDF
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: show(['downloadPdf']),
		hint: 'The name of the output binary field to put the file in',
	},

	// ------------------------------------------------------------ send
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: show(['send']),
		description:
			'Leave empty to use the address saved on the customer. Required for test documents.',
	},

	// ------------------------------------------------------------ mark as paid
	{
		displayName: 'Paid On',
		name: 'paidOn',
		type: 'dateTime',
		default: '',
		displayOptions: show(['markPaid']),
		description: 'Only the day is used. Defaults to today; cannot be in the future.',
	},

	// ------------------------------------------------------------ cancel
	{
		displayName: 'Cancelling issues a cancellation (storno) document. This cannot be undone.',
		name: 'cancelNotice',
		type: 'notice',
		default: '',
		displayOptions: show(['cancel']),
	},

	// ------------------------------------------------------------ get many
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show(['getAll']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['document'], operation: ['getAll'], returnAll: [false] } },
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
				displayName: 'Document Type',
				name: 'docType',
				type: 'options',
				options: DOC_TYPES,
				default: 'invoice',
			},
			{ displayName: 'External ID', name: 'externalId', type: 'string', default: '' },
			{
				displayName: 'Issued From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only the day is used',
			},
			{
				displayName: 'Issued To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only the day is used',
			},
			{ displayName: 'Partner ID', name: 'partnerId', type: 'number', default: 0 },
			{
				displayName: 'Payment State',
				name: 'paid',
				type: 'options',
				options: [
					{ name: 'Paid', value: '1' },
					{ name: 'Unpaid', value: '0' },
				],
				default: '0',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Part of the document number or of the customer name',
			},
			{
				displayName: 'Sort By',
				name: 'sort',
				type: 'options',
				options: [
					{ name: 'Gross Total, Largest First', value: '-gross_total' },
					{ name: 'Gross Total, Smallest First', value: 'gross_total' },
					{ name: 'ID, Newest First', value: '-id' },
					{ name: 'ID, Oldest First', value: 'id' },
					{ name: 'Issue Date, Newest First', value: '-issue_date' },
					{ name: 'Issue Date, Oldest First', value: 'issue_date' },
				],
				default: '-issue_date',
			},
		],
	},
];
