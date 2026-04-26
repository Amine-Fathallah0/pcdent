"""
Rebuild dentapp_aiprocessingjob to match the current model.

History: the original 0001_initial created AIProcessingJob with older fields
(id integer PK, started_at, retry_count, service_endpoint, …).  Later the
model was redesigned and a new 0002_aiprocessingjob migration was written, but
since the migration *name* was already recorded in django_migrations Django
never re-ran the CREATE TABLE.  This migration fixes the database by dropping
the stale table and recreating it with the correct schema.

dentapp_odontogram is also dropped here — it referenced the old integer PK and
is no longer part of any model.
"""
from django.db import migrations


_DROP_ODONTOGRAM = "DROP TABLE IF EXISTS dentapp_odontogram"

_DROP_OLD_TABLE = "DROP TABLE IF EXISTS dentapp_aiprocessingjob CASCADE"

_CREATE_TABLE = """
CREATE TABLE dentapp_aiprocessingjob (
    job_id       uuid          PRIMARY KEY,
    ct_scan_id   integer       NOT NULL
                               REFERENCES dentapp_ctscan(id)
                               ON DELETE CASCADE
                               DEFERRABLE INITIALLY DEFERRED,
    status       varchar(30)   NOT NULL DEFAULT 'queued',
    is_fallback_mode boolean   NOT NULL DEFAULT TRUE,
    annotated_image_url varchar(200) NOT NULL DEFAULT '',
    draft_report text          NOT NULL DEFAULT '',
    dentist_notes text         NOT NULL DEFAULT '',
    error_message text         NOT NULL DEFAULT '',
    created_at   timestamptz   NOT NULL,
    updated_at   timestamptz   NOT NULL,
    completed_at timestamptz   NULL
)
"""

_IDX_STATUS = (
    "CREATE INDEX dentapp_aip_status_0a4148_idx "
    "ON dentapp_aiprocessingjob (status, created_at DESC)"
)
_IDX_SCAN = (
    "CREATE INDEX dentapp_aip_ct_scan_6dea16_idx "
    "ON dentapp_aiprocessingjob (ct_scan_id, created_at DESC)"
)


class Migration(migrations.Migration):

    dependencies = [
        ('dentapp', '0008_reformat_dentist_code'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                _DROP_ODONTOGRAM,
                _DROP_OLD_TABLE,
                _CREATE_TABLE,
                _IDX_STATUS,
                _IDX_SCAN,
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
