import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert, Platform, FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import {
  fetchAllKnowledgeEntries, fetchFeedbackQueue,
  addKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry,
  promoteFeedback, rejectFeedback,
} from '../lib/knowledge'
import type { KnowledgeEntry, FeedbackEntry } from '../lib/knowledge'
import { getUser } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'

const ADMIN_DOMAINS = ['@marraglobal.com', '@balkanea.mk']
const CATEGORIES = ['general', 'destination', 'hotel', 'tip', 'seasonal', 'practical']

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  return ADMIN_DOMAINS.some(d => email.endsWith(d))
}

// ── Add/Edit entry form ────────────────────────────────────────────

function EntryForm({
  existing,
  onSave,
  onCancel,
}: {
  existing?: KnowledgeEntry
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useLang()
  const [category, setCategory] = useState(existing?.category ?? 'general')
  const [destination, setDestination] = useState(existing?.destination ?? '')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing fields', 'Title and content are required.')
      return
    }
    setSaving(true)
    try {
      if (existing) {
        await updateKnowledgeEntry(existing.id, { category, destination: destination || undefined, title, content })
      } else {
        await addKnowledgeEntry({ category, destination: destination || undefined, title, content })
      }
      onSave()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={f.wrap}>
      <Text style={f.label}>{t.adminKnowledge.category}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={f.catRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[f.catChip, category === c && f.catChipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[f.catText, category === c && f.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={f.label}>{t.adminKnowledge.destination} (optional)</Text>
      <TextInput style={f.input} value={destination} onChangeText={setDestination} placeholder="ohrid, santorini…" placeholderTextColor={Colors.textLight} autoCapitalize="none" />

      <Text style={f.label}>{t.adminKnowledge.entryTitle}</Text>
      <TextInput style={f.input} value={title} onChangeText={setTitle} placeholder="Short title for this entry" placeholderTextColor={Colors.textLight} />

      <Text style={f.label}>{t.adminKnowledge.content}</Text>
      <TextInput
        style={[f.input, f.textarea]}
        value={content}
        onChangeText={setContent}
        placeholder="The knowledge Nea will use…"
        placeholderTextColor={Colors.textLight}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <View style={f.btnRow}>
        <TouchableOpacity style={f.cancelBtn} onPress={onCancel}>
          <Text style={f.cancelText}>{t.adminKnowledge.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={f.saveWrap} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <LinearGradient colors={Gradients.primaryFade} style={f.saveBtn}>
            <Text style={f.saveText}>{saving ? 'Saving…' : t.adminKnowledge.save}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const f = StyleSheet.create({
  wrap: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.md },
  label: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', marginBottom: 5, marginTop: Spacing.sm },
  catRow: { marginBottom: Spacing.sm },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.borderLight, marginRight: 8 },
  catChipActive: { backgroundColor: Colors.primaryLight },
  catText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: Colors.primary },
  input: { backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm, paddingVertical: Platform.OS === 'ios' ? 12 : 10, ...Typography.body, color: Colors.text, fontSize: 14, marginBottom: Spacing.sm },
  textarea: { minHeight: 100, paddingTop: Spacing.sm },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { ...Typography.button, color: Colors.textSecondary },
  saveWrap: { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  saveBtn: { paddingVertical: 12, alignItems: 'center' },
  saveText: { ...Typography.button, color: '#fff' },
})

// ── Main screen ────────────────────────────────────────────────────

export default function AdminKnowledgeScreen() {
  const router = useRouter()
  const { t } = useLang()
  const [tab, setTab] = useState<'knowledge' | 'feedback'>('knowledge')
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [feedbackItems, setFeedbackItems] = useState<FeedbackEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser().then(u => {
      setAuthorized(isAdmin(u?.email))
      if (isAdmin(u?.email)) loadAll()
    })
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [e, f] = await Promise.all([fetchAllKnowledgeEntries(), fetchFeedbackQueue()])
      setEntries(e)
      setFeedbackItems(f)
    } catch (e) {
      console.warn('Failed to load admin data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = (entry: KnowledgeEntry) => {
    Alert.alert('Delete entry', `Delete "${entry.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteKnowledgeEntry(entry.id); await loadAll() }
        catch (e: any) { Alert.alert('Error', e?.message) }
      }},
    ])
  }

  const handleToggleActive = async (entry: KnowledgeEntry) => {
    try { await updateKnowledgeEntry(entry.id, { active: !entry.active }); await loadAll() }
    catch (e: any) { Alert.alert('Error', e?.message) }
  }

  const handlePromote = async (item: FeedbackEntry) => {
    try { await promoteFeedback(item.id, item); await loadAll() }
    catch (e: any) { Alert.alert('Error', e?.message) }
  }

  const handleReject = async (item: FeedbackEntry) => {
    try { await rejectFeedback(item.id); await loadAll() }
    catch (e: any) { Alert.alert('Error', e?.message) }
  }

  if (authorized === null) return null

  if (!authorized) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t.adminKnowledge.title}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.notAdmin}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.border} />
          <Text style={s.notAdminText}>{t.adminKnowledge.notAdmin}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.adminKnowledge.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab bar */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'knowledge' && s.tabActive]} onPress={() => setTab('knowledge')}>
          <Text style={[s.tabText, tab === 'knowledge' && s.tabTextActive]}>
            {t.adminKnowledge.knowledge} ({entries.filter(e => e.active).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'feedback' && s.tabActive]} onPress={() => setTab('feedback')}>
          <Text style={[s.tabText, tab === 'feedback' && s.tabTextActive]}>
            {t.adminKnowledge.feedbackQueue} ({feedbackItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {tab === 'knowledge' && (
          <>
            {/* Add button */}
            {!showForm && (
              <TouchableOpacity style={s.addBtn} onPress={() => { setEditingEntry(undefined); setShowForm(true) }} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={s.addBtnText}>{t.adminKnowledge.addEntry}</Text>
              </TouchableOpacity>
            )}

            {/* Add/Edit form */}
            {showForm && (
              <EntryForm
                existing={editingEntry}
                onSave={() => { setShowForm(false); setEditingEntry(undefined); loadAll() }}
                onCancel={() => { setShowForm(false); setEditingEntry(undefined) }}
              />
            )}

            {/* Entries list */}
            {entries.length === 0 && !loading ? (
              <Text style={s.empty}>{t.adminKnowledge.noEntries}</Text>
            ) : (
              entries.map(entry => (
                <View key={entry.id} style={[s.entryCard, !entry.active && s.entryInactive]}>
                  <View style={s.entryTop}>
                    <View style={s.entryMeta}>
                      <View style={s.categoryPill}>
                        <Text style={s.categoryText}>{entry.category}</Text>
                      </View>
                      {entry.destination && (
                        <View style={[s.categoryPill, s.destPill]}>
                          <Text style={[s.categoryText, { color: Colors.accent }]}>{entry.destination}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.entryActions}>
                      <TouchableOpacity onPress={() => handleToggleActive(entry)} style={s.iconBtn}>
                        <Ionicons name={entry.active ? 'eye' : 'eye-off-outline'} size={18} color={entry.active ? Colors.success : Colors.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setEditingEntry(entry); setShowForm(true) }} style={s.iconBtn}>
                        <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(entry)} style={s.iconBtn}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={s.entryTitle}>{entry.title}</Text>
                  <Text style={s.entryContent} numberOfLines={2}>{entry.content}</Text>
                  <Text style={s.entrySource}>{entry.source} · {new Date(entry.updated_at).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'feedback' && (
          <>
            {feedbackItems.length === 0 ? (
              <Text style={s.empty}>{t.adminKnowledge.noPendingFeedback}</Text>
            ) : (
              feedbackItems.map(item => (
                <View key={item.id} style={s.feedbackCard}>
                  <View style={s.feedbackHeader}>
                    <Text style={s.feedbackHotel}>{item.hotel_name}</Text>
                    {item.rating && (
                      <View style={s.ratingBadge}>
                        <Ionicons name="star" size={11} color={Colors.star} />
                        <Text style={s.ratingText}>{item.rating}/5</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.feedbackDest}>{item.destination} · {new Date(item.created_at).toLocaleDateString()}</Text>
                  {item.positives && <Text style={s.feedbackLine}>✓ {item.positives}</Text>}
                  {item.negatives && <Text style={[s.feedbackLine, { color: Colors.textSecondary }]}>✗ {item.negatives}</Text>}
                  {item.highlights && <Text style={s.feedbackLine}>💡 {item.highlights}</Text>}
                  {item.recommended_for && <Text style={s.feedbackLine}>👥 {item.recommended_for}</Text>}

                  <View style={s.feedbackBtns}>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item)} activeOpacity={0.8}>
                      <Text style={s.rejectText}>{t.adminKnowledge.reject}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.promoteWrap} onPress={() => handlePromote(item)} activeOpacity={0.85}>
                      <LinearGradient colors={Gradients.primaryFade} style={s.promoteBtn}>
                        <Ionicons name="sparkles" size={14} color="#fff" />
                        <Text style={s.promoteText}>{t.adminKnowledge.promote}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxxl },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  backBtn: { width: 38, height: 38, borderRadius: Radius.full, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: Colors.text },

  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { flex: 1, paddingVertical: Spacing.sm + 2, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },

  notAdmin: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  notAdminText: { ...Typography.h3, color: Colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, marginBottom: Spacing.md, alignSelf: 'flex-start' },
  addBtnText: { ...Typography.bodyMedium, color: Colors.primary, fontWeight: '700' },

  empty: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },

  entryCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  entryInactive: { opacity: 0.5 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.xs },
  entryMeta: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  entryActions: { flexDirection: 'row', gap: 4, marginLeft: Spacing.sm },
  iconBtn: { padding: 4 },
  categoryPill: { backgroundColor: Colors.borderLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  destPill: { backgroundColor: Colors.accentLight },
  categoryText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', fontSize: 11 },
  entryTitle: { ...Typography.bodyMedium, color: Colors.text, fontWeight: '700', marginBottom: 3 },
  entryContent: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  entrySource: { ...Typography.caption, color: Colors.textLight, fontSize: 11, marginTop: 5 },

  feedbackCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  feedbackHotel: { ...Typography.bodyMedium, color: Colors.text, fontWeight: '700', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  feedbackDest: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  feedbackLine: { ...Typography.caption, color: Colors.text, lineHeight: 18, marginBottom: 3 },
  feedbackBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  rejectText: { ...Typography.button, color: Colors.textSecondary, fontSize: 13 },
  promoteWrap: { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  promoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  promoteText: { ...Typography.button, color: '#fff', fontSize: 13 },
})
