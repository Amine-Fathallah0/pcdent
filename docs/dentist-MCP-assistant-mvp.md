## Plan: Dentist MCP Assistant MVP

Dentist-focused MCP integration should start with a guarded MVP: patient-management-first with read tools plus three confirmed write actions (create appointment, reschedule appointment, add notes), always requiring dentist confirmation before execution. The implementation should prioritize strict object-level authorization and auditability before adding richer assistant UX.

**Steps**
1. Phase 1 - Security and Foundations (blocks all later phases)
2. Align authentication strategy for MCP and app APIs, then document one primary scheme for MCP transport while keeping compatibility with current login responses. *blocks step 3 onward*
3. Add dentist-specific permission layer for both API and MCP access: IsDentistUser, IsOwningDentistResource, HasActiveDentistPatientLink, and write-risk classifier logic used by confirmation flow. *depends on step 2*
4. Add shared domain service/query helpers for patient management workflows (linked patients, reliability flag summaries, appointment retrieval and ownership checks) to avoid duplicating filters in views/tools. *depends on step 3*

5. Phase 2 - Dentist MCP Tooling (can start after Phase 1)
6. Create MCP tool module in dentapp and register dentist toolsets with role- and object-filtered querysets.
7. Implement read tools for dentist patient management MVP: list_my_patients, get_patient_summary, list_patient_appointments, get_reliability_flags.
8. Implement write tools approved for MVP: create_appointment, reschedule_appointment, add_appointment_notes; each tool must return structured risk metadata and require explicit confirmation token from assistant flow before mutating data.
9. Add MCP-facing serializer outputs that redact unnecessary PII and normalize date/time fields for assistant consumption. *parallel with step 8 where possible*

10. Phase 3 - Backend API and Agent Orchestration
11. Add/extend REST endpoints needed by the in-app dentist assistant shell (chat request, tool preview, tool execution confirmation, interaction history), reusing the same permission/service layer as MCP tools. *depends on step 4, parallel with step 7 initially*
12. Implement assistant orchestration contract: assistant proposes action -> backend returns risk/preview -> dentist confirms -> backend executes and audits.
13. Add audit log model/service for assistant-triggered actions, including actor, patient linkage, before/after values, and confirmation status. *depends on step 8 and step 12*

14. Phase 4 - Dentist UI Integration (floating button first)
15. Add floating assistant entry in dentist workflows and wire to a lightweight chat panel/modal that can show tool suggestions, risk clarifications, and confirmation prompts.
16. Start integration in dentist patient-management surfaces first, then reuse in appointments view.
17. Connect frontend to new backend assistant endpoints and show deterministic loading/error/success states with existing UI patterns.

18. Phase 5 - Hardening and Rollout
19. Add rate limiting/throttling for assistant and MCP tool calls, especially write tools.
20. Add targeted tests for object-level permission boundaries, confirmation workflow, and each MVP write tool path (happy path + denied path).
21. Run internal pilot with dentist-only users, collect false-positive/false-action feedback, then decide expansion to case review assistant and additional writes.

**Relevant files**
- c:/Users/Asus/Desktop/box/Pcd-project/pcdental/mysite/settings.py — MCP auth settings, DRF auth alignment, environment-driven security cleanup.
- c:/Users/Asus/Desktop/box/Pcd-project/pcdental/dentapp/urls.py — MCP route placement and new assistant API endpoints.
- c:/Users/Asus/Desktop/box/Pcd-project/pcdental/dentapp/models.py — reuse User/Dentist/Patient/DentistPatientLink/Appointment and add assistant audit model.
- c:/Users/Asus/Desktop/box/Pcd-project/pcdental/dentapp/serializers.py — MCP-safe serializer outputs and assistant API request/response serializers.
- c:/Users/Asus/Desktop/box/Pcd-project/pcdental/dentapp/views.py — assistant API endpoints and confirmation execution endpoints.
- c:/Users/Asus/Desktop/box/Pcd-project/pcdental/dentapp/mcp.py — new dentist MCP tools and queryset scoping rules.
- c:/Users/Asus/Desktop/box/Pcd-project/front-end/src/pages/DentistDashboard.tsx — floating assistant entry and patient-management-first workflow integration.
- c:/Users/Asus/Desktop/box/Pcd-project/front-end/src/components/layout/DashboardLayout.tsx — optional global dentist assistant entry and navigation state.
- c:/Users/Asus/Desktop/box/Pcd-project/front-end/src/lib/api.ts — assistant endpoints and auth header consistency.
- c:/Users/Asus/Desktop/box/Pcd-project/front-end/src/context/AuthContext.tsx — dentist role gating and assistant access conditions.

**Verification**
1. Backend checks: run Django system checks and migrations, then run mcp_inspect and verify only dentist-scoped tools are published.
2. Permission tests: verify patient/appointment access is denied across dentists and denied for non-dentist users.
3. Confirmation flow tests: verify every write tool requires explicit confirmation payload and fails safely without it.
4. MCP integration tests: call read and write tools via local MCP client, validate returned risk metadata and post-confirmation state changes.
5. Frontend manual QA: from dentist dashboard, open floating assistant, request patient-management tasks, confirm a write action, and verify visible state updates.
6. Security checks: verify rate limits trigger, audit records are created for all assistant write attempts, and redacted fields remain hidden in tool outputs.

**Decisions**
- Included scope: Dentist-focused assistant, patient-management-first, floating button entry.
- Included scope: Read tools + three write tools (create appointment, reschedule appointment, add appointment notes).
- Safety requirement: Assistant must clarify risk and request explicit dentist confirmation before write execution.
- Client preference: prioritize free/open-source workflows; support Cline-style usage first, with Claude Desktop as a secondary option if free availability fits deployment.
- Deliberately excluded from MVP: Full case-review AI findings pipeline, messaging automation, CT file write workflows, broad CRUD, and autonomous execution without confirmation.

**Further Considerations**
1. MCP auth choice recommendation: Option A keep DRF token auth for quickest compatibility with current frontend; Option B standardize on JWT for stateless scaling. Recommendation: Option A for MVP, then migrate to Option B in phase 2.
2. External client rollout recommendation: Option A in-app assistant only for pilot; Option B expose external MCP access after audit/rate-limit maturity. Recommendation: Option A first.
3. UX evolution recommendation: Option A floating button MVP; Option B upgrade to persistent drawer after adoption data confirms frequent usage. Recommendation: start with Option A.
