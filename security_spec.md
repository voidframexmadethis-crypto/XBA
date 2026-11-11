# XBA Security Specification

## Data Invariants
1. A user can only read and write their own profile in `/users/{userId}`.
2. Leaderboard entries in `/leaderboard/{userId}` are readable by everyone but writable only by the user whose ID matches the document ID.
3. Credits and coins must be non-negative integers.
4. Timestamps (`updatedAt`) must be set to `request.time`.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identity Spoofing**: Attempting to write to `/users/someone_else_id`.
2. **Credit Injection**: Increasing credits by a massive amount without a server-side check (though here we trust the client for simplicity in this applet, but we restrict it to valid types).
3. **Ghost Fields**: Adding `isAdmin: true` to a user profile.
4. **Invalid IDs**: Using a 1MB string as a userId.
5. **Score Padding**: Updating someone else's leaderboard score.
6. **Immutable Field Change**: Changing the `uid` after creation.
7. **Negative Currency**: Setting credits to -1000.
8. **Future Timestamps**: Setting `updatedAt` to a future date.
9. **Email Spoofing**: Accessing data with an unverified email (if restricted).
10. **Resource Exhaustion**: Sending a 1MB string in `displayName`.
11. **Orphaned Writes**: Writing a leaderboard entry without a corresponding user profile.
12. **Bypassing Validation**: Sending a `User` object missing the `uid` field.

## Security Rules Implementation Strategy
- Use `isValidUser` and `isValidLeaderboardEntry` helpers.
- Enforce `request.auth.uid == userId`.
- Use `hasOnly` to prevent ghost fields.
