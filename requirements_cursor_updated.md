# Police Officer Management System — Cursor Ready Requirements Document

## 1. Project Overview

Build a web-based management system for organizing police officers, divisions, schedules, and route allocations.

The system must support:

1. Supabase authentication.
2. Admin-only user management.
3. Division management.
4. Officer management with search and filters.
5. Schedule management.
6. Route allocation using Google Maps.
7. A public/configurable JSON endpoint that returns dashboard screen configuration generated from the saved route allocations.

The application will be built using React.js, Supabase, and Vercel.

---

## 2. Supabase Project Details

Use this Supabase project URL:

```env
VITE_SUPABASE_URL=https://fpbctyngeaqmihgzjtlk.supabase.co
```

The Supabase anon key must be added manually in `.env` and Vercel environment variables.

```env
VITE_SUPABASE_ANON_KEY=replace_with_supabase_anon_key
```

Do not hardcode Supabase keys in source code.


### GitHub Repository

Use this GitHub repository as the main source repository:

```txt
https://github.com/HimeshLK/N_police_MonitoringApp.git
```

Repository and deployment rules:

- Vercel must be connected to this GitHub repository.
- Use the `main` branch for production deployment unless another deployment branch is intentionally configured.
- Enable automatic deployments from GitHub to Vercel.
- Do not commit `.env`, Supabase keys, Google Maps API keys, service role keys, or other secrets.
- Commit `.env.example` with placeholder values only.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js with Vite |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Maps | Google Maps JavaScript API |
| Location Search | Google Places API or Geocoding API |
| Config Endpoint | Vercel serverless API route or Supabase Edge Function |

Preferred implementation:

- Use React + Vite for the frontend.
- Use Supabase client for authenticated CRUD screens.
- Use a backend API route for config generation so API keys and transformation logic are not exposed unnecessarily.
- Use environment variables for all sensitive values.

---

## 4. Environment Variables

Create `.env.example` with the following:

```env
VITE_SUPABASE_URL=https://fpbctyngeaqmihgzjtlk.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=

# Optional server-side variables if using Vercel serverless functions
SUPABASE_URL=https://fpbctyngeaqmihgzjtlk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_MAPS_API_KEY=
CONFIG_API_KEY=
```

Rules:

- `VITE_GOOGLE_MAPS_API_KEY` can be used in the browser only if the key is restricted by domain in Google Cloud Console.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the frontend.
- `CONFIG_API_KEY` is optional and can be used to protect the config endpoint.

---

## 5. Database Schema

Enable the `pgcrypto` extension first:

```sql
create extension if not exists "pgcrypto";
```

---

### 5.1 Table: `divisions`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `district` | text | NOT NULL |
| `created_at` | timestamptz | default `now()` |

SQL:

```sql
create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  created_at timestamptz not null default now()
);
```

---

### 5.2 Table: `officers`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `phone_mob` | text | NOT NULL |
| `phone_office` | text | nullable |
| `rank` | text | NOT NULL |
| `division_id` | uuid | FK → `divisions.id` |
| `created_at` | timestamptz | default `now()` |

SQL:

```sql
create table if not exists public.officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_mob text not null,
  phone_office text,
  rank text not null,
  division_id uuid references public.divisions(id) on delete restrict,
  created_at timestamptz not null default now()
);
```

---

### 5.3 Table: `schedules`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `start_time` | timestamptz | NOT NULL |
| `end_time` | timestamptz | NOT NULL |
| `created_at` | timestamptz | default `now()` |

Rules:

- `end_time` must be greater than `start_time`.
- The UI must show schedule time in a human-readable format such as `06:00 AM`.
- The config endpoint must calculate schedule duration in milliseconds.

SQL:

```sql
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  constraint schedules_end_after_start check (end_time > start_time)
);
```

---

### 5.4 Table: `route_allocations`

Important: `start_location` and `end_location` must not be treated as random text only. They represent the start coordinates and end coordinates of a road/route section.

The system must store explicit latitude and longitude values for both start and end points.

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `schedule_id` | uuid | FK → `schedules.id` |
| `screen_id` | text | required, unique screen identifier such as `001` |
| `title` | text | required dashboard screen title |
| `description` | text | optional description |
| `location_name` | text | required location name, example `colombo` |
| `start_lat` | double precision | NOT NULL, between -90 and 90 |
| `start_lng` | double precision | NOT NULL, between -180 and 180 |
| `end_lat` | double precision | NOT NULL, between -90 and 90 |
| `end_lng` | double precision | NOT NULL, between -180 and 180 |
| `start_label` | text | optional display label/address from Google Maps |
| `end_label` | text | optional display label/address from Google Maps |
| `center_lat` | double precision | NOT NULL, calculated midpoint latitude |
| `center_lng` | double precision | NOT NULL, calculated midpoint longitude |
| `zoom_level` | integer | NOT NULL, default 15, range 1–20 |
| `enabled` | boolean | NOT NULL, default true |
| `map_params` | jsonb | optional, default `[]` |
| `update_frequency_ms` | integer | NOT NULL, default 18000 |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

SQL:

```sql
create table if not exists public.route_allocations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete restrict,
  screen_id text not null unique,
  title text not null,
  description text,
  location_name text not null default 'colombo',

  start_lat double precision not null,
  start_lng double precision not null,
  end_lat double precision not null,
  end_lng double precision not null,

  start_label text,
  end_label text,

  center_lat double precision not null,
  center_lng double precision not null,

  zoom_level integer not null default 15,
  enabled boolean not null default true,
  map_params jsonb not null default '[]'::jsonb,
  update_frequency_ms integer not null default 18000,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint route_start_lat_range check (start_lat between -90 and 90),
  constraint route_end_lat_range check (end_lat between -90 and 90),
  constraint route_start_lng_range check (start_lng between -180 and 180),
  constraint route_end_lng_range check (end_lng between -180 and 180),
  constraint route_center_lat_range check (center_lat between -90 and 90),
  constraint route_center_lng_range check (center_lng between -180 and 180),
  constraint route_zoom_level_range check (zoom_level between 1 and 20),
  constraint route_update_frequency_positive check (update_frequency_ms > 0)
);
```

Create indexes:

```sql
create index if not exists idx_route_allocations_schedule_id
on public.route_allocations(schedule_id);

create index if not exists idx_route_allocations_enabled
on public.route_allocations(enabled);

create index if not exists idx_route_allocations_location_name
on public.route_allocations(location_name);
```

---

### 5.5 Table: `profiles`

Supabase Auth manages `auth.users`. Use `profiles` for application-level user details.

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users.id` |
| `full_name` | text | nullable |
| `role` | text | `admin` or `viewer` |
| `created_at` | timestamptz | default `now()` |

SQL:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'viewer'))
);
```

---

## 6. Route Location and Google Maps Requirements

### 6.1 Route Input Behaviour

When adding or editing a route allocation, the user must be able to set the start and end points using Google Maps.

Supported methods:

1. Click on map to pick start coordinate.
2. Click on map to pick end coordinate.
3. Search a place/address using Google Places or Geocoding API.
4. Manually enter coordinates in `lat,lng` format.

The UI must show:

- Start latitude.
- Start longitude.
- End latitude.
- End longitude.
- Optional start label/address.
- Optional end label/address.
- Automatically calculated center latitude and longitude.
- Zoom level.
- Map preview showing start marker, end marker, route/line, and center point.

---

### 6.2 Coordinate Validation

Coordinate values must be valid numbers.

Validation rules:

```txt
start_lat: required, number, -90 <= value <= 90
start_lng: required, number, -180 <= value <= 180
end_lat: required, number, -90 <= value <= 90
end_lng: required, number, -180 <= value <= 180
zoom_level: required, integer, 1 <= value <= 20
update_frequency_ms: required, integer, value > 0
```

Do not save the route allocation if any coordinate is missing or invalid.

---

### 6.3 Midpoint Calculation

After selecting or entering the start and end coordinates, calculate the midpoint.

Use the simple midpoint formula:

```ts
centerLat = (startLat + endLat) / 2;
centerLng = (startLng + endLng) / 2;
```

Store the calculated midpoint in:

```txt
center_lat
center_lng
```

Use this midpoint as the map center in the generated config endpoint.

For this project, the simple midpoint formula is acceptable because the selected road sections are expected to be short city-level sections.

---

### 6.4 Google Maps Display Rules

The route allocation map must:

- Load Google Maps using `VITE_GOOGLE_MAPS_API_KEY`.
- Allow users to place a start marker and an end marker.
- Draw a line between the start and end marker.
- Recalculate the center marker immediately when either point changes.
- Allow zoom level selection from 1 to 20.
- Default zoom level must be 15.
- Save only the coordinates and optional labels to Supabase.

---

## 7. Config Endpoint Requirement

Create an endpoint that returns dashboard configuration JSON.

The endpoint must generate the response from Supabase data by joining:

```txt
route_allocations + schedules
```

Recommended endpoint path:

```txt
GET /api/config/:configName
```

Alternative acceptable path:

```txt
GET /api/dashboard-config?configName=cmb_pilot_config
```

The endpoint must return only enabled route allocations by default.

Optional query parameters:

| Query Param | Required | Description |
|---|---|---|
| `configName` | yes if using query endpoint | Config name to return |
| `location` | no | Filter by `route_allocations.location_name` |
| `includeDisabled` | no | If `true`, return disabled screens too |

---

## 8. Config Metadata

Create a table to store reusable config-level metadata.

### Table: `dashboard_configs`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `config_name` | text | required, unique |
| `app_name` | text | required |
| `config_version` | text | required |
| `location` | text | required |
| `api_key` | text | optional, nullable |
| `enabled` | boolean | default true |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

Rules:

- `config_name` must be unique.
- `config_version` must be unique per config name.
- `api_key` is optional.
- If `api_key` is empty, return an empty string in the config response.
- Do not expose private server-side keys.

SQL:

```sql
create table if not exists public.dashboard_configs (
  id uuid primary key default gen_random_uuid(),
  config_name text not null unique,
  app_name text not null,
  config_version text not null,
  location text not null,
  api_key text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_config_name_not_empty check (length(trim(config_name)) > 0),
  constraint dashboard_app_name_not_empty check (length(trim(app_name)) > 0),
  constraint dashboard_config_version_not_empty check (length(trim(config_version)) > 0),
  constraint dashboard_config_location_not_empty check (length(trim(location)) > 0)
);

create unique index if not exists idx_dashboard_configs_name_version
on public.dashboard_configs(config_name, config_version);
```

Seed example:

```sql
insert into public.dashboard_configs (
  config_name,
  app_name,
  config_version,
  location,
  api_key,
  enabled
)
values (
  'cmb_pilot_config',
  'sl_dashboard',
  '0.01v',
  'colombo',
  '',
  true
)
on conflict (config_name) do nothing;
```

---

## 9. Required Config Endpoint Output

The endpoint must return JSON in the following structure:

```json
{
  "configName": "cmb_pilot_config",
  "appName": "sl_dashboard",
  "configVersion": "0.01v",
  "location": "colombo",
  "apiKey": "",
  "screens": [
    {
      "screenId": "001",
      "title": "Pilot Traffic Viewer-Colombo 01",
      "description": "Test Screen",
      "schedule": {
        "start": "06:00 AM",
        "end": "12:00 PM",
        "millis": 21600000
      },
      "enabled": true,
      "mapConfig": {
        "lat": 6.927079,
        "lng": 79.861244,
        "zoom": 15,
        "params": [],
        "updateFrequency": 18000
      }
    }
  ]
}
```

Important correction:

- The field name `millis` means milliseconds.
- For a 6-hour schedule duration, the value must be `21600000`, not `21600`.
- `21600` is seconds. Returning it inside a field named `millis` is wrong and will confuse the consuming dashboard.

If the consuming dashboard already expects `21600`, then rename the field to `seconds`. Otherwise keep `millis` and return milliseconds correctly.

---

## 10. Config Mapping Rules

Map database fields to response fields as follows:

| Response Field | Source |
|---|---|
| `configName` | `dashboard_configs.config_name` |
| `appName` | `dashboard_configs.app_name` |
| `configVersion` | `dashboard_configs.config_version` |
| `location` | `dashboard_configs.location` |
| `apiKey` | `dashboard_configs.api_key` or empty string |
| `screens[].screenId` | `route_allocations.screen_id` |
| `screens[].title` | `route_allocations.title` |
| `screens[].description` | `route_allocations.description` or empty string |
| `screens[].schedule.start` | formatted `schedules.start_time` |
| `screens[].schedule.end` | formatted `schedules.end_time` |
| `screens[].schedule.millis` | `schedules.end_time - schedules.start_time` in milliseconds |
| `screens[].enabled` | `route_allocations.enabled` |
| `screens[].mapConfig.lat` | `route_allocations.center_lat` |
| `screens[].mapConfig.lng` | `route_allocations.center_lng` |
| `screens[].mapConfig.zoom` | `route_allocations.zoom_level` |
| `screens[].mapConfig.params` | `route_allocations.map_params` |
| `screens[].mapConfig.updateFrequency` | `route_allocations.update_frequency_ms` |

---

## 11. Example Config Endpoint Logic

Use this logic when generating the config:

```ts
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function durationMillis(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

function calculateCenter(startLat: number, startLng: number, endLat: number, endLng: number) {
  return {
    lat: (startLat + endLat) / 2,
    lng: (startLng + endLng) / 2,
  };
}
```

Endpoint behaviour:

1. Read config by `configName`.
2. If config does not exist, return 404.
3. Read route allocations for the config location.
4. Join schedules.
5. Exclude disabled route allocations unless `includeDisabled=true`.
6. Build the JSON response.
7. Return response with HTTP 200.

---

## 12. API Error Responses

Use consistent error responses.

### Config not found

```json
{
  "error": "CONFIG_NOT_FOUND",
  "message": "Dashboard config was not found."
}
```

### No screens found

Return HTTP 200 with an empty screens array:

```json
{
  "configName": "cmb_pilot_config",
  "appName": "sl_dashboard",
  "configVersion": "0.01v",
  "location": "colombo",
  "apiKey": "",
  "screens": []
}
```

### Server error

```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Unable to generate dashboard config."
}
```

---

## 13. Authentication and Authorization

### Frontend App

- Login page with email/password using Supabase Auth.
- Protected routes.
- Logout functionality.
- Admin-only pages must check profile role.

### Config Endpoint

Recommended:

- The config endpoint can be public read-only if it does not expose sensitive data.
- If protection is required, use `CONFIG_API_KEY` and require this header:

```txt
x-config-api-key: your_config_api_key
```

Do not require normal Supabase user login for the external dashboard config endpoint unless the consuming dashboard can send Supabase JWT tokens.

---

## 14. Row Level Security Requirements

Enable RLS:

```sql
alter table public.divisions enable row level security;
alter table public.officers enable row level security;
alter table public.schedules enable row level security;
alter table public.route_allocations enable row level security;
alter table public.profiles enable row level security;
alter table public.dashboard_configs enable row level security;
```

Basic policy requirements:

- Authenticated users can read divisions, officers, schedules, route allocations, and dashboard configs.
- Admin users can insert/update/delete records.
- Viewers can only read.

Cursor must implement helper SQL functions or policies to check admin role using `profiles.role`.

---

## 15. Modules and Features

### 15.1 Authentication

- Login page with email/password.
- Protected routes.
- Logout button.
- Redirect unauthenticated users to `/login`.

---

### 15.2 User Management

Accessible by admin role only.

Features:

- Add user with email, password, full name, and role.
- Edit user profile name and role.
- Delete user.
- View all users.

Important:

- Creating/deleting Supabase Auth users requires server-side service role access.
- Do not attempt to create/delete auth users directly from the browser using the anon key.

---

### 15.3 Division Management

Features:

- Add division.
- Edit division.
- Delete division with confirmation.
- Prevent deletion if officers are linked.
- View divisions with officer count.

---

### 15.4 Officer Management

Features:

- Add officer.
- Edit officer.
- Delete officer.
- Assign officer to division.
- View paginated officer list.
- Search/filter officers by division, rank, name, and phone.

Search rules:

- Name search must support partial matching.
- Phone search must search both mobile and office phone.
- Division and rank filters must be exact matching.

---

### 15.5 Schedule Management

Features:

- Add schedule.
- Edit schedule.
- Delete schedule.
- Prevent deletion if linked route allocations exist.
- View schedules sorted by start time.
- Show computed duration.

---

### 15.6 Route Allocation Management

Features:

- Add route allocation.
- Edit route allocation.
- Delete route allocation.
- Select linked schedule.
- Set screen ID.
- Set dashboard title.
- Set optional description.
- Set location name.
- Pick start and end coordinates using Google Maps.
- Automatically calculate midpoint.
- Set zoom level.
- Set update frequency in milliseconds.
- Enable/disable route screen.
- Preview route on map.

---

### 15.7 Dashboard Config Management

Add a simple admin page for dashboard configs.

Route:

```txt
/configs
/configs/new
/configs/:id/edit
```

Fields:

- Config name.
- App name.
- Config version.
- Location.
- Optional API key.
- Enabled flag.

Validation:

- Config name required and unique.
- App name required.
- Config version required.
- Location required.

---

## 16. Page / Route Structure

```txt
/login                        → Login page
/dashboard                    → Overview / summary cards

/users                        → List all users
/users/new                    → Add user
/users/:id/edit               → Edit user

/divisions                    → List divisions
/divisions/new                → Add division
/divisions/:id/edit           → Edit division

/officers                     → List + search officers
/officers/new                 → Add officer
/officers/:id/edit            → Edit officer

/schedules                    → List schedules
/schedules/new                → Add schedule
/schedules/:id/edit           → Edit schedule

/routes                       → List route allocations
/routes/new                   → Add route allocation
/routes/:id/edit              → Edit route allocation

/configs                      → List dashboard configs
/configs/new                  → Add dashboard config
/configs/:id/edit             → Edit dashboard config

/api/config/:configName        → Generated dashboard config JSON endpoint
```

---

## 17. React Project Structure

```txt
src/
├── api/
│   ├── supabase.ts
│   ├── configApi.ts
│   ├── divisionsApi.ts
│   ├── officersApi.ts
│   ├── schedulesApi.ts
│   └── routesApi.ts
├── components/
│   ├── Layout/
│   ├── ProtectedRoute/
│   ├── RoleGuard/
│   ├── MapPicker/
│   ├── RoutePreviewMap/
│   ├── DataTable/
│   └── shared/
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Users/
│   ├── Divisions/
│   ├── Officers/
│   ├── Schedules/
│   ├── Routes/
│   └── Configs/
├── hooks/
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useOfficers.ts
│   ├── useDivisions.ts
│   ├── useSchedules.ts
│   ├── useRoutes.ts
│   └── useConfigs.ts
├── context/
│   └── AuthContext.tsx
├── utils/
│   ├── coordinates.ts
│   ├── formatTime.ts
│   └── validation.ts
└── App.tsx
```

If using Vercel serverless functions, create:

```txt
api/
└── config/
    └── [configName].ts
```

---

## 18. Coordinate Utility Requirements

Create `src/utils/coordinates.ts`.

Required functions:

```ts
export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function calculateMidpoint(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): { lat: number; lng: number } {
  return {
    lat: (startLat + endLat) / 2,
    lng: (startLng + endLng) / 2,
  };
}

export function parseLatLng(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 2) return null;

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);

  if (!isValidLat(lat) || !isValidLng(lng)) return null;

  return { lat, lng };
}
```

---

## 19. Officer Search Technical Note

Use Supabase `.ilike()` and `.eq()` filters.

```ts
let query = supabase
  .from('officers')
  .select('*, divisions(name, district)');

if (divisionId) query = query.eq('division_id', divisionId);
if (rank) query = query.eq('rank', rank);
if (name) query = query.ilike('name', `%${name}%`);
if (phone) {
  query = query.or(`phone_mob.ilike.%${phone}%,phone_office.ilike.%${phone}%`);
}

const { data, error } = await query;
```

---

## 20. Supabase Setup Checklist

- [ ] Create Supabase project.
- [ ] Use Supabase URL: `https://fpbctyngeaqmihgzjtlk.supabase.co`.
- [ ] Enable email/password auth.
- [ ] Run SQL migrations.
- [ ] Create seed dashboard config: `cmb_pilot_config`.
- [ ] Enable RLS on all public tables.
- [ ] Add read policies for authenticated users.
- [ ] Add write policies for admin users.
- [ ] Add required indexes.
- [ ] Add environment variables locally.
- [ ] Add environment variables in Vercel.

---

## 21. Vercel Deployment Checklist

- [ ] Connect GitHub repo to Vercel: `https://github.com/HimeshLK/N_police_MonitoringApp.git`.
- [ ] Set build command: `npm run build`.
- [ ] Set output directory: `dist`.
- [ ] Add environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GOOGLE_MAPS_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` if needed by serverless functions
  - `GOOGLE_MAPS_API_KEY` if needed server-side
  - `CONFIG_API_KEY` if protecting config endpoint
- [ ] Enable automatic deploys from `main`.

---

## 22. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Responsiveness | Must work on desktop, tablet, and mobile |
| Security | Supabase RLS must be enforced |
| API Key Safety | Do not expose service role key or unrestricted Google Maps key |
| Performance | Paginate large tables and lazy-load maps |
| Validation | Validate all forms before saving |
| Error Handling | Show toast notifications for success and failure |
| Accessibility | Forms must have labels and keyboard navigation |
| Maintainability | Use reusable components and clean folder structure |
| Config Stability | Config endpoint must return predictable JSON shape |

---

## 23. Acceptance Criteria

The implementation is complete only when all criteria below are satisfied.

### Authentication

- [ ] User can log in.
- [ ] User can log out.
- [ ] Protected pages cannot be accessed without login.

### CRUD Modules

- [ ] Admin can create, edit, delete, and view divisions.
- [ ] Admin can create, edit, delete, and view officers.
- [ ] Admin can create, edit, delete, and view schedules.
- [ ] Admin can create, edit, delete, and view route allocations.
- [ ] Admin can create, edit, delete, and view dashboard configs.

### Route Allocation

- [ ] User can select start point on Google Map.
- [ ] User can select end point on Google Map.
- [ ] User can search locations using Google Maps search.
- [ ] User can manually enter coordinates.
- [ ] System validates coordinates.
- [ ] System calculates midpoint automatically.
- [ ] System saves midpoint to Supabase.
- [ ] Route preview shows start marker, end marker, line, and center point.

### Config Endpoint

- [ ] `GET /api/config/cmb_pilot_config` returns JSON.
- [ ] JSON contains `configName`, `appName`, `configVersion`, `location`, `apiKey`, and `screens`.
- [ ] Each screen contains `screenId`, `title`, `description`, `schedule`, `enabled`, and `mapConfig`.
- [ ] `mapConfig.lat` and `mapConfig.lng` are generated from route midpoint.
- [ ] `schedule.millis` returns duration in milliseconds.
- [ ] Disabled screens are excluded unless explicitly requested.
- [ ] Empty screens return an empty array, not an error.

---

## 24. Cursor Implementation Instruction

Use this document as the source of truth.

Build the project cleanly and avoid shortcut/hardcoded implementations.

Implementation order:

1. Set up React + Vite project.
2. Configure Supabase client.
3. Add database SQL migration files.
4. Implement auth flow.
5. Implement layouts and protected routes.
6. Implement CRUD modules.
7. Implement Google Maps route picker.
8. Implement midpoint calculation and coordinate validation.
9. Implement dashboard config CRUD.
10. Implement config JSON endpoint.
11. Add loading states, error handling, and toast notifications.
12. Test full route allocation → config endpoint flow.

Do not proceed with mock data as the final solution. The final app must use Supabase data.
