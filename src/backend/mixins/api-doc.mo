mixin () {
  public query func getApiDoc() : async Text {
    "# Video Canvas Reference Backend API\n" #
    "\n" #
    "## Purpose\n" #
    "\n" #
    "This is a lightweight, local-first canvas tool for video creation (a simpler alternative to ComfyUI). All canvases, nodes and third-party relay settings (API base URL, keys, models) are stored only in the user's browser. Image generation, chat, video and voice requests are sent directly from the browser to the user's own third-party relay service. **The backend stores no product data**: there are no canvas, node, job or settings endpoints, and nothing to poll. Only the template role registry and the read-only OQL query surface exist.\n" #
    "\n" #
    "## Public methods\n" #
    "\n" #
    "- `_initialize_access_control() : async ()` (update) - registers the caller in the role registry. Anonymous callers are ignored (no-op). The first non-anonymous caller ever registered becomes `#admin`; every later new caller becomes `#user`. Calling again for an already-registered caller changes nothing, so it is idempotent and safe to retry.\n" #
    "- `_internet_identity_sign_in_start() : async Blob` (update) - issues a sign-in challenge used by the frontend's Internet Identity sign-in flow.\n" #
    "- `_internet_identity_sign_in_finish() : async Result<(), Error>` (update) - registers the caller exactly like `_initialize_access_control`, then verifies identity attributes for the issued challenge; returns `#err` when verification fails (registration still happened).\n" #
    "- `getCallerUserRole() : async UserRole` (query) - returns `#admin`, `#user` or `#guest`. Anonymous callers get `#guest`. A signed, unregistered caller traps with `User is not registered`.\n" #
    "- `isCallerAdmin() : async Bool` (query) - `true` only for the admin. Traps with `User is not registered` for a signed, unregistered caller; anonymous gets `false`.\n" #
    "- `assignCallerUserRole(user : Principal, role : UserRole) : async ()` (update) - admin only; sets the role of `user` (overwrites). Non-admins trap with `Unauthorized: Only admins can assign user roles`; unregistered signed callers trap with `User is not registered`. Idempotent: repeating the same call yields the same state.\n" #
    "- `schema()` / `execute(query : Text)` (queries, OQL) - the read-only data query surface. No entities are registered because the backend holds no app data, so the schema is empty and queries return nothing useful.\n" #
    "- `getApiDoc() : async Text` (query) - returns this document. Static; no authentication required.\n" #
    "\n" #
    "## Authentication and identity\n" #
    "\n" #
    "No method requires a signed caller to succeed, but registration and role checks only work for non-anonymous (signed) callers: anonymous calls to `_initialize_access_control` are no-ops and anonymous callers always have role `#guest`. The app itself does not gate any feature behind sign-in; all product features run locally in the browser.\n" #
    "\n" #
    "The app's frontend pins an Internet Identity derivation origin, published at `/.well-known/ii-derivation-origin` when available. An agent already holding the user's Internet Identity authorization derives the correct per-app principal against that origin (for example `icp identity link web <name> --app <host>`). Such a delegation acts with the user's full authority in this app until it expires.\n" #
    "\n" #
    "### Registration prerequisite\n" #
    "\n" #
    "A direct API caller must call `_initialize_access_control` once as a signed-in caller before calling `getCallerUserRole` or `isCallerAdmin`; otherwise those queries trap with `User is not registered`. The first initializer becomes admin, all subsequent ones become user. Registration otherwise happens only when a caller signs in through the app's own frontend, so a principal that never did so is unregistered even if it belongs to the app's owner, and a caller derived against a different origin is a different principal than the one the frontend registered.\n" #
    "\n" #
    "## Units and encoding\n" #
    "\n" #
    "- `UserRole` is a Candid variant: `variant { admin; user; guest }`.\n" #
    "- Principals are standard IC principals (textual form in CLI calls).\n" #
    "- `execute` takes a JSON query string; results are Candid rows.\n" #
    "- There are no timestamps, blobs or identifiers stored by this backend.\n" #
    "\n" #
    "## Lifecycle and polling\n" #
    "\n" #
    "There are no long-running jobs on the backend. Generation tasks (image, video, voice, chat) are run and polled by the browser against the user's relay, never through this canister. Do not poll this canister.\n" #
    "\n" #
    "## Mutation retry safety\n" #
    "\n" #
    "- `_initialize_access_control` is idempotent; a retry never changes an existing role.\n" #
    "- `assignCallerUserRole` overwrites the target's role; retries are safe.\n" #
    "- There are no destructive endpoints.\n" #
    "\n" #
    "## Errors and gotchas\n" #
    "\n" #
    "- Traps (not `Result` errors) are used for `User is not registered` and `Unauthorized: Only admins can assign user roles`.\n" #
    "- Canvas data, relay URLs and API keys are never sent to or stored on the backend; do not look for them here.\n" #
    "- The admin role belongs to whichever signed principal registered first."
  };
};
