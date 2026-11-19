# ResolveDesk

ResolveDesk is a smart support desk prototype. People can report software issues, browse ticket progress, and see similar previously resolved issues before submitting a new request. Support agents can update ticket statuses, add an original resolution note, and continue a ticket conversation with the customer.

## Features

- Create tickets with title, description, and category validation.
- Browse tickets, search locally, and filter by status or category.
- Open a detail page for every ticket.
- Switch between an end-user and support-agent demo view (this is a demo role switcher, not authentication).
- Let an agent move tickets between **Open**, **In Progress**, and **Resolved**.
- Require a customer-friendly first resolution note before resolving a ticket.
- Keep a separate conversation thread for customer and agent follow-up replies.
- Allow up to five replies per side, with turn-taking enforced atomically by the backend.
- Let customers reopen a resolved ticket once; preserve the previous resolution note and clear any old rating when reopening.
- Let customers request ticket closure, with agent approval or an explicit force-resolve action and distinct in-app notices.
- Collect optional one-to-five-star customer feedback with a short note, and flag new ratings for agents until the ticket is opened.
- Show active Open and In Progress tickets first in both workspace overviews.
- Show in-app notices for newly resolved tickets and new agent replies, with direct links to each ticket.
- Highlight the latest reply in the conversation and ticket list.
- Provide a guided onboarding tour with step-by-step highlights, controlled scrolling during the tour, and a return to the main dashboard when the tour ends or is closed.
- Suggest up to three similar resolved tickets while a user is entering a new issue.
- Allow ticket submission even when suggestions are unavailable or no close match is found.

## Technology

| Layer | Technology |
|---|---|
| Frontend | Angular 22, TypeScript, Tailwind CSS 4 |
| UI quality and icons | ESLint, Lucide Angular |
| Client-side forms and API | Angular Reactive Forms, Router, HttpClient, RxJS |
| Backend | Django 5.2, Django REST Framework |
| Database | MongoDB 8, accessed through PyMongo |
| Similarity | Sentence Transformers, `all-MiniLM-L6-v2`, cosine similarity |
| API documentation | drf-spectacular / Swagger UI |

The backend uses PyMongo directly for ticket storage. Django's default SQLite configuration is retained for Django's built-in framework components; ticket documents are stored in MongoDB.

## Prerequisites

- Python 3.10+
- Node.js 24.15+ and npm
- Docker Desktop (or a local MongoDB 8 instance)
- Git

## 1. Start MongoDB

Start the existing container:

```powershell
docker start resolvedesk-mongodb
```

If the container does not exist yet, create it once:

```powershell
docker run -d `
  --name resolvedesk-mongodb `
  -p 127.0.0.1:27017:27017 `
  -v resolvedesk-mongo-data:/data/db `
  --restart unless-stopped `
  mongo:8.0
```

Check the connection:

```powershell
docker exec resolvedesk-mongodb mongosh --eval "db.adminCommand({ ping: 1 })"
```

MongoDB Compass can connect using `mongodb://localhost:27017`. The application uses database `smart_support` and collection `tickets`.

## 2. Configure and start the backend

From the repository root:

```powershell
cd backend
```

Create and activate the virtual environment if it does not already exist:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

Generate a Django secret key:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Paste the generated value into `backend/.env`:

```env
DJANGO_SECRET_KEY=your-generated-secret-key
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=smart_support
```

Keep `.env` private; it is excluded by `.gitignore`.

Check and start Django:

```powershell
python manage.py check
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`.

### Seed demo data

For a fresh database, open a second backend terminal with the virtual environment active and run:

```powershell
python seed_tickets.py
```

The seed script inserts four resolved examples and one open ticket. It skips the operation if the collection already contains documents, so existing test data is not overwritten. For richer AI similarity testing, use the development-only Swagger seed endpoint described below.

### API documentation

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`
- OpenAPI schema: `http://127.0.0.1:8000/api/schema/`
- Health check: `http://127.0.0.1:8000/api/health/`

## 3. Start the Angular frontend

Open a separate terminal from the repository root:

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

The API base URL is configured in `frontend/src/environments/environment.ts`:

```ts
apiBaseUrl: 'http://127.0.0.1:8000/api'
```

For a different backend address, update that value before starting the frontend.

### CORS

Django's `corsheaders` middleware is enabled. The backend explicitly allows both local Angular development origins:

- `http://localhost:4200`
- `http://127.0.0.1:4200`

If the browser reports a CORS error, confirm that the frontend is running on one of these exact origins and that Django has been restarted after settings changes.

### Development-only Swagger utilities

When Django runs with `DEBUG=True` (the local development configuration), Swagger exposes two POST-only utilities:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/dev/seed-resolved-tickets/` | Insert 25 realistic resolved examples across all four categories. Re-running replaces only this demo batch and preserves other tickets. |
| POST | `/api/dev/delete-all-tickets/` | Delete every ticket document in MongoDB. Requires the exact confirmation text `DELETE ALL TICKETS`. |

Open `http://127.0.0.1:8000/api/docs/` and expand the **Development utilities** operations. Run the seed operation first when preparing AI tests. Use the delete operation only when you intentionally want an empty ticket collection.

**Safety note:** Swagger is a convenient interface, not authentication. These endpoints are ordinary HTTP API routes and can also be called by other HTTP clients while development mode is enabled. They return 404 when Django `DEBUG=False`, and neither endpoint is used by the Angular frontend. Do not deploy with `DEBUG=True`.

## AI similarity behaviour

The endpoint `POST /api/tickets/similar/` compares the new ticket's title and description against the titles and descriptions of resolved tickets only. It uses the local Sentence Transformers model `sentence-transformers/all-MiniLM-L6-v2` and cosine similarity to rank up to three matches.

The model files are downloaded the first time the endpoint is used, so the first request can take longer and requires internet access. Subsequent requests reuse the model loaded in the Django process.

Similarity scores are ranking signals, not probabilities or guarantees that a previous resolution will solve the new issue. Suggestions are advisory; a user can always submit a ticket.

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health/` | Check API and MongoDB connectivity |
| GET | `/api/tickets/` | List tickets; optional `status` and `category` filters |
| POST | `/api/tickets/` | Create a ticket |
| GET | `/api/tickets/{id}/` | Retrieve a ticket |
| PATCH | `/api/tickets/{id}/` | Update status and/or the original resolution note |
| POST | `/api/tickets/{id}/replies/` | Add a turn-based customer or agent conversation reply (five per role) |
| POST | `/api/tickets/{id}/reopen/` | Reopen a resolved ticket and clear any previous rating |
| POST | `/api/tickets/{id}/rating/` | Save or update optional customer feedback |
| POST | `/api/tickets/{id}/rating/seen/` | Mark a customer rating as seen by an agent |
| POST | `/api/tickets/{id}/close-request/` | Request ticket closure as a customer |
| POST | `/api/tickets/{id}/resolve/` | Resolve a customer-requested ticket |
| POST | `/api/tickets/{id}/force-resolve/` | Force resolve an active ticket |
| POST | `/api/tickets/similar/` | Suggest up to three similar resolved tickets |

## Frontend quality checks

From `frontend/`:

```powershell
npm run lint
npm run build
npm test
```

A GitHub Actions workflow also runs ESLint and a production build when frontend files are pushed to `main` or included in a pull request.

## Project structure

```text
ResolveDesk/
├── backend/
│   ├── config/
│   ├── tickets/
│   │   ├── repositories/
│   │   └── services/
│   ├── .env.example
│   ├── requirements.txt
│   ├── seed_tickets.py
│   └── manage.py
├── frontend/
│   ├── src/app/
│   │   ├── core/
│   │   └── pages/
│   ├── src/environments/
│   └── package.json
└── .github/workflows/
```

## Scope and limitations

- The end-user/agent selector is a demonstration switch, not real authentication or authorization.
- The project is intended for local demonstration; production deployment, real authentication, email notifications, and file uploads are outside the current scope. The in-app notices are demo-session notifications.
- The similarity model ranks resolved tickets but does not judge whether their resolution notes are correct or suitable for a new case. Follow-up replies are stored separately and are not sent to the similarity model. The original resolution note is preserved when a customer reopens a ticket. Once resolved, conversation replies are hidden behind **Show replies**. Customers can request closure separately from the conversation; agents can accept the request or force resolve, with distinct in-app notices.
- The current similarity service calculates embeddings for the resolved ticket candidates during a request. For a larger production dataset, embeddings should be persisted and refreshed when ticket content changes.


### Ticket conversations

Each ticket has a conversation separate from its description and resolution note. The customer and support agent can each send up to five replies. They must take turns: the same side cannot send twice in a row, and the backend checks both the turn and the per-side limit atomically in MongoDB.

A customer can reopen a resolved ticket only once with the **Re-Open Ticket** action. Reopening changes the status to **Open**, clears any previous customer rating, and keeps the resolution note and conversation history. When an agent opens an Open ticket, it moves to **In Progress**. Agents can change the status or resolution note explicitly from **Manage ticket**; after saving, the editor collapses behind **Edit Response**. Replies never overwrite the resolution note.

After resolution, customers may optionally leave a one-to-five-star rating and a short note. New ratings are highlighted in the agent ticket list and marked as seen when the agent opens the ticket. The user sees in-app notices for new agent replies and completed resolutions when switching back from the agent demo session.

The role value used by this feature belongs to the local demo role switcher. It is not an identity or authorization system. A production version must derive the sender role from an authenticated user rather than trusting a client-supplied role.
