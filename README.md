# n8n-nodes-szamlama

This is an n8n community node for [Számláma](https://szamlama.hu/), a Hungarian online invoicing service. It lets you issue invoices and other documents from your n8n workflows, and start workflows when something happens to a document. Reporting to the Hungarian tax authority (NAV) is done by Számláma automatically.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-szamlama`.

## Operations

**Számláma** node

| Resource | Operations |
| --- | --- |
| Document | Create (invoice, pro forma invoice, advance invoice, final invoice, receipt, delivery note), Get, Get Many, Download PDF, Send by Email, Mark as Paid, Cancel |
| Partner | Create or Update, Update, Get Many, Look Up by Tax Number |
| Product | Create or Update, Update, Get Many |

**Számláma Trigger** node

Starts the workflow on these events: document issued, document paid, document cancelled (storno), tax authority (NAV) status changed. The node registers its webhook in Számláma when the workflow is activated and removes it when the workflow is deactivated. Incoming requests are checked against the signature that Számláma sends.

Számláma only delivers events to HTTPS addresses, so the webhook URL of your n8n instance has to be public.

## Credentials

You need a Számláma account with a company, and an API key:

1. In Számláma, open **Settings → API keys** (<https://app.szamlama.hu/api-kulcsok>).
2. Create a key with read and write access.
3. In n8n, create a **Számláma API** credential and paste the key.

One key belongs to one company. For several companies, create one credential for each.

Start with a **test key** (`szlatest_…`): the documents it creates get a `TESZT-` number, are not reported to NAV, do not use up your invoice numbers, and are never sent to your customers. When your workflow is right, switch to a live key.

API access is part of the Számláma Automation plan.

## Usage

### An invoice from an order with several lines

Use **Document → Create**. If the order arrives as one item with an array of lines, set **Items Input** to **JSON Array** and map the lines with an expression, for example:

```
{{ $json.line_items.map(line => ({
  name: line.name,
  quantity: line.quantity,
  gross_unit_price: line.price,
  vat_rate: '27'
})) }}
```

Each line needs a `name`, a `quantity`, and either a `net_unit_price` or a `gross_unit_price`. Optional fields: `vat_rate` (defaults to 27%), `unit`, `sku`, `note`, `discount` (`mode`: `percent` or `fixed`, and `value`).

### Never twice

Put the order ID into **External ID**. If the workflow runs again for the same order, Számláma returns the document it already issued and does not issue a second one.

### Customer

For a Hungarian company the name and the tax number are enough: the address is filled in from NAV. For a private person give the name and the address. Receipts need no customer.

### Live invoices cannot be changed

A live invoice is reported to NAV at once. It cannot be edited or deleted, only cancelled with **Document → Cancel**, which issues a cancellation (storno) document.

### Errors

If something is missing or wrong, the node fails with a message that says which field to correct, for example a missing tax number or an unknown VAT rate.

## Compatibility

Developed and tested with n8n 2.48.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Számláma API reference](https://app.szamlama.hu/api-dokumentacio) (in Hungarian), with an [OpenAPI description](https://app.szamlama.hu/api-dokumentacio/openapi.json)
- Support: <https://szamlama.hu/kapcsolat/>

## License

[MIT](LICENSE.md). The Számláma name and logo are trademarks of Software-Wolf Kft. and are not covered by the MIT license.
