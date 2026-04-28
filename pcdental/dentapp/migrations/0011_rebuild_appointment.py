"""
Rebuild dentapp_appointment.

The original migration was applied when the model had direct
dentist_id / patient_id UUID columns; the model was later redesigned
to derive patient/dentist through dentist_patient_link and gained a
deleted_at field, but the schema was never updated.  The table has
0 rows so this is a safe drop-and-recreate, mirroring 0010_rebuild_ctscan.
"""
from django.db import migrations


_DROP_APPT = "DROP TABLE IF EXISTS dentapp_appointment CASCADE"

_CREATE_APPT = """
CREATE TABLE dentapp_appointment (
    id                      serial        PRIMARY KEY,
    dentist_patient_link_id integer       NOT NULL
                                          REFERENCES dentapp_dentistpatientlink(id)
                                          ON DELETE RESTRICT
                                          DEFERRABLE INITIALLY DEFERRED,
    appointment_date        timestamptz   NOT NULL,
    status                  varchar(20)   NOT NULL DEFAULT 'scheduled',
    notes                   text          NOT NULL DEFAULT '',
    created_at              timestamptz   NOT NULL,
    updated_at              timestamptz   NOT NULL,
    deleted_at              timestamptz   NULL
)
"""

_IDX_APPT_LINK = (
    "CREATE INDEX dentapp_app_dentist_62422f_idx "
    "ON dentapp_appointment (dentist_patient_link_id, appointment_date)"
)

_IDX_APPT_STATUS = (
    "CREATE INDEX dentapp_app_status_1bac48_idx "
    "ON dentapp_appointment (status, appointment_date)"
)


class Migration(migrations.Migration):

    dependencies = [
        ('dentapp', '0010_rebuild_ctscan'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                _DROP_APPT,
                _CREATE_APPT,
                _IDX_APPT_LINK,
                _IDX_APPT_STATUS,
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
