const BACKEND_URL = 'https://balkanea-lead-webhook.vercel.app'

interface LeadData {
  first_name?: string
  last_name?: string
  full_name?: string
  email: string
  phone?: string
  destination?: string
  checkin?: string
  checkout?: string
  guests?: number
  adults?: number
  children?: number
  rooms?: number
  budget?: string
  trip_type?: string
  notes?: string
  message?: string
  description?: string
}

interface EscalationData {
  customerName: string
  customerPhone: string
  customerEmail: string
  reason: string
  conversationSummary: string
  destination?: string
}

export async function createSalesforceLead(data: LeadData): Promise<{ success: boolean; lead_id?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/create-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        LeadSource: 'Mobile App',
      }),
    })

    if (res.ok) {
      const result = await res.json()
      return { success: result.success, lead_id: result.lead_id }
    }
    return { success: false }
  } catch (e) {
    console.error('Salesforce lead creation failed:', e)
    return { success: false }
  }
}

export async function createEscalation(data: EscalationData): Promise<{ success: boolean }> {
  try {
    const leadData: LeadData = {
      full_name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
      description: `AGENT ESCALATION: ${data.reason}`,
      notes: data.conversationSummary,
      destination: data.destination,
    }

    return createSalesforceLead(leadData)
  } catch (e) {
    console.error('Escalation creation failed:', e)
    return { success: false }
  }
}

export async function syncBookingToSalesforce(booking: {
  guestName: string
  guestEmail: string
  guestPhone: string
  hotelName: string
  destination: string
  checkin: string
  checkout: string
  totalPrice: number
  currency: string
  confirmationCode: string
}): Promise<{ success: boolean }> {
  try {
    const leadData: LeadData = {
      full_name: booking.guestName,
      email: booking.guestEmail,
      phone: booking.guestPhone,
      destination: booking.destination,
      checkin: booking.checkin,
      checkout: booking.checkout,
      description: `BOOKING CONFIRMED: ${booking.hotelName} | ${booking.confirmationCode} | ${booking.currency} ${booking.totalPrice}`,
    }

    return createSalesforceLead(leadData)
  } catch (e) {
    console.error('Booking sync failed:', e)
    return { success: false }
  }
}
