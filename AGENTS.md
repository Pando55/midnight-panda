## Trading architecture
- Use the account-bound terminal bridge for broker data and demo execution; screenshots are second opinions, not executable broker tickets.
- Validate execution permits atomically in the database and at the terminal; never retry an ambiguous broker submission.
- Keep live entries locked until externally verified demo tests and explicit owner approval; heartbeat receipt is not demo-fill verification.
- Keep broker credentials in terminal-local storage, never logs or browser storage.
- Use the existing design-system controls and semantic trading tokens in changed views to preserve Midnight Panda branding.