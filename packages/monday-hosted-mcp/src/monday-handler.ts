import type { AuthRequest, OAuthHelpers } from '@cloudflare/workers-oauth-provider'
import { Hono } from 'hono'
import { fetchUpstreamAuthToken, Props } from './utils'
import { env } from 'cloudflare:workers'
import { clientIdAlreadyApproved, parseRedirectApproval, renderApprovalDialog } from './workers-oauth-utils'
import { AuthorizationCode } from 'simple-oauth2'

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
  const { clientId } = oauthReqInfo
  if (!clientId) {
    return c.text('Invalid request', 400)
  }

  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToMonday(c.req.raw, oauthReqInfo)
  }

  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    server: {
      name: 'Monday MCP Server',
      logo: 'https://monday.com/p/wp-content/uploads/2024/03/Logo-1-NO-1.png',
      description: 'This is a MCP Remote Server using monday.com for authentication.',
    },
    state: { oauthReqInfo },
  })
})

app.post('/authorize', async (c) => {
  // Validates form submission, extracts state, and generates Set-Cookie headers to skip approval dialog next time
  const { state, headers } = await parseRedirectApproval(c.req.raw, env.COOKIE_ENCRYPTION_KEY)
  if (!state.oauthReqInfo) {
    return c.text('Invalid request', 400)
  }

  return redirectToMonday(c.req.raw, state.oauthReqInfo, headers)
})

const x = new AuthorizationCode({
  client: {
    id: env.MONDAY_CLIENT_ID,
    secret: env.MONDAY_CLIENT_SECRET,
  },
  auth: {
    tokenHost: 'https://auth.monday.com',
    tokenPath: '/oauth2/token',
    authorizePath: '/oauth2/authorize',
  },
})

async function redirectToMonday(request: Request, oauthReqInfo: AuthRequest, headers: Record<string, string> = {}) {
  const url = x.authorizeURL({
    state: btoa(JSON.stringify(oauthReqInfo)),
  })

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: url,
    },
  })
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from GitHub after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
app.get('/callback', async (c) => {
  // Get the oathReqInfo out of KV
  const oauthReqInfo = JSON.parse(atob(c.req.query('state') as string)) as AuthRequest
  if (!oauthReqInfo.clientId) {
    return c.text('Invalid state', 400)
  }

  // Exchange the code for an access token
  const [accessToken, errResponse] = await fetchUpstreamAuthToken({
    upstream_url: 'https://auth.monday.com/oauth2/token',
    client_id: c.env.MONDAY_CLIENT_ID,
    client_secret: c.env.MONDAY_CLIENT_SECRET,
    code: c.req.query('code'),
    redirect_uri: new URL('/callback', c.req.url).href,
  })
  if (errResponse) return errResponse

  // Fetch the user info from Monday.com
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: `${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: '{ me { id name email } }',
    }),
  })
  if (!response.ok) {
    console.error('Error fetching user data:', await response.text())
    return c.text('Error fetching user data', 500)
  }
  const userData = (await response.json()) as { data: { me: { id: string; name: string; email: string } } }
  const { id: login, name, email } = userData.data.me

  // Return back to the MCP client a new token
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: login,
    metadata: {
      label: name,
    },
    scope: oauthReqInfo.scope,
    // This will be available on this.props inside MyMCP
    props: {
      login,
      name,
      email,
      accessToken,
    } as Props,
  })

  return Response.redirect(redirectTo)
})

export { app as MondayHandler }
