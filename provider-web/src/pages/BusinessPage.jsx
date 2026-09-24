import React from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../api/client';
import {
  addStaff,
  createPackage,
  createProvider,
  getAvailability,
  getMyProvider,
  listProviderReviews,
  listStaff,
  removeStaff,
  respondToReview,
  submitVerification,
  updateAvailability,
  updatePackage,
  updateProvider,
} from '../api/providerApi';
import styles from './BusinessPage.module.css';

const VERIFICATION_LABELS = {
  UNVERIFIED: 'Not submitted',
  PENDING: 'Pending review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

const CATEGORIES = ['CAR_WASH', 'DETAILING', 'AC_SERVICE', 'DENTING_PAINTING', 'GENERAL_SERVICE', 'TYRE_SERVICE', 'BATTERY_SERVICE', 'OTHER'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_PROVIDER_FORM = {
  business_name: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  locality: '',
};

function CreateBusinessForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_PROVIDER_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await createProvider({
        ...form,
        description: form.description || null,
        phone: form.phone || null,
        email: form.email || null,
        locality: form.locality || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create business profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Set up your business</h1>
      <p className={styles.subtitle}>
        Create your business profile so customers can find you and book your services. You can add service
        packages and set your working hours next.
      </p>
      <div className={styles.card}>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.field}>
          <label className={styles.label}>Business name</label>
          <input className={styles.input} value={form.business_name} onChange={(e) => update('business_name', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea className={styles.textarea} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <input className={styles.input} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Address</label>
          <input className={styles.input} value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>City</label>
            <input className={styles.input} value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Locality</label>
            <input className={styles.input} value={form.locality} onChange={(e) => update('locality', e.target.value)} />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || !form.business_name || !form.address || !form.city}>
            {saving ? 'Creating…' : 'Create business profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsTab({ provider, onSaved }) {
  const [form, setForm] = useState({
    business_name: provider.business_name,
    description: provider.description || '',
    phone: provider.phone || '',
    email: provider.email || '',
    address: provider.address,
    city: provider.city,
    locality: provider.locality || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProvider(provider.id, form);
      setSuccess('Business details saved.');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {success ? <p className={styles.success}>{success}</p> : null}
      <div className={styles.field}>
        <label className={styles.label}>Business name</label>
        <input className={styles.input} value={form.business_name} onChange={(e) => update('business_name', e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.textarea} value={form.description} onChange={(e) => update('description', e.target.value)} />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Phone</label>
          <input className={styles.input} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input className={styles.input} value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Address</label>
        <input className={styles.input} value={form.address} onChange={(e) => update('address', e.target.value)} />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>City</label>
          <input className={styles.input} value={form.city} onChange={(e) => update('city', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Locality</label>
          <input className={styles.input} value={form.locality} onChange={(e) => update('locality', e.target.value)} />
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save details'}
        </button>
      </div>
    </div>
  );
}

const EMPTY_PACKAGE_FORM = { category: CATEGORIES[0], name: '', description: '', price: '', duration_minutes: '', is_doorstep: true };

function PackagesTab({ provider, onSaved }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PACKAGE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      await createPackage(provider.id, {
        ...form,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
      });
      setForm(EMPTY_PACKAGE_FORM);
      setShowForm(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create package');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pkg) {
    try {
      await updatePackage(provider.id, pkg.id, { is_active: !pkg.is_active });
      onSaved();
    } catch {
      // best-effort
    }
  }

  return (
    <div className={styles.card}>
      {provider.packages.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No packages yet. Add your first service below.</p>
      ) : (
        provider.packages.map((pkg) => (
          <div className={styles.packageRow} key={pkg.id}>
            <div>
              <div className={styles.packageName}>{pkg.name}</div>
              <div className={styles.packageMeta}>
                {pkg.category} · ₹{pkg.price} · {pkg.duration_minutes} min · {pkg.is_doorstep ? 'Doorstep' : 'At location'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={pkg.is_active ? styles.badge : styles.badgeInactive}>{pkg.is_active ? 'Active' : 'Inactive'}</span>
              <button className={styles.btnSecondary} onClick={() => toggleActive(pkg)}>
                {pkg.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))
      )}

      {error ? <p className={styles.error}>{error}</p> : null}

      {showForm ? (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select className={styles.select} value={form.category} onChange={(e) => update('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Price (₹)</label>
              <input className={styles.input} type="number" value={form.price} onChange={(e) => update('price', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Duration (minutes)</label>
              <input
                className={styles.input}
                type="number"
                value={form.duration_minutes}
                onChange={(e) => update('duration_minutes', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="isDoorstep"
              checked={form.is_doorstep}
              onChange={(e) => update('is_doorstep', e.target.checked)}
            />
            <label htmlFor="isDoorstep">We travel to the customer (doorstep service)</label>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleCreate} disabled={saving || !form.name || !form.price || !form.duration_minutes}>
              {saving ? 'Adding…' : 'Add package'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
            + Add package
          </button>
        </div>
      )}
    </div>
  );
}

function AvailabilityTab({ provider }) {
  const [days, setDays] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    getAvailability(provider.id).then((existing) => {
      const byDay = Object.fromEntries(existing.map((d) => [d.day_of_week, d]));
      setDays(
        Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          open: Boolean(byDay[i]),
          opens_at: byDay[i]?.opens_at?.slice(0, 5) || '09:00',
          closes_at: byDay[i]?.closes_at?.slice(0, 5) || '18:00',
        }))
      );
    });
  }, [provider.id]);

  function updateDay(index, field, value) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = days
        .filter((d) => d.open)
        .map((d) => ({ day_of_week: d.day_of_week, opens_at: `${d.opens_at}:00`, closes_at: `${d.closes_at}:00` }));
      await updateAvailability(provider.id, payload);
      setSuccess('Working hours saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save working hours');
    } finally {
      setSaving(false);
    }
  }

  if (days === null) return <div className={styles.card}>Loading…</div>;

  return (
    <div className={styles.card}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {success ? <p className={styles.success}>{success}</p> : null}
      <div className={styles.dayGrid}>
        {days.map((d, i) => (
          <div className={styles.dayRow} key={d.day_of_week}>
            <input type="checkbox" checked={d.open} onChange={(e) => updateDay(i, 'open', e.target.checked)} />
            <span className={styles.dayLabel}>{DAY_NAMES[d.day_of_week]}</span>
            {d.open ? (
              <>
                <input
                  className={styles.timeInput}
                  type="time"
                  value={d.opens_at}
                  onChange={(e) => updateDay(i, 'opens_at', e.target.value)}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  className={styles.timeInput}
                  type="time"
                  value={d.closes_at}
                  onChange={(e) => updateDay(i, 'closes_at', e.target.value)}
                />
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Closed</span>
            )}
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save working hours'}
        </button>
      </div>
    </div>
  );
}

function VerificationTab({ provider, onSaved }) {
  const [form, setForm] = useState({
    business_registration_number: provider.business_registration_number || '',
    gst_number: provider.gst_number || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const status = provider.verification_status;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await submitVerification(provider.id, {
        business_registration_number: form.business_registration_number,
        gst_number: form.gst_number || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit for verification');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.field}>
        <label className={styles.label}>Status</label>
        <span className={status === 'VERIFIED' ? styles.badge : styles.badgeInactive}>{VERIFICATION_LABELS[status]}</span>
      </div>

      {status === 'VERIFIED' ? (
        <p className={styles.success}>
          Verified on {provider.verified_at ? new Date(provider.verified_at).toLocaleDateString() : ''}. Registration:{' '}
          {provider.business_registration_number}
          {provider.gst_number ? ` · GST: ${provider.gst_number}` : ''}
        </p>
      ) : null}

      {status === 'PENDING' ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Submitted on {provider.verification_submitted_at ? new Date(provider.verification_submitted_at).toLocaleDateString() : ''} — GaadiGrid
          admin will review it shortly.
        </p>
      ) : null}

      {status === 'UNVERIFIED' || status === 'REJECTED' ? (
        <>
          {status === 'REJECTED' ? (
            <p className={styles.error}>Rejected: {provider.verification_notes || 'No reason given.'}</p>
          ) : null}
          <div className={styles.field}>
            <label className={styles.label}>Business registration number</label>
            <input
              className={styles.input}
              value={form.business_registration_number}
              onChange={(e) => setForm((p) => ({ ...p, business_registration_number: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>GST number (optional)</label>
            <input
              className={styles.input}
              value={form.gst_number}
              onChange={(e) => setForm((p) => ({ ...p, gst_number: e.target.value }))}
            />
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={saving || !form.business_registration_number}
            >
              {saving ? 'Submitting…' : status === 'REJECTED' ? 'Resubmit for verification' : 'Submit for verification'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StaffTab({ provider }) {
  const [staff, setStaff] = useState(null);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    listStaff(provider.id).then(setStaff);
  }

  useEffect(load, [provider.id]);

  async function handleAdd() {
    setAdding(true);
    setError(null);
    try {
      await addStaff(provider.id, email);
      setEmail('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add staff member');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId) {
    if (!window.confirm('Remove this staff member from your business?')) return;
    try {
      await removeStaff(provider.id, userId);
      load();
    } catch {
      // best-effort
    }
  }

  if (staff === null) return <div className={styles.card}>Loading…</div>;

  return (
    <div className={styles.card}>
      {staff.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No staff added yet.</p>
      ) : (
        staff.map((s) => (
          <div className={styles.packageRow} key={s.user_id}>
            <div>
              <div className={styles.packageName}>{s.full_name}</div>
              <div className={styles.packageMeta}>{s.email}</div>
            </div>
            <button className={styles.btnSecondary} onClick={() => handleRemove(s.user_id)}>
              Remove
            </button>
          </div>
        ))
      )}

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <div className={styles.field}>
          <label className={styles.label}>Add staff by email</label>
          <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: -8, marginBottom: 14 }}>
          The account must already exist with the Provider Staff role — GaadiGrid admin creates these accounts.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={handleAdd} disabled={adding || !email}>
            {adding ? 'Adding…' : 'Add staff member'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ review, onResponded }) {
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await respondToReview(review.booking_id, response);
      onResponded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit response');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.packageRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className={styles.packageName}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
        <span className={styles.packageMeta}>{new Date(review.created_at).toLocaleDateString()}</span>
      </div>
      {review.comment ? <p className={styles.packageMeta} style={{ marginTop: 6 }}>{review.comment}</p> : null}

      {review.provider_response ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span className={styles.label}>Your response</span>
          <p className={styles.packageMeta}>{review.provider_response}</p>
        </div>
      ) : responding ? (
        <div style={{ marginTop: 10 }}>
          <textarea
            className={styles.textarea}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Thank the customer or address their feedback…"
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setResponding(false)}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || !response.trim()}>
              {saving ? 'Saving…' : 'Submit response'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.btnSecondary} style={{ marginTop: 10, alignSelf: 'flex-start' }} onClick={() => setResponding(true)}>
          Respond
        </button>
      )}
    </div>
  );
}

function ReviewsTab({ provider }) {
  const [reviews, setReviews] = useState(null);

  function load() {
    listProviderReviews(provider.id).then((res) => setReviews(res.items));
  }

  useEffect(load, [provider.id]);

  if (reviews === null) return <div className={styles.card}>Loading…</div>;

  return (
    <div className={styles.card}>
      {reviews.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No reviews yet.</p>
      ) : (
        reviews.map((r) => <ReviewRow key={r.id} review={r} onResponded={load} />)
      )}
    </div>
  );
}

export function BusinessPage() {
  const [provider, setProvider] = useState(undefined);
  const [tab, setTab] = useState('details');

  function load() {
    getMyProvider().then(setProvider);
  }

  useEffect(load, []);

  if (provider === undefined) {
    return <div className={styles.page}>Loading…</div>;
  }
  if (provider === null) {
    return <CreateBusinessForm onCreated={load} />;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{provider.business_name}</h1>
      <p className={styles.subtitle}>
        {provider.verification_status === 'VERIFIED'
          ? 'Verified business'
          : `${VERIFICATION_LABELS[provider.verification_status]} — this does not block bookings.`}
      </p>

      <div className={styles.tabs}>
        <button className={tab === 'details' ? styles.tabActive : styles.tab} onClick={() => setTab('details')}>
          Details
        </button>
        <button className={tab === 'packages' ? styles.tabActive : styles.tab} onClick={() => setTab('packages')}>
          Packages
        </button>
        <button className={tab === 'availability' ? styles.tabActive : styles.tab} onClick={() => setTab('availability')}>
          Working hours
        </button>
        <button className={tab === 'verification' ? styles.tabActive : styles.tab} onClick={() => setTab('verification')}>
          Verification
        </button>
        <button className={tab === 'staff' ? styles.tabActive : styles.tab} onClick={() => setTab('staff')}>
          Staff
        </button>
        <button className={tab === 'reviews' ? styles.tabActive : styles.tab} onClick={() => setTab('reviews')}>
          Reviews
        </button>
      </div>

      {tab === 'details' ? <DetailsTab provider={provider} onSaved={load} /> : null}
      {tab === 'packages' ? <PackagesTab provider={provider} onSaved={load} /> : null}
      {tab === 'availability' ? <AvailabilityTab provider={provider} /> : null}
      {tab === 'verification' ? <VerificationTab provider={provider} onSaved={load} /> : null}
      {tab === 'staff' ? <StaffTab provider={provider} /> : null}
      {tab === 'reviews' ? <ReviewsTab provider={provider} /> : null}
    </div>
  );
}
