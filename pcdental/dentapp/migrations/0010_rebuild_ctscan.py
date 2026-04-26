"""
Rebuild dentapp_ctscan (and dentapp_aiprocessingjob which depends on it).

The original migration was applied when the model had direct patient_id /
uploaded_by_dentist_id columns; the model was later redesigned to derive
patient/dentist through dentist_patient_link.  Both tables have 0 rows so
this is a safe drop-and-recreate.
"""
from django.db import migrations


_DROP_JOB   = "DROP TABLE IF EXISTS dentapp_aiprocessingjob CASCADE"
_DROP_SCAN  = "DROP TABLE IF EXISTS dentapp_ctscan CASCADE"

_CREATE_SCAN = """
CREATE TABLE dentapp_ctscan (
    id                      serial        PRIMARY KEY,
    dentist_patient_link_id integer       NOT NULL
                                          REFERENCES dentapp_dentistpatientlink(id)
                                          ON DELETE RESTRICT
                                          DEFERRABLE INITIALLY DEFERRED,
    uploaded_by_user_id     uuid          NULL
                                          REFERENCES dentapp_user(user_id)
                                          ON DELETE SET NULL,
    uploaded_at             timestamptz   NOT NULL,
    file                    varchar(100)  NOT NULL,
    description             text          NOT NULL DEFAULT '',
    deleted_at              timestamptz   NULL
)
"""

_IDX_SCAN_LINK = (
    "CREATE INDEX dentapp_cts_uploade_dfc501_idx "
    "ON dentapp_ctscan (dentist_patient_link_id)"
)

_CREATE_JOB = """
CREATE TABLE dentapp_aiprocessingjob (
    job_id                  uuid          PRIMARY KEY,
    ct_scan_id              integer       NOT NULL
                                          REFERENCES dentapp_ctscan(id)
                                          ON DELETE CASCADE
                                          DEFERRABLE INITIALLY DEFERRED,
    status                  varchar(30)   NOT NULL DEFAULT 'queued',
    is_fallback_mode        boolean       NOT NULL DEFAULT TRUE,
    annotated_image_url     varchar(200)  NOT NULL DEFAULT '',
    draft_report            text          NOT NULL DEFAULT '',
    dentist_notes           text          NOT NULL DEFAULT '',
    error_message           text          NOT NULL DEFAULT '',
    created_at              timestamptz   NOT NULL,
    updated_at              timestamptz   NOT NULL,
    completed_at            timestamptz   NULL
)
"""

_IDX_JOB_STATUS = (
    "CREATE INDEX dentapp_aip_status_0a4148_idx "
    "ON dentapp_aiprocessingjob (status, created_at DESC)"
)
_IDX_JOB_SCAN = (
    "CREATE INDEX dentapp_aip_ct_scan_6dea16_idx "
    "ON dentapp_aiprocessingjob (ct_scan_id, created_at DESC)"
)


class Migration(migrations.Migration):

    dependencies = [
        ('dentapp', '0009_rebuild_aiprocessingjob'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                _DROP_JOB,
                _DROP_SCAN,
                _CREATE_SCAN,
                _IDX_SCAN_LINK,
                _CREATE_JOB,
                _IDX_JOB_STATUS,
                _IDX_JOB_SCAN,
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
