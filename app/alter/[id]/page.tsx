'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ROLES = ['Service Manager', 'Fleet Manager', 'Ship Operator', 'Port Buyer', 'Broker', 'Other'];
const SEGMENTS = ['LPG', 'LNG', 'Tankers', 'Bulk', 'Container', 'Offshore', 'Port infrastructure', 'Mixed'];
const REGIONS = ['Middle East', 'SE Asia', 'Europe', 'West Africa', 'Americas', 'Global'];
const FOCUS = ['Fleet movements and S&P', 'Drydock schedules', 'Market rates', 'Tenders and procurement', 'Sanctions and risk', 'Regulatory updates', 'All'];

export default function AlterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('');
  const [segments, setSegments] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>([]);
  const [company, setCompany] = useState('');
  const [watchlist, setWatchlist] = useState('');

  useEffect(() => {
    fetch(`/api/profile/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Profile not found');
        return res.json();
      })
      .then((data) => {
        setRole(data.role || '');
        setSegments(data.segments || []);
        setRegions(data.regions || []);
        setFocus(data.focus || []);
        setCompany(data.company || '');
        setWatchlist(Array.isArray(data.watchlist) ? data.watchlist.join('\n') : '');
        setLoading(false);
      })
      .catch(() => {
        setError('Profile not found');
        setLoading(false);
      });
  }, [id]);

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const watchlistItems = watchlist
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const res = await fetch(`/api/alter/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, segments, regions, focus, company, watchlist: watchlistItems }),
      });

      if (res.status === 403) {
        setError('Tweak limit reached for this period');
        return;
      }

      const data = await res.json();
      if (data.success) {
        router.push(`/profile/${id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1424] text-[#f0f4f8] flex items-center justify-center">
        <p className="text-[#8fa8c4]">Loading profile...</p>
      </div>
    );
  }

  if (error && !role) {
    return (
      <div className="min-h-screen bg-[#0b1424] text-[#f0f4f8] flex items-center justify-center">
        <div className="bg-[#132742] rounded-xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-[#8fa8c4]">No subscriber profile exists for this ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1424] text-[#f0f4f8]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Update Intel Profile</h1>
        <p className="text-[#8fa8c4] mb-10">
          Modify your preferences below and submit your profile update.
        </p>

        {error && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl px-4 py-3 mb-6 text-[#ef4444]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Q1 - Role */}
          <section className="bg-[#132742] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">1. What is your role?</h2>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    role === r
                      ? 'bg-[#53b1c1] border-[#53b1c1] text-white'
                      : 'border-[#8fa8c4]/30 text-[#8fa8c4] hover:border-[#53b1c1]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Q2 - Segments */}
          <section className="bg-[#132742] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">2. Vessel / Cargo Segments</h2>
            <div className="flex flex-wrap gap-3">
              {SEGMENTS.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={segments.includes(s)}
                    onChange={() => toggleItem(segments, setSegments, s)}
                    className="accent-[#53b1c1] w-4 h-4"
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Q3 - Regions */}
          <section className="bg-[#132742] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">3. Geographic Focus</h2>
            <div className="flex flex-wrap gap-3">
              {REGIONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regions.includes(r)}
                    onChange={() => toggleItem(regions, setRegions, r)}
                    className="accent-[#53b1c1] w-4 h-4"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Q4 - Focus */}
          <section className="bg-[#132742] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">4. Primary Intel Interest</h2>
            <div className="flex flex-wrap gap-3">
              {FOCUS.map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={focus.includes(f)}
                    onChange={() => toggleItem(focus, setFocus, f)}
                    className="accent-[#53b1c1] w-4 h-4"
                  />
                  <span className="text-sm">{f}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Q5 - Company */}
          <section className="bg-[#132742] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              5. Company name <span className="text-[#8fa8c4] font-normal text-sm">(optional)</span>
            </h2>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-[#0b1424] border border-[#8fa8c4]/30 rounded-lg px-4 py-2 text-[#f0f4f8] focus:outline-none focus:border-[#53b1c1]"
              placeholder="Your company"
            />
          </section>

          {/* Q6 - Watchlist */}
          <section className="bg-[#132742] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">6. Watchlist items</h2>
            <textarea
              value={watchlist}
              onChange={(e) => setWatchlist(e.target.value)}
              rows={4}
              className="w-full bg-[#0b1424] border border-[#8fa8c4]/30 rounded-lg px-4 py-2 text-[#f0f4f8] focus:outline-none focus:border-[#53b1c1] resize-none"
              placeholder="e.g. LPG carrier dockings West Africa, Alfa Laval competitor activity"
            />
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[#53b1c1] hover:bg-[#47a0af] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Profile Update'}
          </button>
        </form>
      </div>
    </div>
  );
}
