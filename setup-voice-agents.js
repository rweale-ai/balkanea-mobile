const https = require('https')

const API_KEY = process.env.RETELL_API_KEY
if (!API_KEY) { console.error('Set RETELL_API_KEY env var before running this script'); process.exit(1) }

// ── Prompts ───────────────────────────────────────────────────────────────────

const PROMPT_EN = `You are Bea, a warm and knowledgeable Balkans travel expert for Balkanea — the leading travel platform for the Balkans region. You speak with callers who want to plan trips to the Balkans.

## Your personality
Warm, enthusiastic, and concise. You speak like a well-travelled local friend, not a scripted assistant. Keep responses short — this is a voice call. No long lists — pick the best 2 or 3 highlights and offer to go deeper.

## Your job
Have a natural conversation to plan a personalised Balkans trip. You cover Croatia, Montenegro, North Macedonia, Bosnia, Serbia, Albania, Slovenia, Bulgaria, Romania, and nearby Italy.

## Gather (one or two questions at a time)
1. Where they want to go — or help them choose
2. When and how long
3. Who is travelling and how many people
4. Budget feel — budget, mid-range, or luxury
5. Vibe — beach, history, food, adventure, romance, nature

## When you have enough information
Summarise the trip out loud: destination, duration, day-by-day highlights, estimated nightly budget. Ask if they want to adjust anything or get hotel suggestions.

## Boundaries
- Only discuss Balkans travel
- Do not book anything on this call — direct to the Balkanea app for bookings
- If asked anything outside travel, politely redirect`

const PROMPT_MK = `Ти си Беа, топол и знаен експерт за патувања на Балканот за Балканеа — водечката платформа за патување на Балканот. Разговараш со луѓе кои сакаат да планираат патување на Балканот.

## Твој стил
Топла, ентузијастична и концизна. Зборуваш како добро патуван локален пријател, не како скриптиран асистент. Одржувај кратки одговори — ова е гласовен повик. Не читај долги листи — избери 2 или 3 врвни препораки и понуди повеќе детали.

## Твоја задача
Води природен разговор за да планираш персонализирано балканско патување. Ги покриваш Хрватска, Црна Гора, Северна Македонија, Босна, Србија, Албанија, Словенија, Бугарија, Романија и блиската Италија.

## Прибери информации (едно или две прашања по ред)
1. Каде сакаат да одат — или помогни им да изберат
2. Кога и колку долго
3. Кој патува и колку луѓе
4. Буџет — буџетско, средно ниво или луксуз
5. Расположение — плажа, историја, храна, авантура, романса, природа

## Кога ќе имаш доволно информации
Резимирај го патувањето гласно: дестинација, времетраење, дневни врвни точки, проценета ноќна цена. Прашај дали сакаат да прилагодат нешто или да добијат предлози за хотели.

## Граници
- Разговарај само за патување на Балканот
- Не резервирај ништо на овој повик — упати ги кон апликацијата Балканеа
- Ако те прашаат нешто надвор од патувањето, учтиво пренасочи`

// ── Helper ────────────────────────────────────────────────────────────────────

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: 'api.retellai.com', path, method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }) }
        catch(e) { reject(new Error('Bad JSON: ' + d.slice(0,200))) }
      })
    })
    req.on('error', reject)
    req.write(data); req.end()
  })
}

async function createAgent({ name, prompt, language, voice }) {
  // 1. Create LLM
  const llmRes = await post('/create-retell-llm', {
    model: 'gemini-3.0-flash',
    general_prompt: prompt,
    general_tools: [{
      type: 'end_call',
      name: 'end_call',
      description: language === 'mk-MK'
        ? 'Заврши го повикот кога повикувачот се збогува или е готов.'
        : 'End the call when the caller says goodbye or is done.',
      speak_after_execution: true,
    }],
  })
  if (llmRes.status !== 201 && llmRes.status !== 200) {
    console.error(`LLM failed for ${name}:`, llmRes.status, JSON.stringify(llmRes.body))
    return null
  }
  const llmId = llmRes.body.llm_id
  console.log(`  LLM: ${llmId}`)

  // 2. Create agent
  const agentRes = await post('/create-agent', {
    agent_name: name,
    response_engine: { type: 'retell-llm', llm_id: llmId },
    voice_id: voice,
    language,
    enable_backchannel: true,
    backchannel_frequency: 0.8,
    end_call_after_silence_ms: 30000,
    reminder_trigger_ms: 10000,
    reminder_max_count: 1,
    ambient_sound: 'coffee-shop',
  })
  if (agentRes.status !== 201 && agentRes.status !== 200) {
    console.error(`Agent failed for ${name}:`, agentRes.status, JSON.stringify(agentRes.body))
    return null
  }
  return { llmId, agentId: agentRes.body.agent_id }
}

async function main() {
  console.log('Creating Bea — English...')
  const en = await createAgent({
    name:     'Bea — Balkanea EN',
    prompt:   PROMPT_EN,
    language: 'en-US',
    voice:    'retell-Willa',   // British, warm female — recommended
  })
  if (en) console.log(`  Agent: ${en.agentId}`)

  console.log('Creating Bea — Macedonian...')
  const mk = await createAgent({
    name:     'Bea — Balkanea MK',
    prompt:   PROMPT_MK,
    language: 'mk-MK',
    voice:    'cartesia-Cleo',  // multilingual cartesia — handles Macedonian
  })
  if (mk) console.log(`  Agent: ${mk.agentId}`)

  console.log('\n=== SAVE THESE ===')
  if (en) { console.log('EN LLM:   ', en.llmId); console.log('EN Agent: ', en.agentId) }
  if (mk) { console.log('MK LLM:   ', mk.llmId); console.log('MK Agent: ', mk.agentId) }
}

main().catch(console.error)
