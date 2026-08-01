```md id="f6ltzb"
# Performance

## Database

Indexes

- email
- messageId
- userId
- draftId
- reviewerId

Use `.lean()` for read-only queries.

Paginate inbox results instead of loading everything at once.

---

## AI Requests

Cache repeated prompts where appropriate.

Limit concurrent AI requests.

Retry transient failures with exponential backoff.

---

## Redis

Use Redis for

- BullMQ
- Sessions (if applicable)
- Short-lived caches
- Rate limiting

---

## Socket.IO

Use rooms by user ID.

Emit only changed data.

Disconnect inactive clients.

---

## Background Jobs

Move long-running work to BullMQ.

Keep HTTP requests short.

---

## File Storage

Store attachments in object storage.

Do not store large files in MongoDB.

---

## Logging

Log

- Errors
- Queue failures
- Slow requests

Avoid excessive debug logging in production.

---

## Monitoring

Recommended

- Render metrics
- MongoDB Atlas monitoring
- Redis monitoring
- Application logs

Track

- Response time
- Queue latency
- AI generation time
- Error rate
- Memory usage
- CPU usage
```
