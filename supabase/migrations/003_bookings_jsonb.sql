-- Add full hotel/room JSON to bookings so the app can reconstruct the Booking type
-- Run in Supabase SQL Editor after 001_initial_schema.sql

alter table public.bookings
  add column if not exists hotel_data jsonb,
  add column if not exists room_data jsonb;
