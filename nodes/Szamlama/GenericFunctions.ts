import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BASE_URL = 'https://app.szamlama.hu/api/v1';

type Context = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

/** fooBar → foo_bar: the node uses camelCase parameter names, the API uses snake_case. */
export function snakeKeys(input: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(input)) {
		out[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
	}
	return out;
}

/** Drops empty strings, null and undefined, so that the API applies its own defaults. */
export function withoutEmpty(input: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === '' || value === null || value === undefined) continue;
		out[key] = value;
	}
	return out;
}

/** A date or date-time value → YYYY-MM-DD (the API works with days). */
export function toDay(value: unknown): string | undefined {
	if (typeof value !== 'string' || value === '') return undefined;
	return value.slice(0, 10);
}

/** The API message, followed by the field-level details when there are any. */
function describeError(body: IDataObject): { message: string; description?: string } {
	const message =
		typeof body.message === 'string' ? body.message : 'The Számláma API returned an error';
	const lines: string[] = [];
	for (const key of ['problems', 'details']) {
		const list = body[key];
		if (!Array.isArray(list)) continue;
		for (const entry of list as IDataObject[]) {
			if (typeof entry?.message === 'string') lines.push(entry.message);
		}
	}
	if (typeof body.hint === 'string') lines.push(body.hint);
	return { message, description: lines.length ? lines.join(' ') : undefined };
}

export async function szamlamaApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
	itemIndex?: number,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined && Object.keys(qs).length) options.qs = qs;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'szamlamaApi',
		options,
	)) as { statusCode: number; body: unknown };

	const data = (
		typeof response.body === 'object' && response.body !== null ? response.body : {}
	) as IDataObject;
	if (response.statusCode >= 400) {
		const { message, description } = describeError(data);
		throw new NodeApiError(this.getNode(), data as JsonObject, {
			message,
			description,
			httpCode: String(response.statusCode),
			itemIndex,
		});
	}
	return data;
}

export async function szamlamaApiDownload(
	this: IExecuteFunctions,
	path: string,
	itemIndex: number,
): Promise<Buffer> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'szamlamaApi', {
		method: 'GET',
		url: `${BASE_URL}${path}`,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { statusCode: number; body: ArrayBuffer | Buffer };

	const buffer = Buffer.from(response.body as ArrayBuffer);
	if (response.statusCode >= 400) {
		let data: IDataObject = {};
		try {
			data = JSON.parse(buffer.toString('utf8')) as IDataObject;
		} catch {
			data = {};
		}
		const { message, description } = describeError(data);
		throw new NodeApiError(this.getNode(), data as JsonObject, {
			message,
			description,
			httpCode: String(response.statusCode),
			itemIndex,
		});
	}
	return buffer;
}
