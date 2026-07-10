import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { findDestination, type Destination } from '../lib/destinations'
import type { Hotel } from '../lib/types'
import type { CallStatus, TranscriptEntry } from '../lib/voice'
import { useLang } from '../lib/i18n'

const { width: W } = Dimensions.get('window')

const C = {
  cyan:    '#00D4FF',
  cyanDim: 'rgba(0,212,255,0.25)',
  dark:    'rgba(0,0,0,0.68)',
  panel:   'rgba(4,12,20,0.82)',
  white:   '#FFFFFF',
  grey:    'rgba(255,255,255,0.65)',
}

// ── Corner brackets (Iron Man targeting reticle) ──────────────────────────────
function CornerBrackets() {
  return (
    <>
      <View style={[cb.corner, { top: 14, left: 14 }]}>
        <View style={[cb.horiz, { top: 0, left: 0 }]} />
        <View style={[cb.vert,  { top: 0, left: 0 }]} />
      </View>
      <View style={[cb.corner, { top: 14, right: 14 }]}>
        <View style={[cb.horiz, { top: 0, right: 0 }]} />
        <View style={[cb.vert,  { top: 0, right: 0 }]} />
      </View>
      <View style={[cb.corner, { bottom: 14, left: 14 }]}>
        <View style={[cb.horiz, { bottom: 0, left: 0 }]} />
        <View style={[cb.vert,  { bottom: 0, left: 0 }]} />
      </View>
      <View style={[cb.corner, { bottom: 14, right: 14 }]}>
        <View style={[cb.horiz, { bottom: 0, right: 0 }]} />
        <View style={[cb.vert,  { bottom: 0, right: 0 }]} />
      </View>
    </>
  )
}

const BLEN = 22
const BTHICK = 2.5

const cb = StyleSheet.create({
  corner: { position: 'absolute', width: BLEN, height: BLEN },
  horiz:  { position: 'absolute', height: BTHICK, width: BLEN, backgroundColor: C.cyan },
  vert:   { position: 'absolute', width: BTHICK,  height: BLEN, backgroundColor: C.cyan },
})

// ── Live indicator ────────────────────────────────────────────────────────────
function LiveDot() {
  const { t } = useLang()
  const blink = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [blink])

  return (
    <View style={live.row}>
      <Animated.View style={[live.dot, { opacity: blink }]} />
      <Text style={live.label}>{t.common.live}</Text>
    </View>
  )
}

const live = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B30' },
  label: { fontSize: 10, color: '#FF3B30', fontWeight: '800', letterSpacing: 1.5 },
})

// ── Voice waveform ────────────────────────────────────────────────────────────
const BAR_COUNT = 11

function Waveform({ active }: { active: boolean }) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, (_, i) =>
      new Animated.Value(i % 2 === 0 ? 0.12 : 0.08)
    )
  ).current

  useEffect(() => {
    if (active) {
      const loops = anims.map((a, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(a, {
              toValue: 0.18 + (i % 5) * 0.18,
              duration: 160 + i * 30,
              useNativeDriver: true,
            }),
            Animated.timing(a, {
              toValue: 0.08,
              duration: 160 + i * 30,
              useNativeDriver: true,
            }),
          ])
        )
      )
      loops.forEach(l => l.start())
      return () => loops.forEach(l => l.stop())
    } else {
      anims.forEach(a =>
        Animated.timing(a, { toValue: 0.08, duration: 350, useNativeDriver: true }).start()
      )
    }
  }, [active, anims])

  return (
    <View style={wv.row}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[wv.bar, { transform: [{ scaleY: a }] }]} />
      ))}
    </View>
  )
}

const wv = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 36 },
  bar: { width: 3.5, height: 36, borderRadius: 2, backgroundColor: C.cyan },
})


// ── Main VoiceHUD ─────────────────────────────────────────────────────────────
export interface VoiceHUDProps {
  transcript: TranscriptEntry[]
  agentTalking: boolean
  callStatus: CallStatus
  onEndCall: () => void
  // The hotel already known to be under discussion (e.g. a call started
  // from that hotel's review sheet) — always shown, no matching needed.
  hotel?: Hotel | null
  // Hotels the user has actually viewed this session — matched by name
  // against what Nea says, so the HUD can surface a hotel she brings up
  // mid-conversation even when one wasn't known up front.
  viewedHotels?: Hotel[]
  onViewHotel?: (hotel: Hotel) => void
}

export function VoiceHUD({ transcript, agentTalking, callStatus, onEndCall, hotel, viewedHotels, onViewHotel }: VoiceHUDProps) {
  const { t } = useLang()
  const isActive = callStatus === 'active' || callStatus === 'connecting'
  const [modalVisible, setModalVisible] = useState(false)

  // Fade in/out
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (isActive) {
      setModalVisible(true)
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => setModalVisible(false)
      )
    }
  }, [isActive, opacity])

  // Background crossfade — two image slots
  const [imgA, setImgA] = useState<string | null>(null)
  const [imgB, setImgB] = useState<string | null>(null)
  const opA = useRef(new Animated.Value(0)).current
  const opB = useRef(new Animated.Value(0)).current
  const slot = useRef<'A' | 'B'>('A')

  const crossfadeTo = useCallback((url: string) => {
    if (slot.current === 'A') {
      setImgB(url)
      Animated.parallel([
        Animated.timing(opA, { toValue: 0, duration: 900, useNativeDriver: true }),
        Animated.timing(opB, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]).start(() => { slot.current = 'B' })
    } else {
      setImgA(url)
      Animated.parallel([
        Animated.timing(opB, { toValue: 0, duration: 900, useNativeDriver: true }),
        Animated.timing(opA, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]).start(() => { slot.current = 'A' })
    }
  }, [opA, opB])

  // Hotel context — either passed in directly (the hotel review sheet
  // always knows which hotel is under discussion) or matched from the
  // transcript against hotels the user has actually viewed this session.
  const [matchedHotel, setMatchedHotel] = useState<Hotel | null>(hotel ?? null)
  const hotelImgIndex = useRef(0)
  const hotelImgTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Active destination tracking
  const [destination, setDestination] = useState<Destination | null>(null)
  const lastDestId  = useRef<string | null>(null)
  const lastHotelId = useRef<string | null>(null)

  useEffect(() => {
    if (hotel) {
      lastHotelId.current = hotel.hotel_id
      setMatchedHotel(hotel)
    }
  }, [hotel])

  // Cycle through the active hotel's photos in the background while it's
  // the focus of the conversation.
  useEffect(() => {
    if (hotelImgTimer.current) { clearInterval(hotelImgTimer.current); hotelImgTimer.current = null }
    if (!matchedHotel || matchedHotel.images.length === 0) return
    hotelImgIndex.current = 0
    crossfadeTo(matchedHotel.images[0])
    if (matchedHotel.images.length > 1) {
      hotelImgTimer.current = setInterval(() => {
        hotelImgIndex.current = (hotelImgIndex.current + 1) % matchedHotel.images.length
        crossfadeTo(matchedHotel.images[hotelImgIndex.current])
      }, 6000)
    }
    return () => { if (hotelImgTimer.current) clearInterval(hotelImgTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedHotel?.hotel_id])

  // Transcript entity detection
  useEffect(() => {
    if (!transcript.length) return
    const lastAgent = [...transcript].reverse().find(e => e.role === 'agent')
    if (!lastAgent) return
    const text = lastAgent.content

    const det = findDestination(text)
    if (det && det.id !== lastDestId.current) {
      lastDestId.current = det.id
      setDestination(det)
      if (!matchedHotel) crossfadeTo(det.imageUrl)
    }

    if (!hotel && viewedHotels && viewedHotels.length > 0) {
      const lower = text.toLowerCase()
      const match = viewedHotels.find(h => lower.includes(h.name.toLowerCase()))
      if (match && match.hotel_id !== lastHotelId.current) {
        lastHotelId.current = match.hotel_id
        setMatchedHotel(match)
      }
    }
  }, [transcript, crossfadeTo, hotel, viewedHotels, matchedHotel])

  // Displayed transcript text — last agent utterance, trimmed to 220 chars
  const lastAgentContent = [...transcript].reverse().find(e => e.role === 'agent')?.content ?? ''
  const displayText = lastAgentContent.length > 220
    ? '…' + lastAgentContent.slice(-217)
    : lastAgentContent

  const statusLabel = callStatus === 'connecting'
    ? 'CONNECTING…'
    : agentTalking ? 'NEA SPEAKING' : 'LISTENING'

  return (
    <Modal visible={modalVisible} transparent statusBarTranslucent animationType="none">
      <Animated.View style={[s.hud, { opacity }]}>
        {/* Background images */}
        {imgA && (
          <Animated.Image source={{ uri: imgA }} style={[StyleSheet.absoluteFill, { opacity: opA }]} resizeMode="cover" />
        )}
        {imgB && (
          <Animated.Image source={{ uri: imgB }} style={[StyleSheet.absoluteFill, { opacity: opB }]} resizeMode="cover" />
        )}
        {/* Dark overlay */}
        <View style={[StyleSheet.absoluteFill, s.overlay]} />

        {/* Corner brackets */}
        <CornerBrackets />

        {/* Top info bar */}
        <View style={s.topBar}>
          <View style={s.destBlock}>
            <Text style={s.scanLabel}>
              {matchedHotel ? 'NOW VIEWING' : destination ? 'DESTINATION IDENTIFIED' : 'NEA · AI TRAVEL GUIDE'}
            </Text>
            <Text style={s.destName} numberOfLines={2}>
              {matchedHotel ? matchedHotel.name : destination ? destination.name : 'Balkans Explorer'}
            </Text>
            {!matchedHotel && destination && (
              <>
                <Text style={s.destCountry}>{destination.country}</Text>
                <Text style={s.destTagline}>{destination.tagline}</Text>
              </>
            )}
          </View>
          <LiveDot />
        </View>

        {/* View & book the hotel currently under discussion */}
        {matchedHotel && onViewHotel && (
          <TouchableOpacity
            style={s.hotelBtn}
            activeOpacity={0.85}
            onPress={() => onViewHotel(matchedHotel)}
          >
            <Text style={s.hotelBtnText}>View & Book →</Text>
          </TouchableOpacity>
        )}

        {/* Bottom panel — waveform + transcript + end call */}
        <View style={s.bottomPanel}>
          <View style={s.waveRow}>
            <Waveform active={agentTalking} />
            <Text style={s.statusLabel}>{statusLabel}</Text>
          </View>

          {displayText ? (
            <Text style={s.transcript} numberOfLines={4}>{displayText}</Text>
          ) : (
            <Text style={s.transcriptPlaceholder}>
              {callStatus === 'connecting' ? 'Starting call…' : 'Waiting for Nea…'}
            </Text>
          )}

          <TouchableOpacity style={s.endBtn} onPress={onEndCall} activeOpacity={0.8}>
            <Text style={s.endBtnText}>{t.common.endCall}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  hud: {
    flex: 1,
    backgroundColor: '#0A0F1A',
  },
  overlay: {
    backgroundColor: 'rgba(4,10,20,0.55)',
  },

  // Top
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  destBlock: {
    flex: 1,
    marginRight: 12,
  },
  scanLabel: {
    fontSize: 9,
    color: C.cyan,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  destName: {
    fontSize: 32,
    color: C.white,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 2,
  },
  destCountry: {
    fontSize: 13,
    color: C.grey,
    fontWeight: '500',
    marginBottom: 4,
  },
  destTagline: {
    fontSize: 12,
    color: C.cyan,
    fontStyle: 'italic',
  },
  hotelBtn: {
    alignSelf: 'flex-start',
    marginLeft: 24,
    marginTop: 4,
    backgroundColor: C.cyan,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hotelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#04141F',
    letterSpacing: 0.3,
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.panel,
    borderTopWidth: 1,
    borderTopColor: C.cyanDim,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusLabel: {
    fontSize: 10,
    color: C.cyan,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  transcript: {
    fontSize: 15,
    color: C.white,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  transcriptPlaceholder: {
    fontSize: 14,
    color: C.grey,
    fontStyle: 'italic',
  },
  endBtn: {
    alignSelf: 'center',
    marginTop: 4,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  endBtnText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '800',
    letterSpacing: 2,
  },
})
