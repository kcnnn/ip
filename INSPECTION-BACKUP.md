# Full inspection backups

**Backup / restore inspection** is available on the workspace and review page. A `.backup.json` file contains the current inspection metadata, drafts, accepted equipment research, deleted-item recovery metadata and original photos stored by APEX in IndexedDB. It does not contain API credentials or unrelated browser storage. Converted HEIC photos are backed up as the JPEG originals stored by APEX, not the source HEIC files.

The file is unencrypted and may contain private claim information. Keep it in a secure location. Confirm the download exists before clearing browser storage. This is a portable backup, not cloud synchronization. Legacy thumbnail-only photos cannot regain missing resolution; a missing referenced original blocks export rather than creating a misleading full backup. Download and restore currently have a 512 MB JSON-file limit.

Restore validates the archive, image formats, metadata and SHA-256 asset checksums. Photos receive new storage keys; the old inspection's assets are not overwritten. The previous record is archived in IndexedDB before the active metadata switches. If writing the new record fails, the old record stays active. If the inspection changes during restore, activation is refused. A successful restore reloads the page so stale forms cannot overwrite it.

**Return to previous inspection** switches back to the record active before restore. Restored data is retained too, so the switch is reversible. Recovery is local to the device; it is not a substitute for downloading a backup. Recovery archives are intentionally not recursively included in a portable backup.

`tests/backup-unified.browser.cjs` checks original photo round-tripping, deleted photos, checksum failures, restore recovery, metadata persistence, mobile layout and correct photo/note/research grouping with synthetic data. No private user inspection data is deleted by these tests.
