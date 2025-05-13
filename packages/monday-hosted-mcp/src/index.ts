import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { MondayHandler } from './monday-handler'
import { Props } from './utils'
// Import from the npm package
import { MondayAgentToolkit } from '@mondaydotcomorg/agent-toolkit/mcp'

export class MyMCP extends McpAgent<Props, Env> {
  server: McpServer

  async init() {
    // Initialize the MondayAgentToolkit with your access token from props
    const toolkit = new MondayAgentToolkit({
      mondayApiToken: this.props.accessToken,
      toolsConfiguration: {
        enableDynamicApiTools: true,
      },
    })

    // Use the toolkit's server as your server
    this.server = toolkit.getServer()

    // You can still add your custom tools if needed
    // this.server.tool('add', 'Add two numbers the way only MCP can', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    //   content: [{ type: 'text', text: String(a + b) }],
    // }))
  }
}

export default new OAuthProvider({
  apiRoute: '/sse',
  apiHandler: MyMCP.mount('/sse'),
  defaultHandler: MondayHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
