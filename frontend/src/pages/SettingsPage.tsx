import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Sliders, 
  Plus, 
  ShieldCheck, 
  Save, 
  Radio, 
  Trash2 
} from 'lucide-react';
import { api } from '../api/client';
import { User, UserRole } from '../types';
import { Modal } from '../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // User form
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');

  const fetchData = async () => {
    try {
      const [u, t] = await Promise.all([api.getUsers(), api.getThresholds()]);
      setUsers(u);
      setThresholds(t);
    } catch (err) {
      console.error("Settings fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async () => {
    if (!email || !password || !fullName) return;
    try {
      await api.createUser({
        email,
        full_name: fullName,
        password,
        role,
        is_active: true
      });
      setIsAddUserOpen(false);
      setEmail('');
      setFullName('');
      setPassword('');
      fetchData();
    } catch (err: any) {
      alert(`User creation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          System Administration & RBAC Settings
        </h2>
        <p className="text-xs text-slate-400">Configure role-based access controls and parameter safety threshold matrices</p>
      </div>

      {/* User Management Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              User Access Management (RBAC)
            </h3>
            <p className="text-xs text-slate-400">Authorize Administrators, Operators, and Viewers</p>
          </div>
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{u.full_name}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'ADMINISTRATOR'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : u.role === 'OPERATOR'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-emerald-400 font-medium">Active</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threshold Matrix Overview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Regulatory Threshold Standards Matrix
            </h3>
            <p className="text-xs text-slate-400">Permissible baseline limits configured for water quality assessment engine</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold z-10">
              <tr>
                <th className="py-2.5 px-3">Water Source</th>
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3">Normal Safe Range</th>
                <th className="py-2.5 px-3">Warning Range</th>
                <th className="py-2.5 px-3">Critical Limits</th>
                <th className="py-2.5 px-3">WHO / BIS Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {thresholds.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{t.water_source_type}</td>
                  <td className="py-2.5 px-3 font-medium text-cyan-300">{t.display_name} ({t.unit})</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">
                    {t.min_normal ?? '0'} – {t.max_normal ?? '∞'} {t.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">
                    {t.min_warning ?? '0'} – {t.max_warning ?? '∞'} {t.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-rose-400">
                    &lt; {t.min_critical ?? 'N/A'} or &gt; {t.max_critical ?? 'N/A'} {t.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {t.standard_limit} {t.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Provision Authorized System User"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Full Legal Name</label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
            <input
              type="email"
              placeholder="e.g. jane.doe@waterauthority.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Access Role & Permissions</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="ADMINISTRATOR">Administrator (Full control, provision devices, thresholds, users)</option>
              <option value="OPERATOR">Monitoring Operator (Acknowledge alerts, generate reports, view feeds)</option>
              <option value="VIEWER">Auditor / Viewer (Read-only access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsAddUserOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              disabled={!email || !password || !fullName}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              Save User
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
