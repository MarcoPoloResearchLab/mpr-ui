# v4.0.0 Release Decision

On September 10, 2026, the user authorized release, publication, and deployment of v4.0.0.
This major release replaces the unpublished v3.11.12 selection.
The previous preparation record remains in the local release archive.

The loader requires the provider map in `auth.providers` and rejects the previous flat auth keys.
The footer requires the sectioned `menu` contract instead of `links-collection`.
The previous preparation recorded the complete source changes in `CHANGELOG.md` under v3.11.12.
The three library assets remain unchanged from that preparation.

I009 retains the consumer migration and public acceptance records.
The user accepted the current consumer PR state and authorized library deployment before all consumer PRs merge.
This authorization supersedes the earlier requirement to complete every consumer migration before library publication.
Library deployment does not establish consumer deployment or real Google login acceptance.
