from django.db import migrations


def rename_legacy_profile_columns(apps, schema_editor):
    connection = schema_editor.connection

    def get_columns(table_name):
        with connection.cursor() as cursor:
            description = connection.introspection.get_table_description(cursor, table_name)
        return {col.name for col in description}

    operations = [
        ("dentapp_dentist", "dentist_id_id", "dentist_id"),
        ("dentapp_patient", "patient_id_id", "patient_id"),
    ]

    for table_name, old_name, new_name in operations:
        columns = get_columns(table_name)
        if old_name in columns and new_name not in columns:
            q_table = schema_editor.quote_name(table_name)
            q_old = schema_editor.quote_name(old_name)
            q_new = schema_editor.quote_name(new_name)
            schema_editor.execute(f"ALTER TABLE {q_table} RENAME COLUMN {q_old} TO {q_new}")


def reverse_rename_legacy_profile_columns(apps, schema_editor):
    connection = schema_editor.connection

    def get_columns(table_name):
        with connection.cursor() as cursor:
            description = connection.introspection.get_table_description(cursor, table_name)
        return {col.name for col in description}

    operations = [
        ("dentapp_dentist", "dentist_id", "dentist_id_id"),
        ("dentapp_patient", "patient_id", "patient_id_id"),
    ]

    for table_name, old_name, new_name in operations:
        columns = get_columns(table_name)
        if old_name in columns and new_name not in columns:
            q_table = schema_editor.quote_name(table_name)
            q_old = schema_editor.quote_name(old_name)
            q_new = schema_editor.quote_name(new_name)
            schema_editor.execute(f"ALTER TABLE {q_table} RENAME COLUMN {q_old} TO {q_new}")


class Migration(migrations.Migration):

    dependencies = [
        ("dentapp", "0002_aiprocessingjob"),
    ]

    operations = [
        migrations.RunPython(
            rename_legacy_profile_columns,
            reverse_rename_legacy_profile_columns,
        ),
    ]
