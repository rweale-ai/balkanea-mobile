import React from 'react'
import { Text, Linking, TextStyle, StyleProp } from 'react-native'
import { Colors } from '../../constants/theme'

interface Props {
  text: string
  style?: StyleProp<TextStyle>
  linkStyle?: StyleProp<TextStyle>
  trailing?: React.ReactNode
}

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
const BOLD_RE = /\*\*([^*]+)\*\*/g

type Segment = { kind: 'text'; value: string } | { kind: 'link'; value: string; url: string } | { kind: 'bold'; value: string }

// Parses Nea's replies for [text](url) links and defensively strips stray
// **bold** markers (the system prompt asks for emoji instead of bold, but
// this is a safety net in case the model still emits markdown asterisks).
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  const combined = new RegExp(`${LINK_RE.source}|${BOLD_RE.source}`, 'g')
  let match: RegExpExecArray | null
  while ((match = combined.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      segments.push({ kind: 'link', value: match[1], url: match[2] })
    } else if (match[3] !== undefined) {
      segments.push({ kind: 'bold', value: match[3] })
    }
    lastIndex = combined.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

export function FormattedText({ text, style, linkStyle, trailing }: Props) {
  const segments = parseSegments(text)

  return (
    <Text style={style}>
      {segments.map((seg, i) => {
        if (seg.kind === 'link') {
          return (
            <Text
              key={i}
              style={linkStyle ?? { color: Colors.primary, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(seg.url).catch(() => {})}
            >
              {seg.value}
            </Text>
          )
        }
        if (seg.kind === 'bold') {
          return (
            <Text key={i} style={{ fontWeight: '700' }}>
              {seg.value}
            </Text>
          )
        }
        return <Text key={i}>{seg.value}</Text>
      })}
      {trailing}
    </Text>
  )
}
