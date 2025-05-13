import mondaySdk, { MondayServerSdk } from 'monday-sdk-js'
const monday = mondaySdk() as unknown as MondayServerSdk
/**
 * Constructs an authorization URL for an upstream service.
 *
 * @param {Object} options
 * @param {string} options.upstream_url - The base URL of the upstream service.
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} [options.state] - The state parameter.
 *
 * @returns {string} The authorization URL.
 */
export function getUpstreamAuthorizeUrl({
  upstream_url,
  client_id,
  scope,
  redirect_uri,
  state,
}: {
  upstream_url: string
  client_id: string
  scope?: any
  redirect_uri?: string
  state?: string
}) {
  const upstream = new URL(upstream_url)
  upstream.searchParams.set('client_id', client_id)
  if (redirect_uri) {
    upstream.searchParams.set('redirect_uri', redirect_uri)
  }
  if (Array.isArray(scope)) {
    upstream.searchParams.set('scope', scope.join(' '))
  }
  if (state) {
    upstream.searchParams.set('state', state)
  }
  upstream.searchParams.set('response_type', 'code')
  return upstream.href
}

/**
 * Fetches an authorization token from an upstream service.
 *
 * @param {Object} options
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.client_secret - The client secret of the application.
 * @param {string} options.code - The authorization code.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} options.upstream_url - The token endpoint URL of the upstream service.
 *
 * @returns {Promise<[string, null] | [null, Response]>} A promise that resolves to an array containing the access token or an error response.
 */
export async function fetchUpstreamAuthToken({
  client_id,
  client_secret,
  code,
  redirect_uri,
  upstream_url,
}: {
  code: string | undefined
  upstream_url: string
  client_secret: string
  redirect_uri: string
  client_id: string
}): Promise<[string, null] | [null, Response]> {
  if (!code) {
    return [null, new Response('Missing code', { status: 400 })]
  }
  const x = await monday.oauthToken(code, client_id, client_secret)
  const accessToken = x.access_token as string
  if (!accessToken) {
    return [null, new Response(JSON.stringify(x), { status: 400 })]
  }
  return [accessToken, null]
}

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
export type Props = {
  login: string
  name: string
  email: string
  accessToken: string
}
