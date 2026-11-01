import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileCheck, 
  Plus, 
  Sparkles 
} from 'lucide-react';
import { api } from '../api/client';
import { Station } from '../types';
import { Modal } from '../components/common/Modal';

export const ReportsPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [stationId, setStationId] = useState<number | null>(null);
  const [reportTitle, setReportTitle] = useState("AquaGuard Comprehensive Water Assessment");
  const [fileFormat, setFileFormat] = useState<"PDF" | "CSV">("PDF");
  const [daysBack, setDaysBack] = useState<number>(7);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const [stns, reps] = await Promise.all([api.getStations(), api.getReports()]);
        setStations(stns);
        setReports(reps);
        if (stns.length > 0) setStationId(stns[0].id);
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    }
    init();
  }, []);

  const handleGenerate = async () => {
    if (!stationId) return;
    setGenerating(true);
    try {
      const end = new Date();
      const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      await api.generateReport({
        station_id: stationId,
        title: reportTitle,
        file_format: fileFormat,
        start_date: start.toISOString(),
        end_date: end.toISOString()
      });

      setIsModalOpen(false);
      await fetchReports();
    } catch (err: any) {
      alert(`Report generation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Compliance Reports & Telemetry Archival
          </h2>
          <p className="text-xs text-slate-400">Generate executive PDF summaries and raw CSV datasets with official scientific disclaimers</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-lg shadow-cyan-900/30"
        >
          <Plus className="w-4 h-4" />
          Generate New Report
        </button>
      </div>

      {/* Reports Catalog */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-base font-bold text-white mb-4">Generated Archive Documents</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Report Title</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Reporting Period</th>
                <th className="py-3 px-3">Format</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No reports generated yet. Click "Generate New Report" above to compile data.
                  </td>
                </tr>
              ) : (
                reports.map((rep) => {
                  const station = stations.find(s => s.id === rep.station_id);
                  return (
                    <tr key={rep.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-cyan-400" />
                          <span>{rep.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-300">
                        {station?.name || `Station #${rep.station_id}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {new Date(rep.start_date).toLocaleDateString()} &rarr; {new Date(rep.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rep.file_format === 'PDF' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {rep.file_format}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(rep.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href={`/api/v1/reports/download/${rep.id}`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Generation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Water Quality Assessment Report"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Document Title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Target Monitoring Station</label>
            <select
              value={stationId || ''}
              onChange={(e) => setStationId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Date Window</label>
              <select
                value={daysBack}
                onChange={(e) => setDaysBack(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value={1}>Last 24 Hours</option>
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">File Format</label>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="PDF">Executive PDF Document</option>
                <option value="CSV">Raw Telemetry CSV</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            <strong className="text-slate-300 block mb-0.5">Automated Inclusion:</strong>
            All generated reports automatically embed station metadata, parameter statistical ranges (min/max/avg), alert history, and regulatory disclaimers.
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-900/30 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Compile & Build Report"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
