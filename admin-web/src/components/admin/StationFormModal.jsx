import React from 'react';
import { useEffect, useState } from 'react';

import { api, ApiError } from '../../api/client';
import { FACILITY_CODES, FUEL_TYPE_CODES, facilityLabel } from '../../constants/stations';
import styles from './StationFormModal.module.css';

const EMPTY_DETAILS = {
  name: '',
  brand: '',
  address: '',
  city: '',
  locality: '',
  latitude: '',
  longitude: '',
  is_24_hours: true,
  opens_at: '',
  closes_at: '',
};

function detailsFromStation(station) {
  return {
    name: station.name || '',
    brand: station.brand || '',
    address: station.address || '',
    city: station.city || '',
    locality: station.locality || '',
    latitude: String(station.latitude ?? ''),
    longitude: String(station.longitude ?? ''),
    is_24_hours: station.is_24_hours,
    opens_at: station.opens_at || '',
    closes_at: station.closes_at || '',
  };
}

export function StationFormModal({ stationId: initialStationId, onClose, onSaved }) {
  const [stationId, setStationId] = useState(initialStationId || null);
  const [tab, setTab] = useState('details');
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [prices, setPrices] = useState({});
  const [facilities, setFacilities] = useState(new Set());
  const [loading, setLoading] = useState(!!initialStationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!initialStationId) return;
    let cancelled = false;
    api
      .get(`/api/v1/stations/${initialStationId}`)
      .then((station) => {
        if (cancelled) return;
        setDetails(detailsFromStation(station));
        setPrices(Object.fromEntries(station.prices.map((p) => [p.fuel_type_code, String(p.price)])));
        setFacilities(new Set(station.facilities));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load station');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialStationId]);

  function updateDetail(field, value) {
    setDetails((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveDetails() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: details.name.trim(),
        brand: details.brand.trim(),
        address: details.address.trim(),
        city: details.city.trim(),
        locality: details.locality.trim() || null,
        latitude: Number(details.latitude),
        longitude: Number(details.longitude),
        is_24_hours: details.is_24_hours,
        opens_at: details.is_24_hours ? null : details.opens_at || null,
        closes_at: details.is_24_hours ? null : details.closes_at || null,
      };

      const saved = stationId
        ? await api.put(`/api/v1/stations/${stationId}`, payload)
        : await api.post('/api/v1/stations', payload);

      setStationId(saved.id);
      setSuccess('Station details saved.');
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save station');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrices() {
    if (!stationId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const items = FUEL_TYPE_CODES.filter((code) => prices[code] !== undefined && prices[code] !== '').map((code) => ({
        fuel_type_code: code,
        price: Number(prices[code]),
      }));
      await api.put(`/api/v1/stations/${stationId}/prices`, { prices: items });
      setSuccess('Prices updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save prices');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFacilities() {
    if (!stationId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put(`/api/v1/stations/${stationId}/facilities`, { facility_codes: Array.from(facilities) });
      setSuccess('Facilities updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save facilities');
    } finally {
      setSaving(false);
    }
  }

  function toggleFacility(code) {
    setFacilities((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const tabsLocked = !stationId;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{stationId ? 'Edit station' : 'Add station'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.tabs}>
          <button className={tab === 'details' ? styles.tabActive : styles.tab} onClick={() => setTab('details')}>
            Details
          </button>
          <button
            className={tab === 'prices' ? styles.tabActive : tabsLocked ? styles.tabDisabled : styles.tab}
            onClick={() => !tabsLocked && setTab('prices')}
            disabled={tabsLocked}
          >
            Prices
          </button>
          <button
            className={tab === 'facilities' ? styles.tabActive : tabsLocked ? styles.tabDisabled : styles.tab}
            onClick={() => !tabsLocked && setTab('facilities')}
            disabled={tabsLocked}
          >
            Facilities
          </button>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
        ) : tab === 'details' ? (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} value={details.name} onChange={(e) => updateDetail('name', e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Brand</label>
                <input className={styles.input} value={details.brand} onChange={(e) => updateDetail('brand', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>City</label>
                <input className={styles.input} value={details.city} onChange={(e) => updateDetail('city', e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Address</label>
              <input className={styles.input} value={details.address} onChange={(e) => updateDetail('address', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Locality</label>
              <input className={styles.input} value={details.locality} onChange={(e) => updateDetail('locality', e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Latitude</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  value={details.latitude}
                  onChange={(e) => updateDetail('latitude', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Longitude</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  value={details.longitude}
                  onChange={(e) => updateDetail('longitude', e.target.value)}
                />
              </div>
            </div>
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="is24h"
                checked={details.is_24_hours}
                onChange={(e) => updateDetail('is_24_hours', e.target.checked)}
              />
              <label htmlFor="is24h">Open 24 hours</label>
            </div>
            {!details.is_24_hours ? (
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Opens at</label>
                  <input
                    className={styles.input}
                    type="time"
                    value={details.opens_at}
                    onChange={(e) => updateDetail('opens_at', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Closes at</label>
                  <input
                    className={styles.input}
                    type="time"
                    value={details.closes_at}
                    onChange={(e) => updateDetail('closes_at', e.target.value)}
                  />
                </div>
              </div>
            ) : null}
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Cancel
              </button>
              <button className={styles.btnPrimary} onClick={handleSaveDetails} disabled={saving}>
                {saving ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </>
        ) : tab === 'prices' ? (
          <>
            <div className={styles.grid2}>
              {FUEL_TYPE_CODES.map((code) => (
                <div className={styles.field} key={code}>
                  <label className={styles.label}>{code} price (₹)</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    value={prices[code] || ''}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder="Not set"
                  />
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Close
              </button>
              <button className={styles.btnPrimary} onClick={handleSavePrices} disabled={saving}>
                {saving ? 'Saving…' : 'Save prices'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.facilityGrid}>
              {FACILITY_CODES.map((code) => (
                <div className={styles.facilityItem} key={code}>
                  <input
                    type="checkbox"
                    id={`fac-${code}`}
                    checked={facilities.has(code)}
                    onChange={() => toggleFacility(code)}
                  />
                  <label htmlFor={`fac-${code}`}>{facilityLabel(code)}</label>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Close
              </button>
              <button className={styles.btnPrimary} onClick={handleSaveFacilities} disabled={saving}>
                {saving ? 'Saving…' : 'Save facilities'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
