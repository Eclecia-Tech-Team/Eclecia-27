# Payment provider API

Lookup of a registration by its registration ID, for the payment page.

## Who pays
- Solo event: every registrant, with their own registration ID.
- Team event: only the team leader, with their registration ID; one payment covers the team.
- Team members' IDs and free events are refused (see errors).

## Request
```
GET /api/payment/registrations/{registrationId}
x-api-key: <PAYMENT_API_KEY>
```
`registrationId` looks like `REG-7KQ2M9XH` (case-insensitive).

## 200 response
```json
{
  "registrationId": "REG-7KQ2M9XH",
  "participantName": "Asha Roy",
  "participantEmail": "asha@example.com",
  "participantPhone": "9000000000",
  "participantCollege": "HITK",
  "eventName": "Battle of Bands",
  "eventFee": 300,
  "eventType": "team",
  "teamName": "Midnight Raga",
  "teamMembers": 4
}
```
`eventType` is `solo` or `team`. `teamName` and `teamMembers` are `null` for solo events. `eventFee` is in INR.

## Errors
Body: `{ "code": "...", "error": "<message to show>" }`

| Status | code | Meaning |
|---|---|---|
| 401 | UNAUTHORIZED | missing/wrong `x-api-key` |
| 404 | NOT_FOUND | no registration with that ID |
| 409 | NOT_PAYER | team member's ID; leader pays |
| 409 | NO_FEE | free event |
| 409 | ALREADY_PAID | fee already recorded as paid |
| 503 | UNAVAILABLE | API key not configured on our side |
