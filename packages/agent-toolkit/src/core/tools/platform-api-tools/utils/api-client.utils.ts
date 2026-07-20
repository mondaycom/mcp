import { ApiClient } from '@mondaydotcomorg/api';

export function withPublicSchemaHeader(client: ApiClient): ApiClient {
  const { token, defaultApiVersion, defaultEndpoint, requestConfig } = client as any;
  return new ApiClient({
    token,
    apiVersion: defaultApiVersion,
    endpoint: defaultEndpoint,
    requestConfig: { ...requestConfig, headers: { ...requestConfig?.headers, 'x-api-schema': 'public' } },
  });
}
