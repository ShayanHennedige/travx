"use client";

import { useState, useMemo } from "react";
import { Button, Badge } from "@/components/ui";

interface GroupMember {
  id: string;
  full_name: string;
  member_type: "adult" | "child";
  room_number: number | null;
  room_category: string | null;
  age_label: string | null;
  remarks: string | null;
  date_of_birth: string | null;
}

interface RoomingListManagerProps {
  groupInquiryId: string;
  inquiryNumber: string;
  initialMembers: GroupMember[];
  totalRooms: {
    dbl: number;
    sgl: number;
    tpl: number;
    qtpl: number;
  };
  initialInterconnections?: number[][];
}

interface Room {
  id: number;
  type: "DBL" | "SGL" | "TPL" | "QTPL";
  category: string;
  maxOccupancy: number;
}

export function RoomingListManager({
  groupInquiryId,
  inquiryNumber,
  initialMembers,
  totalRooms,
  initialInterconnections = [],
}: RoomingListManagerProps) {
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [draggedMember, setDraggedMember] = useState<GroupMember | null>(null);
  
  // Interconnections: Array of room ID pairs that are interconnected
  const [interconnections, setInterconnections] = useState<number[][]>(initialInterconnections);
  const [connectingRoom, setConnectingRoom] = useState<number | null>(null);

  // Generate room boxes based on totalRooms
  const rooms = useMemo(() => {
    const roomList: Room[] = [];
    let roomId = 1;

    // Add Double Rooms (max 4 persons - can add extra beds)
    for (let i = 0; i < totalRooms.dbl; i++) {
      roomList.push({
        id: roomId++,
        type: "DBL",
        category: "Double Room",
        maxOccupancy: 4,
      });
    }

    // Add Single Rooms (max 2 persons - can add extra bed)
    for (let i = 0; i < totalRooms.sgl; i++) {
      roomList.push({
        id: roomId++,
        type: "SGL",
        category: "Single Room",
        maxOccupancy: 2,
      });
    }

    // Add Triple Rooms (max 6 persons - can add extra beds)
    for (let i = 0; i < totalRooms.tpl; i++) {
      roomList.push({
        id: roomId++,
        type: "TPL",
        category: "Triple Room",
        maxOccupancy: 6,
      });
    }

    // Add Quad Rooms (max 8 persons - can add extra beds)
    for (let i = 0; i < totalRooms.qtpl; i++) {
      roomList.push({
        id: roomId++,
        type: "QTPL",
        category: "Quad Room",
        maxOccupancy: 8,
      });
    }

    return roomList;
  }, [totalRooms]);

  // Get members assigned to a specific room
  const getMembersInRoom = (roomId: number) => {
    return members.filter((m) => m.room_number === roomId);
  };

  // Get unassigned members
  const unassignedMembers = useMemo(() => {
    return members.filter((m) => !m.room_number);
  }, [members]);

  const assignedCount = members.filter((m) => m.room_number).length;

  // Check if a room is interconnected
  const getInterconnectedRoom = (roomId: number): number | null => {
    for (const pair of interconnections) {
      if (pair[0] === roomId) return pair[1];
      if (pair[1] === roomId) return pair[0];
    }
    return null;
  };

  // Handle interconnection
  const handleInterconnectClick = (roomId: number) => {
    if (connectingRoom === null) {
      // Start connecting
      setConnectingRoom(roomId);
    } else if (connectingRoom === roomId) {
      // Cancel connecting
      setConnectingRoom(null);
    } else {
      // Check if either room is already interconnected
      const existingConnection1 = getInterconnectedRoom(connectingRoom);
      const existingConnection2 = getInterconnectedRoom(roomId);

      if (existingConnection1 !== null) {
        // Remove existing connection first
        setInterconnections((prev) =>
          prev.filter((pair) => !pair.includes(connectingRoom))
        );
      }
      if (existingConnection2 !== null) {
        // Remove existing connection first
        setInterconnections((prev) =>
          prev.filter((pair) => !pair.includes(roomId))
        );
      }

      // Create new connection
      setInterconnections((prev) => [...prev, [connectingRoom, roomId]]);
      setConnectingRoom(null);
      setHasChanges(true);
    }
  };

  // Remove interconnection
  const removeInterconnection = (roomId: number) => {
    setInterconnections((prev) =>
      prev.filter((pair) => !pair.includes(roomId))
    );
    setHasChanges(true);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, member: GroupMember) => {
    setDraggedMember(member);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", member.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnRoom = (e: React.DragEvent, room: Room) => {
    e.preventDefault();
    if (!draggedMember) return;

    const currentRoomMembers = getMembersInRoom(room.id);
    
    // Check if room is full (unless dropping on the same room)
    if (draggedMember.room_number !== room.id && currentRoomMembers.length >= room.maxOccupancy) {
      alert(`${room.category} can only hold ${room.maxOccupancy} guest${room.maxOccupancy > 1 ? "s" : ""}`);
      setDraggedMember(null);
      return;
    }

    // Determine room category (check if interconnected)
    const interconnectedRoom = getInterconnectedRoom(room.id);
    let roomCategory = room.category;
    if (interconnectedRoom !== null) {
      roomCategory = "Interconnected";
    }

    // Update member's room assignment
    setMembers((prev) =>
      prev.map((m) =>
        m.id === draggedMember.id
          ? {
              ...m,
              room_number: room.id,
              room_category: roomCategory,
              age_label: m.age_label || (m.member_type === "adult" ? "Adult" : calculateAgeLabel(m.date_of_birth)),
              remarks: m.remarks || (m.member_type === "child" ? "Child" : null),
            }
          : m
      )
    );
    setHasChanges(true);
    setDraggedMember(null);
  };

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedMember) return;

    // Remove from room
    setMembers((prev) =>
      prev.map((m) =>
        m.id === draggedMember.id
          ? { ...m, room_number: null, room_category: null }
          : m
      )
    );
    setHasChanges(true);
    setDraggedMember(null);
  };

  const handleDragEnd = () => {
    setDraggedMember(null);
  };

  // Remove member from room
  const removeMemberFromRoom = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, room_number: null, room_category: null } : m
      )
    );
    setHasChanges(true);
  };

  // Clear all assignments
  const clearAssignments = () => {
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        room_number: null,
        room_category: null,
      }))
    );
    setInterconnections([]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update room categories for interconnected rooms
      const updatedMembers = members.map((m) => {
        if (m.room_number) {
          const interconnectedRoom = getInterconnectedRoom(m.room_number);
          return {
            ...m,
            room_category: interconnectedRoom !== null ? "Interconnected" : rooms.find((r) => r.id === m.room_number)?.category || m.room_category,
          };
        }
        return m;
      });

      const assignments = updatedMembers.map((m) => ({
        member_id: m.id,
        room_number: m.room_number,
        room_category: m.room_category,
        age_label: m.age_label || (m.member_type === "adult" ? "Adult" : null),
        remarks: m.remarks,
      }));

      const response = await fetch("/api/rooming-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignments,
          interconnections,
          group_inquiry_id: groupInquiryId,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      setMembers(updatedMembers);
      setHasChanges(false);
      alert("Rooming list saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save rooming list");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Save first if there are changes
      if (hasChanges) {
        await handleSave();
      }

      const response = await fetch(`/api/rooming-list/${groupInquiryId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RoomingList-${inquiryNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case "DBL":
        return "from-blue-500 to-blue-600";
      case "SGL":
        return "from-green-500 to-green-600";
      case "TPL":
        return "from-purple-500 to-purple-600";
      case "QTPL":
        return "from-orange-500 to-orange-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getRoomTypeBg = (type: string) => {
    switch (type) {
      case "DBL":
        return "bg-blue-50 border-blue-200 hover:border-blue-400";
      case "SGL":
        return "bg-green-50 border-green-200 hover:border-green-400";
      case "TPL":
        return "bg-purple-50 border-purple-200 hover:border-purple-400";
      case "QTPL":
        return "bg-orange-50 border-orange-200 hover:border-orange-400";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-surface-50 px-6 py-4 border-b border-surface-200 cursor-pointer hover:bg-surface-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-surface-900">Rooming List</h3>
              <p className="text-sm text-surface-500">
                {assignedCount} of {members.length} guests assigned
                {interconnections.length > 0 && (
                  <span className="text-pink-600 ml-2">• {interconnections.length} interconnection{interconnections.length !== 1 ? "s" : ""}</span>
                )}
                {hasChanges && <span className="text-amber-600 ml-2">• Unsaved changes</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloading || assignedCount === 0}
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-6 space-y-6">
          {/* Instructions & Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-surface-600">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Drag guests into rooms
              </div>
              {connectingRoom !== null && (
                <div className="flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm animate-pulse">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Click another room to interconnect with Room {connectingRoom}
                  <button
                    onClick={() => setConnectingRoom(null)}
                    className="ml-1 text-pink-800 hover:text-pink-900"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={clearAssignments}>
                Clear All
              </Button>
              {hasChanges && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>

          {/* Unassigned Guests Pool */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
            className={`p-4 rounded-xl border-2 border-dashed transition-all ${
              draggedMember && draggedMember.room_number
                ? "border-amber-400 bg-amber-50"
                : "border-surface-300 bg-surface-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h4 className="font-medium text-surface-700">
                Unassigned Guests ({unassignedMembers.length})
              </h4>
            </div>
            
            {unassignedMembers.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-4">
                All guests have been assigned to rooms! 🎉
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassignedMembers.map((member) => (
                  <div
                    key={member.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, member)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                      member.member_type === "adult"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    } ${draggedMember?.id === member.id ? "opacity-50 scale-95" : ""}`}
                  >
                    <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                    <span className="font-medium text-sm">{member.full_name}</span>
                    <Badge variant={member.member_type === "adult" ? "blue" : "yellow"} className="text-xs">
                      {member.member_type === "adult" ? "A" : "C"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Room Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const roomMembers = getMembersInRoom(room.id);
              const isFull = roomMembers.length >= room.maxOccupancy;
              const isDropTarget = draggedMember && !isFull && draggedMember.room_number !== room.id;
              const interconnectedWith = getInterconnectedRoom(room.id);
              const isConnecting = connectingRoom === room.id;
              const isConnectTarget = connectingRoom !== null && connectingRoom !== room.id;

              return (
                <div
                  key={room.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnRoom(e, room)}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${getRoomTypeBg(room.type)} ${
                    isDropTarget ? "ring-2 ring-primary-400 ring-offset-2 scale-[1.02]" : ""
                  } ${isFull && draggedMember ? "opacity-50" : ""} ${
                    interconnectedWith !== null ? "ring-2 ring-pink-400" : ""
                  } ${isConnecting ? "ring-4 ring-pink-500 animate-pulse" : ""} ${
                    isConnectTarget ? "hover:ring-2 hover:ring-pink-300" : ""
                  }`}
                >
                  {/* Room Header */}
                  <div className={`bg-gradient-to-r ${getRoomTypeColor(room.type)} px-4 py-2 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Room {room.id}</span>
                        <span className="text-xs opacity-80">({room.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          {roomMembers.length}/{room.maxOccupancy}
                        </span>
                        {/* Interconnect Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterconnectClick(room.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            interconnectedWith !== null
                              ? "bg-pink-500 text-white"
                              : isConnecting
                              ? "bg-white text-pink-600"
                              : "bg-white/20 hover:bg-white/30 text-white"
                          }`}
                          title={
                            interconnectedWith !== null
                              ? `Interconnected with Room ${interconnectedWith}`
                              : "Click to interconnect with another room"
                          }
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Interconnection Badge */}
                    {interconnectedWith !== null && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs bg-pink-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Room {interconnectedWith}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeInterconnection(room.id);
                          }}
                          className="text-xs text-white/70 hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Room Content */}
                  <div className="p-3 min-h-[100px]">
                    {roomMembers.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-surface-400 text-sm py-6">
                        <div className="text-center">
                          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                          Drop guests here
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {roomMembers.map((member) => (
                          <div
                            key={member.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, member)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                              member.member_type === "adult"
                                ? "bg-white border border-blue-200"
                                : "bg-white border border-amber-200"
                            } ${draggedMember?.id === member.id ? "opacity-50 scale-95" : "hover:shadow-sm"}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <svg className="w-3 h-3 text-surface-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                              <span className="text-sm font-medium text-surface-800 truncate">
                                {member.full_name}
                              </span>
                              {member.member_type === "child" && (
                                <span className="text-xs text-amber-600 flex-shrink-0">
                                  {member.age_label || "Child"}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMemberFromRoom(member.id);
                              }}
                              className="p-1 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-surface-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <span className="text-xs text-surface-600">DBL (max 4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-600"></div>
              <span className="text-xs text-surface-600">SGL (max 2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600"></div>
              <span className="text-xs text-surface-600">TPL (max 6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-orange-500 to-orange-600"></div>
              <span className="text-xs text-surface-600">QTPL (max 8)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded ring-2 ring-pink-400 bg-white"></div>
              <span className="text-xs text-surface-600">Interconnected</span>
            </div>
          </div>

          {/* Interconnections Summary */}
          {interconnections.length > 0 && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-pink-800">
                    Interconnected Rooms
                  </h4>
                  <p className="text-xs text-pink-600 mt-0.5">
                    {interconnections.map((pair) => `Room ${pair[0]} ↔ Room ${pair[1]}`).join(" • ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {assignedCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">
                    {assignedCount} of {members.length} guests assigned
                  </h4>
                  <p className="text-xs text-green-600 mt-0.5">
                    {rooms.filter((r) => getMembersInRoom(r.id).length > 0).length} of {rooms.length} rooms occupied
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function calculateAgeLabel(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "Child";
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? `Age ${String(age).padStart(2, "0")}` : "Baby";
}
