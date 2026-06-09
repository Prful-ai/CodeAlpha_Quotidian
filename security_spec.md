# Security Specification: Random Quote Generator

This document outlines the security invariants, malicious payload tests, and specifications for the Firestore security rules.

## Data Invariants
1. **Public Reads**: Anyone, signed in or not, can read and list quotes.
2. **Schema Integrity on Writes**: Any document written to `/quotes/{quoteId}` must strictly contain only `text` and `author`.
3. **Value Hardening**:
   - `text` must be a string with a maximum length of 1000 characters.
   - `author` must be a string with a maximum length of 100 characters.
4. **No Shadow Fields**: No additional keys are allowed in the written documents.

---

## The "Dirty Dozen" Malicious Payloads
The following payloads should be rejected by Firestore Security Rules:

### 1. Missing Author Field
```json
{
  "text": "Only the paranoid survive."
}
```

### 2. Missing Text Field
```json
{
  "author": "Andy Grove"
}
```

### 3. Extra Shadow Fields (Privilege Escalation attempt)
```json
{
  "text": "Simplicity is the ultimate sophistication.",
  "author": "Leonardo da Vinci",
  "isAdmin": true
}
```

### 4. Invalid Type for Author (Object type)
```json
{
  "text": "Simplicity is the ultimate sophistication.",
  "author": { "first": "Leonardo", "last": "da Vinci" }
}
```

### 5. Invalid Type for Text (Boolean type)
```json
{
  "text": true,
  "author": "Steve Jobs"
}
```

### 6. Overlarge Text Payload (Denial-of-Wallet attempt, size > 1000 characters)
A string filled with 1001 "A"s as text.

### 7. Overlarge Author Payload (Denial-of-Wallet attempt, size > 100 characters)
A string filled with 101 "B"s as author.

### 8. Null Fields
```json
{
  "text": null,
  "author": "Anonymous"
}
```

### 9. Nested Writes
Attempting to create nested documents or subcollections under a quote ID using path injection.

### 10. Empty String as Author
```json
{
  "text": "In the middle of difficulty lies opportunity.",
  "author": ""
}
```

### 11. Empty String as Text
```json
{
  "text": "",
  "author": "Albert Einstein"
}
```

### 12. Path Poisoning
Injecting special characters (e.g., emojis or extremely long strings) as the `{quoteId}` template variables.

---

## Test Interface (Conceptual Test Suite)

A simulated test runner for verification of these security bounds:

```ts
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Quotes Firestore Rules', () => {
  it('allows public reads', async () => {
    // Should succeed
  });

  it('rejects invalid schema writes (the Dirty Dozen)', async () => {
    // All Dirty Dozen payloads must fail with PERMISSION_DENIED
  });
});
```
