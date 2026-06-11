# Example: Custom archetype — law firm

Demonstrates the Custom branch: industry-specific language, two-board compose-from-primitives, high-touch pipeline as groups.

---

**User:** set up my CRM — I run a small immigration law firm, 3 attorneys, ~40 active client matters at a time, we track cases from initial consult through filing

**[Internal: Step 1 — mode not declared → Default]**

**[Internal: Step 2 — business description is specific enough. No clarifying question needed. Signals: law firm, service-based, entity = "matters", volume ~40 (low → groups preferred over status column), two phases visible: intake + active case]**

**[Internal: Step 3 — archetype map: "cases", "matters", "filing", "consult" = Custom. Does not fit B2B sales, B2C transactional, or outbound. Compose from primitives: primary entity = Matters. Secondary entity = Clients (separate so one client can have multiple matters). Low volume → pipeline as groups.]**

---

**Claude:**

Here's what I'd build for an immigration law firm:

**Board 1: Matters**

| | |
|---|---|
| **Groups (pipeline stages)** | Initial Consult → Retained → Documents Gathering → Filed → Pending Decision → Closed |
| **Columns** | Owner (people), Matter type (status: Family / Employment / Asylum / Other), Client (text), Priority (status: Urgent / Standard), Retainer signed (checkbox), Filing deadline (date), Fee (numbers, $), Notes (long text) |
| **Rationale** | You mentioned tracking cases from consult through filing — groups map naturally to your case lifecycle. |

**Board 2: Clients**

| | |
|---|---|
| **Groups** | Active / Past |
| **Columns** | Primary contact (text), Phone (phone), Email (email), Country of origin (text), Open matters (numbers), First consult date (date), Notes (long text) |
| **Rationale** | One client can have multiple matters (e.g., visa + dependent filing). Keeping clients separate lets you see the full picture per person. |

Build this as-is, change anything before building, or describe your practice differently?

---

**User:** looks good, but call the first group "New Intake" not "Initial Consult"

**Claude:** Got it — renaming the first group to `New Intake`.

Updated proposal:

**Matters** groups: **New Intake** → Retained → Documents Gathering → Filed → Pending Decision → Closed

Everything else unchanged. Build this?

---

**User:** yes

**[Internal: Step 4 — resolving workspace. get_user_context returns one writable workspace: "Firm Operations". Single workspace → skip ask. Search for existing boards named "Matters" or "Clients" → none found. No collision.]**

**[Internal: Step 5 — Default mode batch confirm. Include β opt-in.]**

**Claude:**

I'll create 2 boards with 8 + 7 columns in workspace **Firm Operations**. Want example items added after building so you can see the shape with data? (yes / no)

Proceed? (yes / no / show plan again)

---

**User:** yes to both

**[Internal: Building. create_board "Matters" → boardId 111. Query existing groups → default group id "group_title". update_group mutation to rename to "New Intake". create_group for remaining 5 stages. create_column × 8 in order: Matter type (status), Owner (people), Client (text), Priority (status), Retainer signed (checkbox), Filing deadline (date), Fee (numbers $), Notes (long_text).]**

**Claude:** Created board `Matters`.
- Renamed default group → `New Intake`
- Created groups: Retained, Documents Gathering, Filed, Pending Decision, Closed
- Created column `Matter type` (status) on `Matters`
- Created column `Owner` (people) on `Matters`
- Created column `Client` (text) on `Matters`
- Created column `Priority` (status) on `Matters`
- Created column `Retainer signed` (checkbox) on `Matters`
- Created column `Filing deadline` (date) on `Matters`
- Created column `Fee` (numbers, $) on `Matters`
- Created column `Notes` (long text) on `Matters`

**[Internal: create_board "Clients" → boardId 222. Query groups → default "group_title". update_group → "Active". create_group "Past". create_column × 7.]**

Created board `Clients`.
- Groups: Active, Past
- Created 7 columns (Primary contact, Phone, Email, Country of origin, Open matters, First consult date, Notes)

**[Internal: Step 6 — β seed items. 5 items on Matters distributed across stages. Owner = running user. Source = Claude status column value.]**

Adding example items to `Matters`...
- Created `Rivera Family — spousal visa` (New Intake, Source = Claude)
- Created `Chen, Wei — H-1B extension` (Documents Gathering, Source = Claude)
- Created `Okonkwo — asylum application` (Filed, Source = Claude)
- Created `Park Family — green card` (Pending Decision, Source = Claude)
- Created `Torres — case closed` (Closed, Won, Source = Claude)

**[Internal: Step 7 — create_doc. Search for same-day doc with skill-id comment → none found. Create.]**

**[Internal: Step 9 summary.]**

Done. Created 2 boards, 15 columns, 5 seed items. Doc: [CRM Setup — Jun 11](https://monday.com/…)

When you have a few real matters in, run `/monday-crm:morning-briefing` to start your daily case prioritization.
