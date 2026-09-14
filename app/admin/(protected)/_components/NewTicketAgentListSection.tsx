"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Tenant, Game, Ticket } from "@/types";

interface Props {
  tenantId: string;
  game: Game | null;
  tickets: any[]; // Using any[] because Ticket type doesn't have agents(name) and created_at yet
  agents?: any[];
}

export function NewTicketAgentListSection({ tenantId, game, tickets, agents = [] }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"ticket" | "agent">("ticket");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("");
  const [addAgentError, setAddAgentError] = useState<string | null>(null);

  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [editAgentName, setEditAgentName] = useState("");
  const [editAgentPassword, setEditAgentPassword] = useState("");
  const [editAgentWhatsapp, setEditAgentWhatsapp] = useState("");
  const [editAgentTelegram, setEditAgentTelegram] = useState("");
  const [editAgentSms, setEditAgentSms] = useState("");
  const [editAgentEmail, setEditAgentEmail] = useState("");
  const [editAgentFacebook, setEditAgentFacebook] = useState("");

  const handleAddAgent = async () => {
    setAddAgentError(null);
    if (!newAgentName.trim() || !newAgentPassword.trim()) {
      setAddAgentError("Please enter agent name and password.");
      return;
    }
    showLoader("Adding Agent...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.post(`/tenants/${tenantId}/agents`, {
        name: newAgentName,
        password: newAgentPassword,
      }, { headers });

      showToast("Agent added successfully!", "success");
      setNewAgentName("");
      setNewAgentPassword("");
      router.refresh();
    } catch (e: any) {
      let msg = e.message || "Failed to add agent";
      if (e.body?.error?.message) {
        msg = e.body.error.message;
      } else if (e.body?.message) {
        msg = e.body.message;
      }
      setAddAgentError(msg);
    } finally {
      hideLoader();
    }
  };

  if (!game) {
    return null;
  }

  // Filter booked/confirmed tickets
  const bookedTickets = tickets.filter((t) => t.status === "booked" || t.status === "confirmed");

  // Search filter
  const displayTickets = bookedTickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const tnoMatch = t.ticket_number.toString().includes(q);
    const nameMatch = t.player_name?.toLowerCase().includes(q);
    const phoneMatch = t.player_phone?.toLowerCase().includes(q);
    return tnoMatch || nameMatch || phoneMatch;
  });

  const openEditModal = (ticket: any) => {
    setEditingTicket(ticket);
    setEditName(ticket.player_name || "");
    setEditPhone(ticket.player_phone || "");
  };

  const closeEditModal = () => {
    setEditingTicket(null);
    setEditName("");
    setEditPhone("");
  };

  const handleSave = async () => {
    if (!editingTicket) return;
    showLoader("Saving ticket info...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(
        `/tenants/${tenantId}/games/${game.id}/tickets/${editingTicket.id}`,
        {
          playerName: editName,
          playerPhone: editPhone,
        },
        { headers }
      );

      showToast("Ticket updated successfully!", "success");
      closeEditModal();
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to save ticket", "error");
    } finally {
      hideLoader();
    }
  };

  const handleRemove = async () => {
    if (!editingTicket) return;
    if (!window.confirm(`Are you sure you want to unbook ticket #${editingTicket.ticket_number}? This cannot be undone.`)) {
      return;
    }
    
    showLoader("Removing ticket...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.post(
        `/tenants/${tenantId}/games/${game.id}/tickets/${editingTicket.id}/unbook`,
        {},
        { headers }
      );

      showToast("Ticket removed successfully!", "success");
      closeEditModal();
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to remove ticket", "error");
    } finally {
      hideLoader();
    }
  };

  const openAgentEditModal = (agent: any) => {
    setEditingAgent(agent);
    setEditAgentName(agent.name || "");
    setEditAgentPassword(agent.plain_password || "");
    setEditAgentWhatsapp(agent.whatsapp_number || "");
    setEditAgentTelegram(agent.telegram_username || "");
    setEditAgentSms(agent.sms_number || "");
    setEditAgentEmail(agent.email_id || "");
    setEditAgentFacebook(agent.facebook_id || "");
  };

  const closeAgentEditModal = () => {
    setEditingAgent(null);
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;
    showLoader("Saving Agent...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenantId}/agents/${editingAgent.id}`, {
        name: editAgentName,
        password: editAgentPassword,
        whatsapp_number: editAgentWhatsapp,
        telegram_username: editAgentTelegram,
        sms_number: editAgentSms,
        email_id: editAgentEmail,
        facebook_id: editAgentFacebook
      }, { headers });

      showToast("Agent updated successfully!", "success");
      closeAgentEditModal();
      router.refresh();
    } catch (e: any) {
      let msg = e.message || "Failed to update agent";
      if (e.body?.error?.message) {
        msg = e.body.error.message;
      } else if (e.body?.message) {
        msg = e.body.message;
      }
      showToast(msg, "error");
    } finally {
      hideLoader();
    }
  };

  const handleRemoveAgent = async () => {
    if (!editingAgent) return;
    if (!window.confirm("Are you sure you want to delete this agent?")) return;
    
    showLoader("Deleting Agent...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.del(`/tenants/${tenantId}/agents/${editingAgent.id}`, { headers });

      showToast("Agent deleted successfully!", "success");
      closeAgentEditModal();
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to delete agent", "error");
    } finally {
      hideLoader();
    }
  };


  // Format date helper
  const formatModalDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, '0');
      
      return `${day}-${month}-${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return "";
    }
  };

  const getAgentDisplay = (ticket: any) => {
    if (ticket.booked_via === 'admin') return 'Admin';
    if (ticket.agents?.name) return ticket.agents.name;
    return 'Agent';
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
          TICKET/AGENT LIST
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4 justify-center">
        <button
          onClick={() => setActiveTab("ticket")}
          className={`flex-1 max-w-[200px] py-2 font-bold uppercase rounded-md text-sm md:text-base border border-red-700 ${
            activeTab === "ticket" ? "bg-[#ff0000] text-white" : "bg-black text-white"
          }`}
        >
          TICKET LIST
        </button>
        <button
          onClick={() => setActiveTab("agent")}
          className={`flex-1 max-w-[200px] py-2 font-bold uppercase rounded-md text-sm md:text-base border border-black ${
            activeTab === "agent" ? "bg-[#ff0000] text-white" : "bg-black text-white"
          }`}
        >
          AGENT LIST
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="Enter keyword"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-center py-2.5 rounded-md text-black font-semibold outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Tab Content */}
      <div className="px-2 pb-2">
        {activeTab === "agent" ? (
          <div className="bg-white border-x border-t border-black">
            {/* Table Header */}
            <div className="flex border-b border-black h-10 bg-black">
              <div className="w-[15%] flex items-center px-2 border-r border-black font-black text-white text-[11px] sm:text-xs tracking-wider">
                No.
              </div>
              <div className="w-[45%] flex items-center px-2 border-r border-black font-black text-white text-[11px] sm:text-xs tracking-wider">
                NAME
              </div>
              <div className="w-[25%] flex items-center px-2 border-r border-black font-black text-white text-[11px] sm:text-xs tracking-wider">
                TOTAL SOLD
              </div>
              <div className="w-[15%] flex items-center justify-center px-2 font-black text-white text-[11px] sm:text-xs tracking-wider">
                EDIT
              </div>
            </div>

            {/* Add Agent Row */}
            <div className="flex border-b border-black">
              <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2">
                ***
              </div>
              <div className="w-[45%] flex items-center px-2 border-r border-black py-1">
                <input
                  type="text"
                  placeholder="Agent Name"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full font-bold text-gray-500 text-[12px] sm:text-sm outline-none placeholder-gray-400"
                />
              </div>
              <div className="w-[25%] flex items-center px-2 border-r border-black py-1">
                <input
                  type="text"
                  placeholder="Agent Password"
                  value={newAgentPassword}
                  onChange={(e) => setNewAgentPassword(e.target.value)}
                  className="w-full font-bold text-gray-500 text-[12px] sm:text-sm outline-none placeholder-gray-400"
                />
              </div>
              <div className="w-[15%] flex items-center justify-center px-2 py-2">
                <button
                  onClick={handleAddAgent}
                  className="text-blue-600 font-black text-[12px] sm:text-sm hover:underline"
                >
                  ADD
                </button>
              </div>
            </div>

            {/* Agent Add Error */}
            {addAgentError && (
              <div className="border-b border-black bg-red-100 p-2 text-center text-red-600 font-bold text-xs sm:text-sm">
                {addAgentError}
              </div>
            )}

            {/* Agent List Rows */}
            {agents.map((agent, index) => {
              const ticketsSold = bookedTickets.filter(
                (t) => t.booked_via === 'agent' && (t.agent_id === agent.id || (t.agents && t.agents.name === agent.name))
              ).length;

              return (
                <div key={agent.id} className="flex border-b border-black">
                  <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2">
                    {index + 1}
                  </div>
                  <div className="w-[45%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {agent.name}
                  </div>
                  <div className="w-[25%] flex items-center justify-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2">
                    {ticketsSold}
                  </div>
                <div className="w-[15%] flex items-center justify-center px-2 py-2">
                    <button
                      onClick={() => openAgentEditModal(agent)}
                      className="text-blue-600 font-black text-[12px] sm:text-sm hover:underline"
                    >
                      EDT
                    </button>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border-x border-t border-black">
            {/* Table Header */}
            <div className="flex border-b border-black h-10 bg-black">
              <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-white text-[11px] sm:text-xs">
                TNO
              </div>
              <div className="w-[45%] flex items-center px-2 border-r border-black font-bold text-white text-[11px] sm:text-xs">
                NAME
              </div>
              <div className="w-[25%] flex items-center px-2 border-r border-black font-bold text-white text-[11px] sm:text-xs">
                PHONE
              </div>
              <div className="w-[15%] flex items-center justify-center px-2 font-bold text-white text-[11px] sm:text-xs">
                EDIT
              </div>
            </div>

            {/* Table Body */}
            {displayTickets.length === 0 ? (
              <div className="p-4 text-center font-bold text-gray-500 border-b border-black">
                No tickets found.
              </div>
            ) : (
              displayTickets.map((ticket) => (
                <div key={ticket.id} className="flex border-b border-black">
                  <div className="w-[15%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis">
                    {ticket.ticket_number}
                  </div>
                  <div className="w-[45%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {ticket.player_name || "-"}
                  </div>
                  <div className="w-[25%] flex items-center px-2 border-r border-black font-bold text-black text-[12px] sm:text-sm py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {ticket.player_phone || "-"}
                  </div>
                  <div className="w-[15%] flex items-center justify-center px-2 py-2">
                    <button
                      onClick={() => openEditModal(ticket)}
                      className="text-blue-600 font-black text-[12px] sm:text-sm hover:underline"
                    >
                      EDT
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Modal Overlay */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#0b00c4] border-2 border-white rounded-md w-full max-w-sm flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="bg-[#0b00c4] h-14 flex items-center justify-center relative">
              <h2 className="text-white font-bold text-lg md:text-xl">Ticket Details</h2>
              <button 
                onClick={closeEditModal}
                className="absolute right-2 top-2 bg-[#ff5555] hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl"
              >
                ×
              </button>
            </div>

            {/* Modal Table Container */}
            <div className="px-2 pb-2">
              <div className="flex border-b border-black h-10 bg-black">
                <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-white text-xs">
                  DATA TYPE
                </div>
                <div className="w-[70%] flex items-center px-3 font-bold text-white text-xs">
                  DATA VALUE
                </div>
              </div>

              <div className="bg-white border-x border-black">
                {/* TNO (read-only) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    TNO
                  </div>
                  <div className="w-[70%] flex items-center px-3 font-bold text-black text-[13px] py-2">
                    {editingTicket.ticket_number}
                  </div>
                </div>

                {/* DATE (read-only) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    DATE
                  </div>
                  <div className="w-[70%] flex items-center px-3 font-bold text-black text-[13px] py-2">
                    {formatModalDate(editingTicket.created_at)}
                  </div>
                </div>

                {/* NAME (editable) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    NAME
                  </div>
                  <div className="w-[70%] flex items-center px-2 py-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full font-bold text-black text-[13px] outline-none border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* PHONE (editable) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    PHONE
                  </div>
                  <div className="w-[70%] flex items-center px-2 py-1">
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full font-bold text-black text-[13px] outline-none border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* AGENT (read-only) */}
                <div className="flex border-b border-black">
                  <div className="w-[30%] flex items-center px-3 border-r border-black font-bold text-black text-[13px] py-2 uppercase">
                    AGENT
                  </div>
                  <div className="w-[70%] flex items-center px-3 font-bold text-black text-[13px] py-2">
                    {getAgentDisplay(editingTicket)}
                  </div>
                </div>
              </div>

              {/* Action Row */}
              <div className="flex bg-[#0b00c4] pt-2 h-14">
                <button 
                  onClick={handleRemove}
                  className="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold uppercase text-sm flex items-center justify-center transition-colors border border-gray-600 mr-1 rounded"
                >
                  REMOVE
                </button>
                <button 
                  onClick={handleSave}
                  className="w-1/2 bg-[#ff0000] hover:bg-red-700 text-white font-bold uppercase text-sm flex items-center justify-center transition-colors border border-red-800 ml-1 rounded"
                >
                  SAVE
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Agent Edit Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="bg-[#0b00c4] w-full max-w-sm rounded-md overflow-hidden shadow-2xl relative border-2 border-blue-600 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
              <h3 className="text-white font-black text-lg tracking-wide uppercase">
                Agent Details
              </h3>
              <button 
                onClick={closeAgentEditModal}
                className="absolute right-2 top-2 bg-[#ff5555] hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="flex border-b border-black h-10 bg-black">
                <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-white text-xs">
                  DATA TYPE
                </div>
                <div className="w-[60%] flex items-center px-3 font-bold text-white text-xs">
                  DATA VALUE
                </div>
              </div>

              <div className="bg-white border-x border-black">
                {/* DATE */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    DATE
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {formatModalDate(editingAgent.created_at)}
                  </div>
                </div>

                {/* NAME */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    NAME
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentName} onChange={(e) => setEditAgentName(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* Whatsapp Number */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Whatsapp Number
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentWhatsapp} onChange={(e) => setEditAgentWhatsapp(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* Telegram */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Telegram user name
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentTelegram} onChange={(e) => setEditAgentTelegram(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* SMS */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Sms number
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentSms} onChange={(e) => setEditAgentSms(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* Email */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Email id
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentEmail} onChange={(e) => setEditAgentEmail(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* Facebook */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2">
                    Facebook id
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentFacebook} onChange={(e) => setEditAgentFacebook(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* Password */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    PASSWORD
                  </div>
                  <div className="w-[60%] flex items-center px-2 py-1">
                    <input type="text" value={editAgentPassword} onChange={(e) => setEditAgentPassword(e.target.value)} className="w-full font-bold text-black text-[12px] outline-none border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>

                {/* Total Sold */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    TOTAL SOLD
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {bookedTickets.filter(t => t.booked_via === 'agent' && (t.agent_id === editingAgent.id || (t.agents && t.agents.name === editingAgent.name))).length}
                  </div>
                </div>

                {/* Total Earning */}
                <div className="flex border-b border-black">
                  <div className="w-[40%] flex items-center px-3 border-r border-black font-bold text-black text-[12px] py-2 uppercase">
                    TOTAL EARNING
                  </div>
                  <div className="w-[60%] flex items-center px-3 font-bold text-black text-[12px] py-2">
                    {bookedTickets.filter(t => t.booked_via === 'agent' && (t.agent_id === editingAgent.id || (t.agents && t.agents.name === editingAgent.name))).length * (game?.agency_commission || 0)} INR
                  </div>
                </div>
              </div>

              {/* Action Row */}
              <div className="flex pt-2 h-12 mb-4">
                <button onClick={handleRemoveAgent} className="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold uppercase text-sm flex items-center justify-center mr-1 rounded">REMOVE</button>
                <button onClick={handleSaveAgent} className="w-1/2 bg-[#ff0000] hover:bg-red-700 text-white font-bold uppercase text-sm flex items-center justify-center ml-1 rounded">SAVE</button>
              </div>

              {/* Tickets booked by this agent */}
              <div className="bg-white border border-black mb-2">
                <div className="flex border-b border-black h-8 bg-black">
                  <div className="w-[20%] flex items-center px-2 border-r border-black font-bold text-white text-[10px]">TNO</div>
                  <div className="w-[40%] flex items-center px-2 border-r border-black font-bold text-white text-[10px]">NAME</div>
                  <div className="w-[25%] flex items-center px-2 border-r border-black font-bold text-white text-[10px]">PHONE</div>
                  <div className="w-[15%] flex items-center justify-center px-2 font-bold text-white text-[10px]">EDIT</div>
                </div>
                {bookedTickets.filter(t => t.booked_via === 'agent' && (t.agent_id === editingAgent.id || (t.agents && t.agents.name === editingAgent.name))).length === 0 ? (
                  <div className="p-2 text-center text-xs font-bold text-gray-500">No tickets found.</div>
                ) : (
                  bookedTickets.filter(t => t.booked_via === 'agent' && (t.agent_id === editingAgent.id || (t.agents && t.agents.name === editingAgent.name))).map((ticket) => (
                    <div key={ticket.id} className="flex border-b border-black last:border-b-0">
                      <div className="w-[20%] flex items-center px-2 border-r border-black font-bold text-black text-[11px] py-1">{ticket.ticket_number}</div>
                      <div className="w-[40%] flex items-center px-2 border-r border-black font-bold text-black text-[11px] py-1 truncate">{ticket.player_name || "-"}</div>
                      <div className="w-[25%] flex items-center px-2 border-r border-black font-bold text-black text-[11px] py-1 truncate">{ticket.player_phone || "-"}</div>
                      <div className="w-[15%] flex items-center justify-center px-1 py-1">
                        <button onClick={() => { closeAgentEditModal(); openEditModal(ticket); }} className="text-blue-600 font-bold text-[10px] hover:underline">EDT</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
