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
      <Text style={live.label}>LIVE</Text>
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

// ── Hotel card ────────────────────────────────────────────────────────────────
function HotelCard({ hotel, anim }: { hotel: Hotel; anim: Animated.Value }) {
  return (
    <Animated.View style={[hc.card, { transform: [{ translateX: anim }] }]}>
      <Text style={hc.badge}>RECOMMENDED</Text>
      <Text style={hc.name} numberOfLines={2}>{hotel.name}</Text>
      <Text style={hc.stars}>{'★'.repeat(hotel.stars)}{'☆'.repeat(5 - hotel.stars)}</Text>
      <Text style={hc.price}>€{hotel.price_per_night} <Text style={hc.perNight}>/ night</Text></Text>
      <View style={hc.amenities}>
        {hotel.amenities.slice(0, 3).map(a => (
          <Text key={a} style={hc.amenity}>· {a}</Text>
        ))}
      </View>
    </Animated.View>
  )
}

const hc = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 16,
    top: '32%',
    width: 190,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.cyanDim,
    borderRadius: 10,
    padding: 14,
  },
  badge:    { fontSize: 8, color: C.cyan, fontWeight: '700', letterSpacing: 1.8, marginBottom: 6 },
  name:     { fontSize: 14, color: C.white, fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  stars:    { fontSize: 11, color: '#FFD700', marginBottom: 6 },
  price:    { fontSize: 16, color: C.cyan, fontWeight: '700', marginBottom: 8 },
  perNight: { fontSize: 11, color: C.grey, fontWeight: '400' },
  amenities:{ gap: 3 },
  amenity:  { fontSize: 11, color: C.grey },
})

// ── Main VoiceHUD ─────────────────────────────────────────────────────────────
export interface VoiceHUDProps {
  transcript: TranscriptEntry[]
  agentTalking: boolean
  callStatus: CallStatus
  onEndCall: () => void
}

export function VoiceHUD({ transcript, agentTalking, callStatus, onEndCall }: VoiceHUDProps) {
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

  // Hotel card slide
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const hotelX = useRef(new Animated.Value(W)).current
  const hotelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slideInHotel = useCallback((h: Hotel) => {
    if (hotelTimer.current) clearTimeout(hotelTimer.current)
    setHotel(h)
    hotelX.setValue(W)
    Animated.spring(hotelX, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }).start()
    hotelTimer.current = setTimeout(() => {
      Animated.timing(hotelX, { toValue: W, duration: 450, useNativeDriver: true }).start()
    }, 6500)
  }, [hotelX])

  // Clean up hotel timer on unmount
  useEffect(() => () => { if (hotelTimer.current) clearTimeout(hotelTimer.current) }, [])

  // Active destination tracking
  const [destination, setDestination] = useState<Destination | null>(null)
  const lastDestId  = useRef<string | null>(null)
  const lastHotelId = useRef<string | null>(null)

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
      crossfadeTo(det.imageUrl)
    }

  }, [transcript, crossfadeTo, slideInHotel])

  // Displayed transcript text — last agent utterance, trimmed to 220 chars
  const lastAgentContent = [...transcript].reverse().find(e => e.role === 'agent')?.content ?? ''
  const displayText = lastAgentContent.length > 220
    ? '…' + lastAgentContent.slice(-217)
    : lastAgentContent

  const statusLabel = callStatus === 'connecting'
    ? 'CONNECTING…'
    : agentTalking ? 'BEA SPEAKING' : 'LISTENING'

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
              {destination ? 'DESTINATION IDENTIFIED' : 'BEA · AI TRAVEL GUIDE'}
            </Text>
            <Text style={s.destName}>
              {destination ? destination.name : 'Balkans Explorer'}
            </Text>
            {destination && (
              <>
                <Text style={s.destCountry}>{destination.country}</Text>
                <Text style={s.destTagline}>{destination.tagline}</Text>
              </>
            )}
          </View>
          <LiveDot />
        </View>

        {/* Hotel card */}
        {hotel && <HotelCard hotel={hotel} anim={hotelX} />}

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
              {callStatus === 'connecting' ? 'Starting call…' : 'Waiting for Bea…'}
            </Text>
          )}

          <TouchableOpacity style={s.endBtn} onPress={onEndCall} activeOpacity={0.8}>
            <Text style={s.endBtnText}>END CALL</Text>
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
