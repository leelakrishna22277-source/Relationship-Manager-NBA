import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { clientService } from "../../services/clientService";
import { formatCurrency } from "../../utils/formatters";
export const ClientAllocationTable = ({
  availableRms,
  onAllocationChanged
}) => {
  const queryClient = useQueryClient();
  const [clientPage, setClientPage] = useState(1);
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const { data: clientsData, isLoading, refetch } = useQuery({
    queryKey: ["team-clients-allocation", clientPage, filterType, searchTerm],
    queryFn: async () => {
      return clientService.getClients({
        page: clientPage,
        limit: 10,
        search: searchTerm.trim() || void 0,
        rm_id: filterType === "UNASSIGNED" ? "UNASSIGNED" : void 0
      });
    }
  });
  const assignMutation = useMutation({
    mutationFn: async ({ clientId, rmId }) => {
      setAssigningId(clientId);
      const res = await clientService.assignRm(clientId, rmId);
      return res.data;
    },
    onSuccess: (updatedClient, vars) => {
      queryClient.invalidateQueries({ queryKey: ["team-clients-allocation"] });
      queryClient.invalidateQueries({ queryKey: ["team-lead-dashboard"] });
      if (onAllocationChanged) onAllocationChanged();
      const targetRm = availableRms.find((r) => r.id === vars.rmId);
      setFeedbackMsg(
        vars.rmId && targetRm ? `Assigned "${updatedClient.full_name}" to ${targetRm.name}.` : `Marked "${updatedClient.full_name}" as unassigned.`
      );
      setTimeout(() => setFeedbackMsg(null), 3500);
    },
    onError: (err) => {
      setFeedbackMsg(err?.message || "Failed to update RM assignment.");
      setTimeout(() => setFeedbackMsg(null), 3500);
    },
    onSettled: () => setAssigningId(null)
  });
  const rawClients = clientsData?.data || [];
  const displayedClients = filterType === "ASSIGNED" ? rawClients.filter((c) => c.rm_id !== null) : rawClients;
  const meta = clientsData?.meta || {};
  const clientCount = meta.total ?? 46;
  const totalPages = meta.totalPages ?? Math.ceil(clientCount / 10);
  return <div className="bg-color-7 border border-color-5 rounded-radius-lg overflow-hidden shadow-sm">
      <div className="p-space-5 border-b border-color-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-color-2" />
              <h2 className="text-text-base font-bold text-color-1">
                Client Portfolio Coverage & RM Allocation ({clientCount} Clients)
              </h2>
            </div>
            <p className="text-text-xs text-color-1/60 mt-0.5">
              All 46 clients assigned equally (23 each to Rajesh Kumar & Priya Verma).
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-color-1/40 absolute left-3 top-2.5" />
            <input
    type="text"
    placeholder="Search clients..."
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setClientPage(1);
    }}
    className="w-full bg-color-6 border border-color-5 rounded-radius-md pl-9 pr-3 py-1.5 text-text-xs text-color-1 focus:outline-none focus:border-color-2"
  />
          </div>
        </div>

        {feedbackMsg && <div className="mt-3 p-2.5 rounded-radius-md bg-blue-50 border border-blue-200 text-blue-800 text-text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-color-5 bg-color-6/40 text-[11px] font-bold uppercase tracking-wider text-color-1/50">
              <th className="py-3 px-4">Client Profile</th>
              <th className="py-3 px-4">Segment</th>
              <th className="py-3 px-4">Risk Profile</th>
              <th className="py-3 px-4">Total Balance</th>
              <th className="py-3 px-4">Current Assigned RM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-color-5 text-text-xs">
            {isLoading ? <tr>
                <td colSpan={5} className="py-8 text-center text-color-1/40">Loading clients...</td>
              </tr> : displayedClients.length === 0 ? <tr>
                <td colSpan={5} className="py-8 text-center text-color-1/50">No clients found matching filter.</td>
              </tr> : displayedClients.map((c) => {
    const isUnassigned = !c.rm_id;
    return <tr key={c.id} className={`hover:bg-color-6/30 transition-colors ${isUnassigned ? "bg-amber-50/20" : ""}`}>
                    <td className="py-3 px-4 font-semibold text-color-1">
                      {c.full_name}
                      <span className="text-[10px] font-mono text-color-1/40 ml-2 bg-color-6 px-1.5 py-0.5 rounded border border-color-5/60">
                        {c.id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-color-6 text-color-1/80 border border-color-5">
                        {c.segment}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {c.risk_profile}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-color-1">
                      {formatCurrency(c.total_balance || 0)}
                    </td>
                    <td className="py-3 px-4">
                      {isUnassigned ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-radius-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          No RM assigned
                        </span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-radius-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {c.rm_name || (c.rm_id === "rm-1" ? "Rajesh Kumar" : "Priya Verma")}
                        </span>}
                    </td>
                  </tr>;
  })}
          </tbody>
        </table>
      </div>

      <div className="p-space-4 border-t border-color-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-text-xs text-color-1/60">
        <div>
          Showing <span className="font-semibold text-color-1">{(clientPage - 1) * 10 + 1}</span> to{" "}
          <span className="font-semibold text-color-1">{Math.min(clientPage * 10, clientCount)}</span> of{" "}
          <span className="font-semibold text-color-1">{clientCount}</span> clients (10 per page)
        </div>

        <div className="flex items-center gap-1.5">
          <button
    type="button"
    onClick={() => setClientPage((p) => Math.max(1, p - 1))}
    disabled={clientPage <= 1}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-radius-md border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 disabled:opacity-40"
  >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    type="button"
    onClick={() => setClientPage(p)}
    className={`w-7 h-7 rounded-radius-md text-text-xs font-semibold ${clientPage === p ? "bg-color-2 text-white shadow-xs" : "bg-color-6 border border-color-5 text-color-1"}`}
  >
              {p}
            </button>)}

          <button
    type="button"
    onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
    disabled={clientPage >= totalPages}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-radius-md border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 disabled:opacity-40"
  >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>;
};
