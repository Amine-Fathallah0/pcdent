"""Slot generation + conflict-detection helpers for the appointment workflow.

The single source of truth for "is this time available?" lives here so the
booking endpoints, the available-slots endpoint, and the counter-propose flow
all share the same rules.
"""

from datetime import datetime, time, timedelta

from django.utils import timezone

from .models import Appointment, DentistAvailabilityOverride, DentistSchedule


SLOT_GRANULARITY_MINUTES = 30
MIN_LEAD_HOURS = 2
MAX_HORIZON_DAYS = 90
MAX_RANGE_DAYS = 14


def _combine(date_, time_):
    return timezone.make_aware(datetime.combine(date_, time_))


def windows_for_date(dentist, date_):
    """Return list of (start_dt, end_dt) windows during which the dentist is open
    on a given date. Combines weekly schedule + date overrides:

    - If a blocking override covers the whole day → []
    - If non-blocked overrides exist → use them as the windows
    - Otherwise fall back to weekly schedule entries for that weekday
    - Blocking overrides with a time range subtract from the result
    """
    overrides = list(
        DentistAvailabilityOverride.objects.filter(dentist=dentist, date=date_)
    )

    full_day_block = next(
        (o for o in overrides if o.is_blocked and o.start_time is None and o.end_time is None),
        None,
    )
    if full_day_block:
        return []

    extension_overrides = [o for o in overrides if not o.is_blocked]
    block_overrides = [o for o in overrides if o.is_blocked and o.start_time and o.end_time]

    if extension_overrides:
        windows = [(_combine(date_, o.start_time), _combine(date_, o.end_time)) for o in extension_overrides]
    else:
        weekday = date_.weekday()
        entries = DentistSchedule.objects.filter(dentist=dentist, weekday=weekday)
        windows = [(_combine(date_, e.start_time), _combine(date_, e.end_time)) for e in entries]

    for o in block_overrides:
        block_start = _combine(date_, o.start_time)
        block_end = _combine(date_, o.end_time)
        windows = _subtract_window(windows, block_start, block_end)

    return windows


def _subtract_window(windows, block_start, block_end):
    out = []
    for w_start, w_end in windows:
        if block_end <= w_start or block_start >= w_end:
            out.append((w_start, w_end))
            continue
        if block_start > w_start:
            out.append((w_start, block_start))
        if block_end < w_end:
            out.append((block_end, w_end))
    return out


def overlapping_appointments(dentist, start_dt, end_dt, exclude_id=None):
    """Return the QuerySet of non-terminal, non-deleted appointments for this
    dentist whose time range overlaps [start_dt, end_dt).
    """
    qs = (
        Appointment.objects
        .filter(
            dentist_patient_link__dentist=dentist,
            deleted_at__isnull=True,
            status__in=Appointment.NON_CANCELLED_BLOCKING,
        )
        .exclude(appointment_date__gte=end_dt)
    )
    if exclude_id is not None:
        qs = qs.exclude(pk=exclude_id)

    overlapping_ids = []
    for appt in qs:
        appt_end = appt.appointment_date + timedelta(minutes=appt.duration)
        if appt_end > start_dt:
            overlapping_ids.append(appt.pk)
    return Appointment.objects.filter(pk__in=overlapping_ids)


def has_conflict(dentist, start_dt, duration_minutes, exclude_id=None):
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    return overlapping_appointments(dentist, start_dt, end_dt, exclude_id=exclude_id).exists()


def available_slots_for_range(dentist, start_date, end_date, duration_minutes):
    """Compute available start times for each date in [start_date, end_date].

    Returns: dict mapping ISO date → list of "HH:MM" strings.
    """
    if (end_date - start_date).days > MAX_RANGE_DAYS:
        raise ValueError(f'date range cannot exceed {MAX_RANGE_DAYS} days')

    now = timezone.now()
    earliest_allowed = now + timedelta(hours=MIN_LEAD_HOURS)
    latest_allowed = now + timedelta(days=MAX_HORIZON_DAYS)

    busy_qs = (
        Appointment.objects
        .filter(
            dentist_patient_link__dentist=dentist,
            deleted_at__isnull=True,
            status__in=Appointment.NON_CANCELLED_BLOCKING,
            appointment_date__gte=_combine(start_date, time.min),
            appointment_date__lt=_combine(end_date, time.max),
        )
    )
    busy_intervals = [
        (a.appointment_date, a.appointment_date + timedelta(minutes=a.duration))
        for a in busy_qs
    ]

    duration_delta = timedelta(minutes=duration_minutes)
    step = timedelta(minutes=SLOT_GRANULARITY_MINUTES)
    result = {}

    cursor = start_date
    while cursor <= end_date:
        windows = windows_for_date(dentist, cursor)
        slots = []
        for w_start, w_end in windows:
            slot_start = w_start
            while slot_start + duration_delta <= w_end:
                if slot_start < earliest_allowed:
                    slot_start += step
                    continue
                if slot_start > latest_allowed:
                    break
                slot_end = slot_start + duration_delta
                if not _overlaps_any(slot_start, slot_end, busy_intervals):
                    slots.append(slot_start.strftime('%H:%M'))
                slot_start += step
        result[cursor.isoformat()] = slots
        cursor += timedelta(days=1)

    return result


def _overlaps_any(start, end, intervals):
    for i_start, i_end in intervals:
        if start < i_end and end > i_start:
            return True
    return False
