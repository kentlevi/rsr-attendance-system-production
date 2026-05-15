# Firestore Backup & Disaster Recovery

This system stores attendance, employees, leaves, undertime, incidents, payroll-driving settings, and face profiles in **Cloud Firestore**. A single bad admin click — or a Firestore rule misconfiguration — can wipe a collection. The protection against that is **scheduled exports**: nightly snapshots of the entire database stored in a Google Cloud Storage bucket. Recovery from any 30-day-old state becomes a one-command import.

## One-time setup (~10 minutes)

### 1. Create a backup bucket

In the Google Cloud Console for project `gen-lang-client-0587506116`:

1. **Cloud Storage → Create bucket**
2. Name: `rsr-attendance-firestore-backups` (or any unique name)
3. Region: `asia-southeast1` (same region as Firestore for fastest export)
4. Storage class: **Nearline** (cheaper than Standard, fine for backups)
5. **Lifecycle** rule (set after creation): delete objects older than **35 days** to control cost.

### 2. Grant Firestore the right to write to it

```
gcloud projects add-iam-policy-binding gen-lang-client-0587506116 \
  --member="serviceAccount:service-875448422264@gcp-sa-firestore.iam.gserviceaccount.com" \
  --role="roles/datastore.importExportAdmin"

gsutil iam ch \
  serviceAccount:service-875448422264@gcp-sa-firestore.iam.gserviceaccount.com:roles/storage.admin \
  gs://rsr-attendance-firestore-backups
```

`875448422264` is the project number from `firebase-applet-config.json` (`messagingSenderId`).

### 3. Schedule the export

The cleanest path on the Spark/Blaze plan is **Cloud Scheduler → Cloud Firestore Export API**. Run once:

```
gcloud scheduler jobs create http firestore-nightly-backup \
  --location=asia-southeast1 \
  --schedule="0 2 * * *" \
  --time-zone="Asia/Manila" \
  --uri="https://firestore.googleapis.com/v1/projects/gen-lang-client-0587506116/databases/ai-studio-a2aa8680-2b55-4ebf-8ae9-627b9e9eb7ad:exportDocuments" \
  --http-method=POST \
  --oauth-service-account-email="875448422264-compute@developer.gserviceaccount.com" \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://rsr-attendance-firestore-backups"}'
```

This fires every night at **02:00 Manila time** and dumps the whole database to `gs://rsr-attendance-firestore-backups/<timestamp>/`.

### 4. Verify

After the first scheduled run, check the bucket contents:

```
gsutil ls gs://rsr-attendance-firestore-backups/
```

You should see a folder named `2026-05-15T18:00:00_<id>/` (or similar).

## Restoring from backup

If you need to roll back (e.g. someone deleted all employees):

```
gcloud firestore import gs://rsr-attendance-firestore-backups/<timestamp>/<timestamp>.overall_export_metadata \
  --database=ai-studio-a2aa8680-2b55-4ebf-8ae9-627b9e9eb7ad
```

> **Warning** — Import is **destructive for matching keys**: it overwrites any document that exists in both the backup and the live database, but does **not** delete documents that exist live but not in the backup. To get a true "rewind", you must first delete the affected collection(s) via the Firebase Console before importing.

> Test the import once on a non-production database before relying on it in a real incident.

## Cost

For this dataset size (small — single-business attendance), expect under **₱50/month** for the bucket + scheduler + export bandwidth. Firestore exports themselves don't count against your read quota.

## What's NOT backed up

- **Firebase Auth users** — must be exported separately via `firebase auth:export users.json` (run weekly via cron on a trusted machine).
- **Firebase Storage objects** (attendance photos, attachments) — set up a parallel scheduled GCS-to-GCS copy if you want full point-in-time recovery.
- **Service worker IndexedDB caches on user devices** — these are by definition disposable.

## Tested?

Document the date of the **last successful restore drill** here so this isn't theoretical:

- Last drill: _never_ — schedule one within 30 days of going live.
