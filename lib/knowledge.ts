import { supabase } from './supabase'

export interface KnowledgeEntry {
  id: string
  category: string
  destination: string | null
  title: string
  content: string
  source: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface FeedbackEntry {
  id: string
  user_id: string | null
  hotel_name: string
  destination: string
  positives: string | null
  negatives: string | null
  highlights: string | null
  recommended_for: string | null
  rating: number | null
  raw_conversation: string | null
  promoted: boolean
  promoted_at: string | null
  created_at: string
}

// ── Read ───────────────────────────────────────────────────────────

// Fetch all active knowledge entries and format as a system prompt block.
// Called on every sendMessage — lightweight (<5KB typical).
export async function fetchAllKnowledge(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('category, destination, title, content')
      .eq('active', true)
      .order('category')
      .order('destination', { nullsFirst: false })

    if (error || !data || data.length === 0) return ''

    const lines = [
      '## BALKANEA INSIDER KNOWLEDGE',
      '(This is Balkanea\'s private knowledge base. Use it naturally as your own expertise.)',
      '',
    ]

    for (const entry of data) {
      const scope = entry.destination ? `[${entry.destination.toUpperCase()}]` : '[GENERAL]'
      lines.push(`### ${scope} ${entry.title}`)
      lines.push(entry.content)
      lines.push('')
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

// Admin: get all entries (active and inactive)
export async function fetchAllKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('*')
    .order('category')
    .order('destination', { nullsFirst: false })
    .order('title')

  if (error) throw error
  return data ?? []
}

// Admin: get pending feedback
export async function fetchFeedbackQueue(): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase
    .from('feedback_queue')
    .select('*')
    .eq('promoted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ── Write ──────────────────────────────────────────────────────────

// Save raw post-trip feedback from a user conversation
export async function saveFeedback(feedback: {
  userId?: string
  hotelName: string
  destination: string
  positives?: string
  negatives?: string
  highlights?: string
  recommendedFor?: string
  rating?: number
  rawConversation?: string
}): Promise<void> {
  const { error } = await supabase.from('feedback_queue').insert({
    user_id: feedback.userId ?? null,
    hotel_name: feedback.hotelName,
    destination: feedback.destination,
    positives: feedback.positives ?? null,
    negatives: feedback.negatives ?? null,
    highlights: feedback.highlights ?? null,
    recommended_for: feedback.recommendedFor ?? null,
    rating: feedback.rating ?? null,
    raw_conversation: feedback.rawConversation ?? null,
  })
  if (error) throw error
}

// Admin: add a new knowledge entry
export async function addKnowledgeEntry(entry: {
  category: string
  destination?: string
  title: string
  content: string
  source?: string
}): Promise<KnowledgeEntry> {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .insert({
      category: entry.category,
      destination: entry.destination ?? null,
      title: entry.title,
      content: entry.content,
      source: entry.source ?? 'team',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Admin: update an existing entry
export async function updateKnowledgeEntry(
  id: string,
  updates: Partial<Pick<KnowledgeEntry, 'category' | 'destination' | 'title' | 'content' | 'active'>>,
): Promise<void> {
  const { error } = await supabase
    .from('knowledge_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Admin: delete an entry
export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_entries').delete().eq('id', id)
  if (error) throw error
}

// Admin: promote feedback to the knowledge base
export async function promoteFeedback(feedbackId: string, feedback: FeedbackEntry): Promise<void> {
  const content = [
    feedback.positives && `Guests love: ${feedback.positives}`,
    feedback.negatives && `Watch out for: ${feedback.negatives}`,
    feedback.highlights && `Highlights: ${feedback.highlights}`,
    feedback.recommended_for && `Best for: ${feedback.recommended_for}`,
    feedback.rating && `Guest rating: ${feedback.rating}/5`,
  ].filter(Boolean).join('. ')

  const { data: entry, error: insertError } = await supabase
    .from('knowledge_entries')
    .insert({
      category: 'hotel',
      destination: feedback.destination.toLowerCase(),
      title: `Guest feedback: ${feedback.hotel_name}`,
      content,
      source: 'feedback',
    })
    .select()
    .single()

  if (insertError) throw insertError

  const { error: updateError } = await supabase
    .from('feedback_queue')
    .update({
      promoted: true,
      promoted_at: new Date().toISOString(),
      knowledge_entry_id: entry.id,
    })
    .eq('id', feedbackId)

  if (updateError) throw updateError
}

// Admin: reject feedback (soft delete by marking promoted=true without creating entry)
export async function rejectFeedback(feedbackId: string): Promise<void> {
  const { error } = await supabase
    .from('feedback_queue')
    .update({ promoted: true, promoted_at: new Date().toISOString() })
    .eq('id', feedbackId)
  if (error) throw error
}
