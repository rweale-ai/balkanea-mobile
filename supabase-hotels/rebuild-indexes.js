'use strict';
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.argv[2] });
  await c.connect();
  await c.query('set statement_timeout = 0');

  const steps = [
    ['create index if not exists idx_hotels_region on hotels(region_id)', 'idx_hotels_region'],
    ['create index if not exists idx_hotels_kind on hotels(kind)', 'idx_hotels_kind'],
    ['create index if not exists idx_rooms_hotel on rooms(hotel_hid)', 'idx_rooms_hotel'],
    ['create index if not exists idx_hotels_star_rating_name on hotels (star_rating desc nulls last, name)', 'idx_hotels_star_rating_name'],
    ['create index if not exists idx_hotels_region_name_lower on hotels (lower(region_name))', 'idx_hotels_region_name_lower'],
    [
      "alter table rooms add constraint fk_rooms_hotel foreign key (country_code, hotel_hid) references hotels(country_code, hid) on delete cascade not valid",
      'fk_rooms_hotel (added NOT VALID)',
    ],
    ['alter table rooms validate constraint fk_rooms_hotel', 'fk_rooms_hotel (validated)'],
    ['create index if not exists idx_hotels_amenity_groups_gin on hotels using gin (amenity_groups)', 'idx_hotels_amenity_groups_gin (GIN, last -- most expensive)'],
  ];

  for (const [sql, label] of steps) {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] starting: ${label}`);
    await c.query(sql);
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] done: ${label} (${secs}s)`);
  }

  const idx = await c.query(`
    select indexname from pg_indexes where tablename in ('hotels', 'rooms')
    order by indexname
  `);
  console.log('\nFinal indexes on hotels/rooms (parent tables):');
  idx.rows.forEach((r) => console.log('  ' + r.indexname));

  const fk = await c.query(`
    select conname, convalidated from pg_constraint where conname = 'fk_rooms_hotel'
  `);
  console.log('\nFK status:', fk.rows[0]);

  console.log('\nALL DONE');
  await c.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
