"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { inventoryApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Package, Calendar, Wrench, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data: components } = useQuery({ queryKey: ["components"], queryFn: inventoryApi.components });
  const { data: lowStock } = useQuery({ queryKey: ["low-stock"], queryFn: inventoryApi.lowStock });
  const { data: equipment } = useQuery({ queryKey: ["equipment"], queryFn: inventoryApi.equipment });
  const { data: labBookings } = useQuery({ queryKey: ["lab-bookings"], queryFn: inventoryApi.labBookings });

  const [bookingForm, setBookingForm] = useState({
    lab_name: "",
    start_time: "",
    end_time: "",
    purpose: "",
    equipment: [] as number[],
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const bookLabMutation = useMutation({
    mutationFn: inventoryApi.createLabBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-bookings"] });
      setBookingForm({ lab_name: "", start_time: "", end_time: "", purpose: "", equipment: [] });
      setSuccessMsg("Lab booking request submitted successfully.");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to submit lab booking");
      setSuccessMsg("");
    },
  });

  const handleEquipmentToggle = (id: number) => {
    setBookingForm((prev) => {
      const current = prev.equipment;
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, equipment: updated };
    });
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.lab_name || !bookingForm.start_time || !bookingForm.end_time) {
      setErrorMsg("Please fill in Lab Name, Start Time, and End Time.");
      return;
    }
    bookLabMutation.mutate(bookingForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case "cancelled":
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-danger/15 text-danger">
            <XCircle className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  return (
    <>
      <TopBar title="Robotics Inventory" />
      <div className="p-6 space-y-6 max-w-6xl">
        {lowStock && lowStock.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm">{lowStock.length} component(s) are low on stock.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Components list */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Components
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(components ?? []).map((c) => (
                  <Card key={c.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted mt-0.5">{c.sku} · {c.category}</p>
                      </div>
                      <span className={`text-sm font-bold ${c.quantity <= c.min_stock ? "text-warning" : "text-success"}`}>
                        {c.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2">{c.location}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Equipment list */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Equipment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(equipment ?? []).map((e) => (
                  <Card key={e.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-muted mt-0.5">SN: {e.serial_number}</p>
                    </div>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {e.status.replace("_", " ")}
                    </span>
                  </Card>
                ))}
              </div>
            </div>

            {/* Lab Bookings list */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Lab Bookings
              </h3>
              <div className="space-y-3">
                {!labBookings || labBookings.length === 0 ? (
                  <Card>
                    <p className="text-muted text-sm text-center py-4">No lab bookings found.</p>
                  </Card>
                ) : (
                  labBookings.map((b) => (
                    <Card key={b.id} className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{b.lab_name}</p>
                          {getStatusBadge(b.status)}
                        </div>
                        <p className="text-xs text-muted mt-1">
                          Booked by: <span className="text-foreground">{b.booked_by_detail ? `${b.booked_by_detail.first_name} ${b.booked_by_detail.last_name}` : "Member"}</span>
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {formatDate(b.start_time)} to {formatDate(b.end_time)}
                        </p>
                        {b.purpose && (
                          <p className="text-sm text-foreground mt-2 bg-muted/20 px-3 py-1.5 rounded-lg border border-card-border/40 inline-block">
                            {b.purpose}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Book Lab Form */}
          <div>
            <Card className="sticky top-20">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Book a Lab
              </h3>
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="lab_name">Lab Name</Label>
                  <Input
                    id="lab_name"
                    placeholder="e.g. Main Robotics Lab"
                    value={bookingForm.lab_name}
                    onChange={(e) => setBookingForm({ ...bookingForm, lab_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={bookingForm.start_time}
                    onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={bookingForm.end_time}
                    onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    placeholder="Describe the purpose of the booking"
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Required Equipment (Optional)</Label>
                  <div className="max-h-40 overflow-y-auto border border-card-border rounded-lg p-2 space-y-2">
                    {(!equipment || equipment.length === 0) ? (
                      <p className="text-xs text-muted">No equipment available.</p>
                    ) : (
                      equipment.map((e) => (
                        <label key={e.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground hover:text-primary transition-colors">
                          <input
                            type="checkbox"
                            className="rounded border-card-border text-primary focus:ring-primary"
                            checked={bookingForm.equipment.includes(e.id)}
                            onChange={() => handleEquipmentToggle(e.id)}
                          />
                          <span>{e.name} (SN: {e.serial_number})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}
                {successMsg && <p className="text-xs text-success">{successMsg}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={bookLabMutation.isPending}
                >
                  {bookLabMutation.isPending ? "Submitting..." : "Book Lab"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
