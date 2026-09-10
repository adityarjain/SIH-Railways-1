import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { usePlan } from '../../context/PlanContext';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  MapPin,
  Calendar,
} from 'lucide-react';

export const GeneralPortal = () => {
  const { verifications, submitVerification } = usePlan();

  const [modalState, setModalState] = useState(null); // { taskId, type: 'false_closure' | 'reject' | 'approve' }
  const [commentText, setCommentText] = useState('');

  const workCards = [
    {
      taskId: 'TASK-000005',
      title: 'Rail Grinding & Surface Profile Restoration',
      department: 'Electrical / TRD',
      sectionId: 'SEC-0004',
      corridorName: 'Delhi–Agra Corridor (COR-001)',
      date: '07 Sep 2026',
      blocks: 'BLK-009637 + BLK-009638',
      crew: 'TEAM-013',
      reportedCompletedAt: '07 Sep 2026, 03:25 IST',
    },
    {
      taskId: 'TASK-000421',
      title: 'Track Geometry Tamping & Joint Packing',
      department: 'Track / Civil Engineering',
      sectionId: 'SEC-0092',
      corridorName: 'Mumbai–Surat Corridor (COR-010)',
      date: '04 Sep 2026',
      blocks: 'BLK-001093',
      crew: 'TEAM-007',
      reportedCompletedAt: '04 Sep 2026, 02:10 IST',
    },
    {
      taskId: 'TASK-018159',
      title: 'Coach Equipment & Overlap Siding Overhaul',
      department: 'Track / Civil Engineering',
      sectionId: 'SEC-0073',
      corridorName: 'Bhopal–Itarsi Corridor (COR-008)',
      date: '05 Sep 2026',
      blocks: 'BLK-000867',
      crew: 'TEAM-005',
      reportedCompletedAt: '05 Sep 2026, 06:15 IST',
    },
  ];

  const handleOpenModal = (taskId, type) => {
    setModalState({ taskId, type });
    setCommentText('');
  };

  const handleConfirmAction = (e) => {
    e.preventDefault();
    if (modalState) {
      submitVerification(modalState.taskId, modalState.type, commentText);
      setModalState(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
          <FileCheck size={14} className="text-blue-500" />
          <span>Independent Track Inspection & Verification</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
          Verify Completed Work
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Public and field auditor portal to certify completed maintenance possessions or report
          incorrect closures. Demo records are held for the current session only — nothing is written
          to an external audit register and no notifications are sent.
        </p>
      </div>

      {/* Cards List (Section 22 requirement) */}
      <div className="space-y-4">
        {workCards.map((card) => {
          const verification = verifications[card.taskId];

          return (
            <div
              key={card.taskId}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 transition-all hover:border-slate-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{card.taskId}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-800">{card.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {card.department} • {card.corridorName}
                  </p>
                </div>

                {verification ? (
                  <Badge
                    variant={
                      verification.status === 'Approved'
                        ? 'success'
                        : verification.status.includes('False Closure')
                        ? 'danger'
                        : 'warning'
                    }
                    size="md"
                  >
                    {verification.status}
                  </Badge>
                ) : (
                  <Badge variant="Pending" size="sm">Awaiting Independent Verification</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-mono text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Section</span>
                  <span className="font-bold text-slate-900">{card.sectionId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Execution Date</span>
                  <span className="font-bold text-slate-900">{card.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Block Possession</span>
                  <span className="font-bold text-slate-900">{card.blocks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Reported Cleared</span>
                  <span className="font-bold text-slate-900">{card.reportedCompletedAt.split(',')[1]}</span>
                </div>
              </div>

              {verification && verification.comments && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700">Verification Comments:</span>
                  <p className="text-slate-600 font-mono text-[11px]">{verification.comments}</p>
                </div>
              )}

              {/* 3 Action Buttons (Section 22 requirement) */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => handleOpenModal(card.taskId, 'approve')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve Work</span>
                </button>

                <button
                  onClick={() => handleOpenModal(card.taskId, 'reject')}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors"
                >
                  Reject
                </button>

                <button
                  onClick={() => handleOpenModal(card.taskId, 'false_closure')}
                  className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle size={14} />
                  <span>Report False Closure</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* False Closure & Action Modal */}
      <Modal
        isOpen={Boolean(modalState)}
        onClose={() => setModalState(null)}
        title={
          modalState?.type === 'false_closure'
            ? 'Report False Track Closure'
            : modalState?.type === 'approve'
            ? 'Approve Track Work Certification'
            : 'Reject Work Completion'
        }
        subtitle={`Task: ${modalState?.taskId}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmAction} className="space-y-4 text-xs">
          {modalState?.type === 'false_closure' && (
            <div className="p-3 bg-red-50 text-red-950 rounded-lg border border-red-200 space-y-1">
              <span className="font-bold block">What is False Closure?</span>
              <p className="text-[11px] leading-relaxed">
                &ldquo;Work was marked completed, but the work was not actually completed or was incorrectly closed without restoring physical track clearance.&rdquo;
              </p>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {modalState?.type === 'false_closure'
                ? 'Mandatory Inspection Reason / Evidence:'
                : 'Auditor Verification Comments (Optional):'}
            </label>
            <textarea
              rows={3}
              required={modalState?.type === 'false_closure' || modalState?.type === 'reject'}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                modalState?.type === 'false_closure'
                  ? 'Describe physical track defect, lingering equipment, or incomplete weld grinding observed...'
                  : 'Enter certification notes or inspection reference code...'
              }
              className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalState(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-lg text-white font-bold shadow-xs ${
                modalState?.type === 'false_closure'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Submit Report
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
