import { Platform } from 'react-native'

// Polyfill WebRTC globals on native so retell-client-js-sdk can use them.
// registerGlobals() is a no-op on web (uses browser's native WebRTC).
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerGlobals } = require('react-native-webrtc')
  registerGlobals()
}

// TODO: move to a backend proxy before App Store submission — API key must not ship in production client
const RETELL_API_KEY = process.env.EXPO_PUBLIC_RETELL_API_KEY ?? 'key_faf037ed18bb6b372ac05929eb52'

export const AGENTS = {
  en: process.env.EXPO_PUBLIC_RETELL_AGENT_EN ?? 'agent_88718b83329c3417f0b1dce5b5',
  mk: process.env.EXPO_PUBLIC_RETELL_AGENT_MK ?? 'agent_4eff660016ae3f4aaa688f1742',
}

export type CallStatus = 'idle' | 'connecting' | 'active' | 'ending'
export type AgentLang = 'en' | 'mk'

// Lazily imported — retell-client-js-sdk references browser globals (window, navigator)
// and must never be evaluated on native.
let client: InstanceType<typeof import('retell-client-js-sdk').RetellWebClient> | null = null

async function getClient() {
  if (!client) {
    const { RetellWebClient } = await import('retell-client-js-sdk')
    client = new RetellWebClient()
  }
  return client
}

async function createWebCallToken(agentId: string): Promise<string> {
  const res = await fetch('https://api.retellai.com/v2/create-web-call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agent_id: agentId }),
  })
  if (!res.ok) throw new Error(`Retell token error: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export interface VoiceCallHandlers {
  onStatusChange: (status: CallStatus) => void
  onAgentTalking: (talking: boolean) => void
  onError: (msg: string) => void
}

export async function startVoiceCall(lang: AgentLang, handlers: VoiceCallHandlers): Promise<void> {
  handlers.onStatusChange('connecting')
  try {
    const token = await createWebCallToken(AGENTS[lang])
    const c = await getClient()

    c.on('call_started', () => handlers.onStatusChange('active'))
    c.on('call_ended', () => handlers.onStatusChange('idle'))
    c.on('agent_start_talking', () => handlers.onAgentTalking(true))
    c.on('agent_stop_talking', () => handlers.onAgentTalking(false))
    c.on('error', (err: unknown) => {
      console.error('Retell error', err)
      handlers.onStatusChange('idle')
      handlers.onError('Voice call failed. Please try again.')
    })

    await c.startCall({ accessToken: token })
  } catch (err) {
    console.error('startVoiceCall error', err)
    handlers.onStatusChange('idle')
    handlers.onError('Could not start voice call. Check your connection.')
  }
}

export function stopVoiceCall(): void {
  client?.stopCall()
}
